import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DataStore, formatSupabaseError, notifyStoreUpdated } from "@/lib/store";
import { withoutAnimalRecords } from "@/lib/farmMetrics";
import {
  Animal,
  AnimalRecord,
  FeedInventoryItem,
  FeedTransaction,
  MedicineInventoryItem,
  MilkProduction,
  SupplierPayment,
  VeterinaryLog,
  Worker,
  WorkerPayroll,
} from "@/types/database";

type FarmTable =
  | "animals"
  | "animal_records"
  | "feed_inventory"
  | "feed_transactions"
  | "medicine_inventory"
  | "veterinary_logs"
  | "milk_production"
  | "workers"
  | "worker_payrolls"
  | "supplier_payments";

const KEYS = {
  animals: "milk_farm_animals",
  animal_records: "milk_farm_animal_records",
  feed_inventory: "milk_farm_feed_inventory",
  feed_transactions: "milk_farm_feed_transactions",
  medicine_inventory: "milk_farm_medicine_inventory",
  veterinary_logs: "milk_farm_veterinary_logs",
  milk_production: "milk_farm_milk_production",
  workers: "milk_farm_workers",
  worker_payrolls: "milk_farm_worker_payrolls",
  supplier_payments: "milk_farm_supplier_payments",
} satisfies Record<FarmTable, string>;

function localRead<T>(table: FarmTable): T[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(KEYS[table]);
    return saved ? (JSON.parse(saved) as T[]) : [];
  } catch (error) {
    console.error(`Could not read local ${table} data`, error);
    throw new Error(`Could not read saved ${table} data.`);
  }
}

function localWrite<T>(table: FarmTable, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS[table], JSON.stringify(data));
    notifyStoreUpdated();
  } catch (error) {
    console.error(`Could not save local ${table} data`, error);
    throw new Error(`Could not save ${table} data.`);
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `farm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function getRows<T>(table: FarmTable, orderBy: string): Promise<T[]> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(orderBy, { ascending: false });
    if (error) {
      console.error(`Supabase error loading ${table}`, error);
      throw new Error(formatSupabaseError(error));
    }
    return (data || []) as T[];
  }
  return localRead<T>(table);
}

async function insertRow<T extends { id?: string; created_at?: string }>(
  table: FarmTable,
  values: Omit<T, "id" | "created_at"> & Partial<Pick<T, "id" | "created_at">>,
  conflictColumns?: string
): Promise<T> {
  if (isSupabaseConfigured) {
    const query = conflictColumns
      ? supabase.from(table).upsert(values, { onConflict: conflictColumns })
      : values.id
        ? supabase.from(table).update(values).eq("id", values.id)
        : supabase.from(table).insert(values);
    const { data, error } = await query.select("*").single();
    if (error) {
      console.error(`Supabase error saving ${table}`, error);
      throw new Error(formatSupabaseError(error));
    }
    if (!data) throw new Error(`The ${table} record was not returned after saving.`);
    notifyStoreUpdated();
    return data as T;
  }

  const rows = localRead<T>(table);
  const conflictFields = conflictColumns?.split(",").map((field) => field.trim());
  const index = rows.findIndex((row) =>
    conflictFields
      ? conflictFields.every((field) => Reflect.get(row, field) === Reflect.get(values, field))
      : row.id === values.id
  );
  const id = values.id || (index >= 0 ? rows[index].id : newId());
  const saved = {
    ...values,
    id,
    created_at: values.created_at || new Date().toISOString(),
  } as T;
  if (index >= 0) rows[index] = { ...rows[index], ...saved };
  else rows.unshift(saved);
  localWrite(table, rows);
  return saved;
}

function updateLocalRows<T extends { id: string }>(
  table: FarmTable,
  rows: T[]
): void {
  localWrite(table, rows);
}

async function recordGeneratedExpense(
  expense: Parameters<typeof DataStore.saveDailyExpense>[0]
): Promise<void> {
  if (!isSupabaseConfigured) await DataStore.saveDailyExpense(expense);
}

export const FarmStore = {
  getAnimals: () => getRows<Animal>("animals", "created_at"),
  saveAnimal: async (
    animal: Omit<Animal, "id" | "created_at"> & { id?: string }
  ): Promise<Animal> => {
    if (!isSupabaseConfigured) {
      const duplicate = localRead<Animal>("animals").some(
        (row) => row.tag_number === animal.tag_number && row.id !== animal.id
      );
      if (duplicate) throw new Error("Animal tag / ID is already in use.");
    }
    const saved = await insertRow<Animal>("animals", animal);
    if (!isSupabaseConfigured && !animal.id && animal.purchase_price > 0 && animal.purchase_date) {
      await recordGeneratedExpense({
        expense_date: animal.purchase_date,
        category: "Animal Purchase",
        amount: animal.purchase_price,
        description: `Animal purchase: ${animal.name} (${animal.tag_number})`,
      });
    }
    return saved;
  },
  getAnimalRecords: () => getRows<AnimalRecord>("animal_records", "record_date"),
  saveAnimalRecord: async (record: Omit<AnimalRecord, "id" | "created_at">) => {
    if (!isSupabaseConfigured && !localRead<Animal>("animals").some((animal) => animal.id === record.animal_id)) {
      throw new Error("Select an animal that exists in the register.");
    }
    const saved = await insertRow<AnimalRecord>("animal_records", record);
    if (record.cost > 0) {
      await recordGeneratedExpense({
        expense_date: record.record_date,
        category: "Veterinary",
        amount: record.cost,
        description: `${record.record_type} record: ${record.description}`,
      });
    }
    return saved;
  },
  deleteAnimal: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from("animals").delete().eq("id", id);
      if (error) throw new Error(formatSupabaseError(error));
    } else {
      updateLocalRows("animals", localRead<Animal>("animals").filter((row) => row.id !== id));
      updateLocalRows(
        "animal_records",
        withoutAnimalRecords(localRead<AnimalRecord>("animal_records"), id)
      );
      updateLocalRows(
        "veterinary_logs",
        withoutAnimalRecords(localRead<VeterinaryLog>("veterinary_logs"), id)
      );
      updateLocalRows(
        "milk_production",
        withoutAnimalRecords(localRead<MilkProduction>("milk_production"), id)
      );
    }
    notifyStoreUpdated();
  },

  getFeedInventory: () => getRows<FeedInventoryItem>("feed_inventory", "name"),
  saveFeedItem: async (item: Omit<FeedInventoryItem, "id" | "created_at"> & { id?: string }) => {
    if (!isSupabaseConfigured && localRead<FeedInventoryItem>("feed_inventory").some(
      (row) => row.name.toLowerCase() === item.name.toLowerCase() && row.id !== item.id
    )) {
      throw new Error("A feed item with this name already exists.");
    }
    return insertRow<FeedInventoryItem>("feed_inventory", item);
  },
  getFeedTransactions: () => getRows<FeedTransaction>("feed_transactions", "transaction_date"),
  saveFeedTransaction: async (
    transaction: Omit<FeedTransaction, "id" | "created_at" | "feed">
  ): Promise<FeedTransaction> => {
    if (!isSupabaseConfigured) {
      const inventory = localRead<FeedInventoryItem>("feed_inventory");
      const itemIndex = inventory.findIndex((item) => item.id === transaction.feed_id);
      if (itemIndex < 0) throw new Error("Select an existing feed item.");
      const change =
        transaction.transaction_type === "Purchase"
          ? transaction.quantity
          : -transaction.quantity;
      if (inventory[itemIndex].quantity + change < 0) {
        throw new Error("Consumption quantity exceeds available feed stock.");
      }
      inventory[itemIndex] = {
        ...inventory[itemIndex],
        quantity: inventory[itemIndex].quantity + change,
        unit_rate:
          transaction.transaction_type === "Purchase"
            ? transaction.unit_rate
            : inventory[itemIndex].unit_rate,
      };
      updateLocalRows("feed_inventory", inventory);
    }
    const saved = await insertRow<FeedTransaction>("feed_transactions", transaction);
    if (transaction.transaction_type === "Purchase" && transaction.total_cost > 0) {
      await recordGeneratedExpense({
        expense_date: transaction.transaction_date,
        category: "Feed Purchase",
        amount: transaction.total_cost,
        description: transaction.notes || `Feed purchase (${transaction.quantity})`,
      });
    }
    return saved;
  },

  getMedicineInventory: () => getRows<MedicineInventoryItem>("medicine_inventory", "name"),
  saveMedicine: async (
    item: Omit<MedicineInventoryItem, "id" | "created_at"> & { id?: string }
  ) => {
    if (!isSupabaseConfigured && localRead<MedicineInventoryItem>("medicine_inventory").some(
      (row) => row.name.toLowerCase() === item.name.toLowerCase() && row.id !== item.id
    )) {
      throw new Error("A medicine with this name already exists. Use Restock Inventory.");
    }
    return insertRow<MedicineInventoryItem>("medicine_inventory", item);
  },
  adjustMedicineStock: async (id: string, quantityAdded: number): Promise<void> => {
    if (!Number.isFinite(quantityAdded) || quantityAdded <= 0) {
      throw new Error("Restock quantity must be greater than 0.");
    }
    if (isSupabaseConfigured) {
      const { data: item, error: loadError } = await supabase
        .from("medicine_inventory")
        .select("quantity")
        .eq("id", id)
        .single();
      if (loadError) throw new Error(formatSupabaseError(loadError));
      if (!item) throw new Error("Medicine inventory item was not found.");
      const { error } = await supabase
        .from("medicine_inventory")
        .update({ quantity: Number(item.quantity) + quantityAdded })
        .eq("id", id);
      if (error) throw new Error(formatSupabaseError(error));
    } else {
      const inventory = localRead<MedicineInventoryItem>("medicine_inventory");
      const index = inventory.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("Select an existing medicine.");
      inventory[index] = {
        ...inventory[index],
        quantity: Number(inventory[index].quantity) + quantityAdded,
      };
      localWrite("medicine_inventory", inventory);
    }
    notifyStoreUpdated();
  },
  getVeterinaryLogs: () => getRows<VeterinaryLog>("veterinary_logs", "treatment_date"),
  saveVeterinaryLog: async (
    log: Omit<VeterinaryLog, "id" | "created_at" | "animal">
  ): Promise<VeterinaryLog> => {
    if (!isSupabaseConfigured && !localRead<Animal>("animals").some((animal) => animal.id === log.animal_id)) {
      throw new Error("Select an animal that exists in the register.");
    }
    if (!isSupabaseConfigured && log.medicine_id && log.quantity_used > 0) {
      const inventory = localRead<MedicineInventoryItem>("medicine_inventory");
      const medicineIndex = inventory.findIndex((item) => item.id === log.medicine_id);
      if (medicineIndex < 0) throw new Error("Select an existing medicine.");
      if (inventory[medicineIndex].quantity < log.quantity_used) {
        throw new Error("Treatment quantity exceeds available medicine stock.");
      }
      inventory[medicineIndex] = {
        ...inventory[medicineIndex],
        quantity: inventory[medicineIndex].quantity - log.quantity_used,
      };
      updateLocalRows("medicine_inventory", inventory);
    }
    const saved = await insertRow<VeterinaryLog>("veterinary_logs", log);
    const cost = Number(log.medicine_cost) + Number(log.vet_fee);
    if (cost > 0) {
      await recordGeneratedExpense({
        expense_date: log.treatment_date,
        category: "Veterinary",
        amount: cost,
        description: `Veterinary care: ${log.treatment}`,
      });
    }
    return saved;
  },

  getMilkProduction: () => getRows<MilkProduction>("milk_production", "production_date"),
  saveMilkProduction: async (
    row: Omit<MilkProduction, "id" | "created_at" | "animal">,
    existingId?: string
  ) => {
    if (!isSupabaseConfigured && !localRead<Animal>("animals").some((animal) => animal.id === row.animal_id)) {
      throw new Error("Select an animal that exists in the register.");
    }
    return insertRow<MilkProduction>(
      "milk_production",
      existingId ? { ...row, id: existingId } : row,
      "animal_id,production_date"
    );
  },

  getWorkers: () => getRows<Worker>("workers", "created_at"),
  saveWorker: (worker: Omit<Worker, "id" | "created_at"> & { id?: string }) =>
    insertRow<Worker>("workers", worker),
  getWorkerPayrolls: () => getRows<WorkerPayroll>("worker_payrolls", "payment_date"),
  saveWorkerPayroll: async (
    payroll: Omit<WorkerPayroll, "id" | "created_at" | "worker">
  ): Promise<WorkerPayroll> => {
    if (!isSupabaseConfigured && !localRead<Worker>("workers").some((worker) => worker.id === payroll.worker_id)) {
      throw new Error("Select a worker that exists in the staff register.");
    }
    const saved = await insertRow<WorkerPayroll>("worker_payrolls", payroll);
    const amount = Number(payroll.amount_paid) + Number(payroll.advances);
    if (amount > 0) {
      await recordGeneratedExpense({
        expense_date: payroll.payment_date,
        category: "Worker Payroll",
        amount,
        description: `Worker payroll payment for ${payroll.period_month}`,
      });
    }
    return saved;
  },

  getSupplierPayments: () => getRows<SupplierPayment>("supplier_payments", "payment_date"),
  saveSupplierPayment: async (
    payment: Omit<SupplierPayment, "id" | "created_at">
  ) => {
    if (!isSupabaseConfigured && !(await DataStore.getSuppliers()).some((supplier) => supplier.id === payment.supplier_id)) {
      throw new Error("Select a supplier that exists in the supplier directory.");
    }
    return insertRow<SupplierPayment>("supplier_payments", payment);
  },
};
