import {
  Customer,
  Supplier,
  DailySale,
  CustomerPayment,
  DailyPurchase,
  DailyExpense,
  LedgerTransaction,
  DailyReconciliation,
  MonthlyBillSummary,
} from "@/types/database";
import {
  initialCustomers,
  initialSuppliers,
  initialDailySales,
  initialCustomerPayments,
  initialDailyPurchases,
  initialDailyExpenses,
} from "./mockData";
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

const STORAGE_KEYS = {
  CUSTOMERS: "milk_dairy_customers",
  SUPPLIERS: "milk_dairy_suppliers",
  DAILY_SALES: "milk_dairy_daily_sales",
  PAYMENTS: "milk_dairy_payments",
  PURCHASES: "milk_dairy_purchases",
  EXPENSES: "milk_dairy_expenses",
};

// Dispatch global store update event for immediate real-time sync across all pages
export function notifyStoreUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("milk-store-updated"));
  }
}

// Helper for local storage persistence
function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    notifyStoreUpdated();
  } catch (err) {
    console.error("Local storage save error", err);
  }
}

// Sanitizes local storage so orphaned records from deleted customers/suppliers are purged permanently
function sanitizeLocalStore() {
  if (typeof window === "undefined") return;
  try {
    // 1. Sanitize customer-related records
    const rawCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const customers: Customer[] = rawCustomers ? JSON.parse(rawCustomers) : initialCustomers;
    const custIds = new Set(customers.map((c) => c.id));

    const rawSales = localStorage.getItem(STORAGE_KEYS.DAILY_SALES);
    const sales: DailySale[] = rawSales ? JSON.parse(rawSales) : initialDailySales;
    const cleanSales = sales.filter((s) => custIds.has(s.customer_id));
    if (rawSales && cleanSales.length !== sales.length) {
      localStorage.setItem(STORAGE_KEYS.DAILY_SALES, JSON.stringify(cleanSales));
    }

    const rawPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    const payments: CustomerPayment[] = rawPayments ? JSON.parse(rawPayments) : initialCustomerPayments;
    const cleanPayments = payments.filter((p) => custIds.has(p.customer_id));
    if (rawPayments && cleanPayments.length !== payments.length) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(cleanPayments));
    }

    // 2. Sanitize supplier-related records
    const rawSuppliers = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    const suppliers: Supplier[] = rawSuppliers ? JSON.parse(rawSuppliers) : initialSuppliers;
    const supIds = new Set(suppliers.map((s) => s.id));

    const rawPurchases = localStorage.getItem(STORAGE_KEYS.PURCHASES);
    const purchases: DailyPurchase[] = rawPurchases ? JSON.parse(rawPurchases) : initialDailyPurchases;
    const cleanPurchases = purchases.filter((p) => supIds.has(p.supplier_id));
    if (rawPurchases && cleanPurchases.length !== purchases.length) {
      localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(cleanPurchases));
    }
  } catch (err) {
    console.error("Local store sanitization error", err);
  }
}

export const DataStore = {
  // -------------------------------------------------------------
  // CUSTOMERS
  // -------------------------------------------------------------
  async getCustomers(): Promise<Customer[]> {
    sanitizeLocalStore();
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("name", { ascending: true });
        if (!error && data) return data as Customer[];
      } catch (e) {
        console.warn("Supabase query failed, falling back to local store", e);
      }
    }
    return getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    const customers = await this.getCustomers();
    return customers.find((c) => c.id === id) || null;
  },

  async saveCustomer(
    customer: Omit<Customer, "id" | "created_at"> & { id?: string }
  ): Promise<Customer> {
    if (isSupabaseConfigured) {
      try {
        if (customer.id) {
          const { data, error } = await supabase
            .from("customers")
            .update(customer)
            .eq("id", customer.id)
            .select()
            .single();
          if (!error && data) {
            notifyStoreUpdated();
            return data as Customer;
          }
        } else {
          const { data, error } = await supabase
            .from("customers")
            .insert([customer])
            .select()
            .single();
          if (!error && data) {
            notifyStoreUpdated();
            return data as Customer;
          }
        }
      } catch (e) {
        console.warn("Supabase customer save failed, using local store", e);
      }
    }

    const customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    let updatedCustomer: Customer;
    if (customer.id) {
      updatedCustomer = {
        ...customer,
        id: customer.id,
        created_at: new Date().toISOString(),
      } as Customer;
      const index = customers.findIndex((c) => c.id === customer.id);
      if (index >= 0) {
        customers[index] = { ...customers[index], ...customer };
      } else {
        customers.push(updatedCustomer);
      }
    } else {
      updatedCustomer = {
        ...customer,
        id: `c-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      customers.push(updatedCustomer);
    }
    setLocal(STORAGE_KEYS.CUSTOMERS, customers);
    return updatedCustomer;
  },

  async deleteCustomer(id: string): Promise<boolean> {
    // 1. Supabase cascade deletion: explicitly delete associated child records then customer
    if (isSupabaseConfigured) {
      try {
        await supabase.from("daily_sales").delete().eq("customer_id", id);
        await supabase.from("customer_payments").delete().eq("customer_id", id);
        const { error } = await supabase.from("customers").delete().eq("id", id);
        if (error) console.warn("Supabase customer delete warning:", error);
      } catch (e) {
        console.warn("Supabase customer delete failed, using local store", e);
      }
    }

    // 2. Local storage cascade deletion: purge customer, daily deliveries, and customer payments
    const customers = getLocal<Customer[]>(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    setLocal(
      STORAGE_KEYS.CUSTOMERS,
      customers.filter((c) => c.id !== id)
    );

    const sales = getLocal<DailySale[]>(STORAGE_KEYS.DAILY_SALES, initialDailySales);
    setLocal(
      STORAGE_KEYS.DAILY_SALES,
      sales.filter((s) => s.customer_id !== id)
    );

    const payments = getLocal<CustomerPayment[]>(
      STORAGE_KEYS.PAYMENTS,
      initialCustomerPayments
    );
    setLocal(
      STORAGE_KEYS.PAYMENTS,
      payments.filter((p) => p.customer_id !== id)
    );

    notifyStoreUpdated();
    return true;
  },

  // -------------------------------------------------------------
  // DAILY MILK DELIVERIES (SALES)
  // -------------------------------------------------------------
  async getDailySalesByDate(dateStr: string, activeOnly: boolean = false): Promise<DailySale[]> {
    sanitizeLocalStore();
    const customers = await this.getCustomers();
    const validCustomers = activeOnly ? customers.filter((c) => c.is_active) : customers;
    const customerMap = new Map(validCustomers.map((c) => [c.id, c]));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("daily_sales")
          .select("*, customer:customers(*)")
          .eq("entry_date", dateStr);
        if (!error && data) {
          // Strictly exclude orphaned or deleted customer entries
          return (data as DailySale[])
            .filter((s) => customerMap.has(s.customer_id))
            .map((s) => ({
              ...s,
              customer: customerMap.get(s.customer_id) || s.customer,
            }));
        }
      } catch (e) {
        console.warn("Supabase sales query failed, using local store", e);
      }
    }

    const allSales = getLocal<DailySale[]>(STORAGE_KEYS.DAILY_SALES, initialDailySales);
    return allSales
      .filter((s) => s.entry_date === dateStr && customerMap.has(s.customer_id))
      .map((s) => ({
        ...s,
        customer: customerMap.get(s.customer_id),
      }));
  },

  async getAllDailySales(activeOnly: boolean = false): Promise<DailySale[]> {
    sanitizeLocalStore();
    const customers = await this.getCustomers();
    const validCustomers = activeOnly ? customers.filter((c) => c.is_active) : customers;
    const customerMap = new Map(validCustomers.map((c) => [c.id, c]));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("daily_sales")
          .select("*, customer:customers(*)")
          .order("entry_date", { ascending: false });
        if (!error && data) {
          return (data as DailySale[])
            .filter((s) => customerMap.has(s.customer_id))
            .map((s) => ({
              ...s,
              customer: customerMap.get(s.customer_id) || s.customer,
            }));
        }
      } catch (e) {
        console.warn("Supabase sales query failed, using local store", e);
      }
    }

    const allSales = getLocal<DailySale[]>(STORAGE_KEYS.DAILY_SALES, initialDailySales);
    return allSales
      .filter((s) => customerMap.has(s.customer_id))
      .map((s) => ({
        ...s,
        customer: customerMap.get(s.customer_id),
      }));
  },

  async saveBatchDailySales(
    entries: Array<{
      customer_id: string;
      entry_date: string;
      qty_kg: number;
      is_nagha: boolean;
      custom_rate?: number | null;
      total_amount: number;
    }>
  ): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("daily_sales")
          .upsert(entries, { onConflict: "customer_id,entry_date" });
        if (!error) {
          notifyStoreUpdated();
          return true;
        }
      } catch (e) {
        console.warn("Supabase batch sales save failed, using local store", e);
      }
    }

    const allSales = getLocal<DailySale[]>(STORAGE_KEYS.DAILY_SALES, initialDailySales);
    for (const entry of entries) {
      const existingIndex = allSales.findIndex(
        (s) => s.customer_id === entry.customer_id && s.entry_date === entry.entry_date
      );
      if (existingIndex >= 0) {
        allSales[existingIndex] = {
          ...allSales[existingIndex],
          ...entry,
        };
      } else {
        allSales.push({
          id: `ds-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...entry,
          created_at: new Date().toISOString(),
        });
      }
    }
    setLocal(STORAGE_KEYS.DAILY_SALES, allSales);
    return true;
  },

  // -------------------------------------------------------------
  // CUSTOMER PAYMENTS
  // -------------------------------------------------------------
  async getCustomerPayments(customerId?: string): Promise<CustomerPayment[]> {
    sanitizeLocalStore();
    const customers = await this.getCustomers();
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from("customer_payments")
          .select("*, customer:customers(*)")
          .order("payment_date", { ascending: false });
        if (customerId) query = query.eq("customer_id", customerId);
        const { data, error } = await query;
        if (!error && data) {
          return (data as CustomerPayment[])
            .filter((p) => customerMap.has(p.customer_id))
            .map((p) => ({
              ...p,
              customer: customerMap.get(p.customer_id) || p.customer,
            }));
        }
      } catch (e) {
        console.warn("Supabase payments query failed, using local store", e);
      }
    }

    const payments = getLocal<CustomerPayment[]>(
      STORAGE_KEYS.PAYMENTS,
      initialCustomerPayments
    );
    const filtered = customerId
      ? payments.filter((p) => p.customer_id === customerId)
      : payments;
    return filtered
      .filter((p) => customerMap.has(p.customer_id))
      .map((p) => ({
        ...p,
        customer: customerMap.get(p.customer_id),
      }));
  },

  async saveCustomerPayment(
    payment: Omit<CustomerPayment, "id" | "created_at">
  ): Promise<CustomerPayment> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("customer_payments")
          .insert([payment])
          .select("*, customer:customers(*)")
          .single();
        if (!error && data) {
          notifyStoreUpdated();
          return data as CustomerPayment;
        }
      } catch (e) {
        console.warn("Supabase payment insert failed, using local store", e);
      }
    }

    const payments = getLocal<CustomerPayment[]>(
      STORAGE_KEYS.PAYMENTS,
      initialCustomerPayments
    );
    const newPayment: CustomerPayment = {
      ...payment,
      id: `p-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    payments.unshift(newPayment);
    setLocal(STORAGE_KEYS.PAYMENTS, payments);
    return newPayment;
  },

  // -------------------------------------------------------------
  // SUPPLIERS & PURCHASES
  // -------------------------------------------------------------
  async getSuppliers(): Promise<Supplier[]> {
    sanitizeLocalStore();
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("suppliers")
          .select("*")
          .order("supplier_name", { ascending: true });
        if (!error && data) return data as Supplier[];
      } catch (e) {
        console.warn("Supabase suppliers query failed, using local store", e);
      }
    }
    return getLocal<Supplier[]>(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
  },

  async saveSupplier(
    supplier: Omit<Supplier, "id" | "created_at"> & { id?: string }
  ): Promise<Supplier> {
    if (isSupabaseConfigured) {
      try {
        if (supplier.id) {
          const { data, error } = await supabase
            .from("suppliers")
            .update(supplier)
            .eq("id", supplier.id)
            .select()
            .single();
          if (!error && data) {
            notifyStoreUpdated();
            return data as Supplier;
          }
        } else {
          const { data, error } = await supabase
            .from("suppliers")
            .insert([supplier])
            .select()
            .single();
          if (!error && data) {
            notifyStoreUpdated();
            return data as Supplier;
          }
        }
      } catch (e) {
        console.warn("Supabase supplier save failed, using local store", e);
      }
    }

    const suppliers = getLocal<Supplier[]>(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
    let updated: Supplier;
    if (supplier.id) {
      const idx = suppliers.findIndex((s) => s.id === supplier.id);
      updated = { ...supplier, id: supplier.id, created_at: new Date().toISOString() };
      if (idx >= 0) suppliers[idx] = updated;
      else suppliers.push(updated);
    } else {
      updated = {
        ...supplier,
        id: `s-${Date.now()}`,
        created_at: new Date().toISOString(),
      };
      suppliers.push(updated);
    }
    setLocal(STORAGE_KEYS.SUPPLIERS, suppliers);
    return updated;
  },

  async deleteSupplier(id: string): Promise<boolean> {
    // 1. Supabase cascade deletion: explicitly delete associated daily_purchases then supplier
    if (isSupabaseConfigured) {
      try {
        await supabase.from("daily_purchases").delete().eq("supplier_id", id);
        const { error } = await supabase.from("suppliers").delete().eq("id", id);
        if (error) console.warn("Supabase supplier delete warning:", error);
      } catch (e) {
        console.warn("Supabase supplier delete failed, using local store", e);
      }
    }

    // 2. Local storage cascade deletion: purge supplier and their daily purchase entries
    const suppliers = getLocal<Supplier[]>(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
    setLocal(
      STORAGE_KEYS.SUPPLIERS,
      suppliers.filter((s) => s.id !== id)
    );

    const purchases = getLocal<DailyPurchase[]>(
      STORAGE_KEYS.PURCHASES,
      initialDailyPurchases
    );
    setLocal(
      STORAGE_KEYS.PURCHASES,
      purchases.filter((p) => p.supplier_id !== id)
    );

    notifyStoreUpdated();
    return true;
  },

  async getDailyPurchases(): Promise<DailyPurchase[]> {
    sanitizeLocalStore();
    const suppliers = await this.getSuppliers();
    const supMap = new Map(suppliers.map((s) => [s.id, s]));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("daily_purchases")
          .select("*, supplier:suppliers(*)")
          .order("purchase_date", { ascending: false });
        if (!error && data) {
          // Strictly exclude orphaned purchases where supplier was deleted
          return (data as DailyPurchase[])
            .filter((p) => supMap.has(p.supplier_id))
            .map((p) => ({
              ...p,
              supplier: supMap.get(p.supplier_id) || p.supplier,
            }));
        }
      } catch (e) {
        console.warn("Supabase purchases query failed, using local store", e);
      }
    }

    const purchases = getLocal<DailyPurchase[]>(
      STORAGE_KEYS.PURCHASES,
      initialDailyPurchases
    );
    return purchases
      .filter((p) => supMap.has(p.supplier_id))
      .map((p) => ({
        ...p,
        supplier: supMap.get(p.supplier_id),
      }));
  },

  async saveDailyPurchase(
    purchase: Omit<DailyPurchase, "id" | "created_at" | "total_cost">
  ): Promise<DailyPurchase> {
    const total_cost = purchase.qty_kg * purchase.rate_per_kg;
    const payload = { ...purchase, total_cost };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("daily_purchases")
          .insert([payload])
          .select("*, supplier:suppliers(*)")
          .single();
        if (!error && data) {
          notifyStoreUpdated();
          return data as DailyPurchase;
        }
      } catch (e) {
        console.warn("Supabase purchase insert failed, using local store", e);
      }
    }

    const purchases = getLocal<DailyPurchase[]>(
      STORAGE_KEYS.PURCHASES,
      initialDailyPurchases
    );
    const newPurchase: DailyPurchase = {
      ...payload,
      id: `dp-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    purchases.unshift(newPurchase);
    setLocal(STORAGE_KEYS.PURCHASES, purchases);
    return newPurchase;
  },

  // -------------------------------------------------------------
  // DAILY EXPENSES
  // -------------------------------------------------------------
  async getDailyExpenses(): Promise<DailyExpense[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("daily_expenses")
          .select("*")
          .order("expense_date", { ascending: false });
        if (!error && data) return data as DailyExpense[];
      } catch (e) {
        console.warn("Supabase expenses query failed, using local store", e);
      }
    }
    return getLocal<DailyExpense[]>(STORAGE_KEYS.EXPENSES, initialDailyExpenses);
  },

  async saveDailyExpense(
    expense: Omit<DailyExpense, "id" | "created_at">
  ): Promise<DailyExpense> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("daily_expenses")
          .insert([expense])
          .select()
          .single();
        if (!error && data) {
          notifyStoreUpdated();
          return data as DailyExpense;
        }
      } catch (e) {
        console.warn("Supabase expense insert failed, using local store", e);
      }
    }

    const expenses = getLocal<DailyExpense[]>(
      STORAGE_KEYS.EXPENSES,
      initialDailyExpenses
    );
    const newExpense: DailyExpense = {
      ...expense,
      id: `e-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    setLocal(STORAGE_KEYS.EXPENSES, expenses);
    return newExpense;
  },

  async deleteDailyExpense(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("daily_expenses").delete().eq("id", id);
        if (!error) {
          notifyStoreUpdated();
          return true;
        }
      } catch (e) {
        console.warn("Supabase expense delete failed, using local store", e);
      }
    }
    const expenses = getLocal<DailyExpense[]>(
      STORAGE_KEYS.EXPENSES,
      initialDailyExpenses
    );
    setLocal(
      STORAGE_KEYS.EXPENSES,
      expenses.filter((e) => e.id !== id)
    );
    return true;
  },

  // -------------------------------------------------------------
  // CUSTOMER LEDGER GENERATOR
  // -------------------------------------------------------------
  async getCustomerLedger(customerId: string): Promise<{
    customer: Customer | null;
    transactions: LedgerTransaction[];
    currentBalance: number;
    totalDeliveriesCost: number;
    totalPaid: number;
  }> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) {
      return {
        customer: null,
        transactions: [],
        currentBalance: 0,
        totalDeliveriesCost: 0,
        totalPaid: 0,
      };
    }

    const sales = (await this.getAllDailySales()).filter(
      (s) => s.customer_id === customerId
    );
    const payments = await this.getCustomerPayments(customerId);

    // Merge transactions chronologically
    type RawItem =
      | { type: 'DELIVERY'; date: string; data: DailySale }
      | { type: 'PAYMENT'; date: string; data: CustomerPayment };

    const items: RawItem[] = [
      ...sales.map((s) => ({ type: 'DELIVERY' as const, date: s.entry_date, data: s })),
      ...payments.map((p) => ({ type: 'PAYMENT' as const, date: p.payment_date, data: p })),
    ];

    items.sort((a, b) => a.date.localeCompare(b.date));

    let running = customer.previous_balance || 0;
    let totalDeliveriesCost = 0;
    let totalPaid = 0;

    const transactions: LedgerTransaction[] = [];

    // Opening balance transaction if > 0
    if (customer.previous_balance > 0) {
      transactions.push({
        id: `open-${customer.id}`,
        date: customer.created_at.split('T')[0] || "2026-01-01",
        type: 'OPENING_BALANCE',
        description: 'Opening / Previous Balance',
        debit: customer.previous_balance,
        credit: 0,
        running_balance: running,
      });
    }

    for (const item of items) {
      if (item.type === 'DELIVERY') {
        const sale = item.data;
        if (sale.is_nagha) {
          transactions.push({
            id: sale.id,
            date: sale.entry_date,
            type: 'DELIVERY',
            description: 'Delivery: Nagha (Customer Absent)',
            qty_kg: 0,
            rate: sale.custom_rate || customer.fixed_rate_per_kg,
            debit: 0,
            credit: 0,
            running_balance: running,
          });
        } else {
          const debit = sale.total_amount;
          running += debit;
          totalDeliveriesCost += debit;
          transactions.push({
            id: sale.id,
            date: sale.entry_date,
            type: 'DELIVERY',
            description: `Milk Delivery: ${sale.qty_kg} KG @ Rs. ${
              sale.custom_rate || customer.fixed_rate_per_kg
            }/KG`,
            qty_kg: sale.qty_kg,
            rate: sale.custom_rate || customer.fixed_rate_per_kg,
            debit: debit,
            credit: 0,
            running_balance: running,
          });
        }
      } else {
        const payment = item.data;
        const credit = payment.amount_paid;
        running -= credit;
        totalPaid += credit;
        transactions.push({
          id: payment.id,
          date: payment.payment_date,
          type: 'PAYMENT',
          description: `Payment Received (${payment.payment_mode})${
            payment.notes ? ` - ${payment.notes}` : ''
          }`,
          debit: 0,
          credit: credit,
          running_balance: running,
        });
      }
    }

    return {
      customer,
      transactions: transactions.reverse(), // Most recent first for display
      currentBalance: running,
      totalDeliveriesCost,
      totalPaid,
    };
  },

  // -------------------------------------------------------------
  // RECONCILIATION ENGINE
  // -------------------------------------------------------------
  async getDailyReconciliation(dateStr: string): Promise<DailyReconciliation> {
    const purchases = (await this.getDailyPurchases()).filter(
      (p) => p.purchase_date === dateStr
    );
    // Only count deliveries to valid existing active customers
    const sales = await this.getDailySalesByDate(dateStr, true);

    const totalPurchasedKg = purchases.reduce((sum, p) => sum + Number(p.qty_kg), 0);
    const totalPurchaseCost = purchases.reduce((sum, p) => sum + Number(p.total_cost), 0);

    const totalDeliveredKg = sales.reduce(
      (sum, s) => sum + (s.is_nagha ? 0 : Number(s.qty_kg)),
      0
    );
    const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);

    const wastageKg = totalPurchasedKg - totalDeliveredKg;
    const wastagePercentage =
      totalPurchasedKg > 0 ? (wastageKg / totalPurchasedKg) * 100 : 0;

    let status: DailyReconciliation['status'] = 'BALANCED';
    if (wastageKg < 0) {
      status = 'SURPLUS';
    } else if (wastagePercentage > 3.0) {
      status = 'HIGH_LOSS';
    } else if (wastageKg > 0) {
      status = 'NORMAL';
    }

    return {
      date: dateStr,
      totalPurchasedKg,
      totalDeliveredKg,
      wastageKg,
      wastagePercentage,
      totalPurchaseCost,
      totalSalesRevenue,
      status,
    };
  },

  // -------------------------------------------------------------
  // MONTHLY BILL GENERATOR
  // -------------------------------------------------------------
  async getMonthlyBill(
    customerId: string,
    monthStr: string // YYYY-MM
  ): Promise<MonthlyBillSummary | null> {
    const customer = await this.getCustomerById(customerId);
    if (!customer) return null;

    const [year, month] = monthStr.split('-').map(Number);
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(monthStart);

    const allSales = (await this.getAllDailySales()).filter(
      (s) => s.customer_id === customerId
    );
    const allPayments = await this.getCustomerPayments(customerId);

    // Filter for the requested month
    const monthlyDeliveries = allSales
      .filter((s) => {
        const d = parseISO(s.entry_date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

    const monthlyPayments = allPayments
      .filter((p) => {
        const d = parseISO(p.payment_date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      })
      .sort((a, b) => a.payment_date.localeCompare(b.payment_date));

    // Calculate previous balance: customer.previous_balance + previous month deliveries - previous month payments
    const priorDeliveriesTotal = allSales
      .filter((s) => parseISO(s.entry_date) < monthStart)
      .reduce((sum, s) => sum + Number(s.total_amount), 0);

    const priorPaymentsTotal = allPayments
      .filter((p) => parseISO(p.payment_date) < monthStart)
      .reduce((sum, p) => sum + Number(p.amount_paid), 0);

    const effectivePreviousBalance =
      (customer.previous_balance || 0) + priorDeliveriesTotal - priorPaymentsTotal;

    const totalQtyKg = monthlyDeliveries.reduce(
      (sum, s) => sum + (s.is_nagha ? 0 : Number(s.qty_kg)),
      0
    );
    const totalMilkCost = monthlyDeliveries.reduce(
      (sum, s) => sum + Number(s.total_amount),
      0
    );
    const totalPayments = monthlyPayments.reduce(
      (sum, p) => sum + Number(p.amount_paid),
      0
    );

    const currentMonthBalance = totalMilkCost - totalPayments;
    const netPayableAmount = effectivePreviousBalance + currentMonthBalance;

    return {
      customer,
      month: monthStr,
      monthName: format(monthStart, "MMMM yyyy"),
      previousBalance: effectivePreviousBalance,
      deliveries: monthlyDeliveries,
      totalQtyKg,
      totalMilkCost,
      payments: monthlyPayments,
      totalPayments,
      currentMonthBalance,
      netPayableAmount,
    };
  },
};
