export type PaymentMode = 'Cash' | 'Bank Transfer' | 'EasyPaisa/JazzCash';

export type ExpenseCategory =
  | 'Petrol/Fuel'
  | 'Vehicle Maintenance'
  | 'Staff Salary'
  | 'Feed/Containers'
  | 'Miscellaneous';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  fixed_rate_per_kg: number;
  previous_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface DailySale {
  id: string;
  customer_id: string;
  entry_date: string; // YYYY-MM-DD
  qty_kg: number;
  is_nagha: boolean;
  custom_rate?: number | null;
  total_amount: number;
  created_at: string;
  // joined fields
  customer?: Customer;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  payment_date: string; // YYYY-MM-DD
  amount_paid: number;
  payment_mode: PaymentMode;
  notes?: string | null;
  created_at: string;
  // joined fields
  customer?: Customer;
}

export interface Supplier {
  id: string;
  supplier_name: string;
  phone?: string | null;
  purchase_rate_per_kg: number;
  created_at: string;
}

export interface DailyPurchase {
  id: string;
  supplier_id: string;
  purchase_date: string; // YYYY-MM-DD
  qty_kg: number;
  rate_per_kg: number;
  total_cost: number;
  created_at: string;
  // joined fields
  supplier?: Supplier;
}

export interface DailyExpense {
  id: string;
  expense_date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  amount: number;
  description?: string | null;
  created_at: string;
}

// Ledger entry for customer detail page
export interface LedgerTransaction {
  id: string;
  date: string;
  type: 'DELIVERY' | 'PAYMENT' | 'OPENING_BALANCE';
  description: string;
  qty_kg?: number;
  rate?: number;
  debit: number; // charge to customer
  credit: number; // payment from customer
  running_balance: number;
}

// Reconciliation summary
export interface DailyReconciliation {
  date: string;
  totalPurchasedKg: number;
  totalDeliveredKg: number;
  wastageKg: number;
  wastagePercentage: number;
  totalPurchaseCost: number;
  totalSalesRevenue: number;
  status: 'BALANCED' | 'NORMAL' | 'HIGH_LOSS' | 'SURPLUS';
}

// Monthly bill summary for a customer
export interface MonthlyBillSummary {
  customer: Customer;
  month: string; // YYYY-MM
  monthName: string;
  previousBalance: number;
  deliveries: DailySale[];
  totalQtyKg: number;
  totalMilkCost: number;
  payments: CustomerPayment[];
  totalPayments: number;
  currentMonthBalance: number;
  netPayableAmount: number;
}
