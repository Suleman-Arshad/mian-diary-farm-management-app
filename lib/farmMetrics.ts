import type {
  Animal,
  DailyPurchase,
  FeedTransaction,
  MedicineInventoryItem,
  SupplierPayment,
  Worker,
  WorkerPayroll,
} from "@/types/database";

export function calculateNetSalesRevenue(
  grossSales: number,
  expenses: readonly { amount: number }[]
): number {
  return grossSales - expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
}

export function countActiveAnimals(animals: readonly Animal[]): Record<Animal["animal_type"], number> {
  return animals.reduce(
    (counts, animal) => {
      if (animal.status === "Active") counts[animal.animal_type] += 1;
      return counts;
    },
    { Cow: 0, Buffalo: 0, Calf: 0 }
  );
}

export function countLowStock(
  inventory: readonly { quantity: number; low_stock_threshold: number }[]
): number {
  return inventory.filter(
    (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
  ).length;
}

export function calculateSupplierPayables(
  milkPurchases: readonly DailyPurchase[],
  feedPurchases: readonly FeedTransaction[],
  payments: readonly SupplierPayment[]
): number {
  const balances = new Map<string, number>();
  const addBalance = (supplierId: string | null, amount: number) => {
    const key = supplierId || "unassigned";
    balances.set(key, (balances.get(key) || 0) + amount);
  };
  milkPurchases.forEach((row) => addBalance(row.supplier_id, Number(row.total_cost)));
  feedPurchases
    .filter((row) => row.transaction_type === "Purchase")
    .forEach((row) => addBalance(row.supplier_id, Number(row.total_cost)));
  payments.forEach((row) => addBalance(row.supplier_id, -Number(row.amount)));
  return Array.from(balances.values()).reduce(
    (sum, balance) => sum + Math.max(0, balance),
    0
  );
}

export function calculateWorkerPayables(
  payrolls: readonly WorkerPayroll[],
  workers: readonly Worker[],
  currentMonth: string
): number {
  const workerBalances = new Map<string, number>();
  payrolls.forEach((row) => {
    const balance =
      Number(row.base_wage) +
      Number(row.bonuses) +
      Number(row.overtime) -
      Number(row.deductions) -
      Number(row.advances) -
      Number(row.amount_paid);
    workerBalances.set(row.worker_id, (workerBalances.get(row.worker_id) || 0) + balance);
  });
  workers
    .filter(
      (worker) =>
        worker.is_active &&
        worker.wage_type === "Monthly Salary" &&
        !payrolls.some(
          (row) =>
            row.worker_id === worker.id &&
            row.period_month === currentMonth &&
            Number(row.base_wage) > 0
        )
    )
    .forEach((worker) => {
      workerBalances.set(
        worker.id,
        (workerBalances.get(worker.id) || 0) + Number(worker.wage_rate)
      );
    });
  return Array.from(workerBalances.values()).reduce(
    (sum, balance) => sum + Math.max(0, balance),
    0
  );
}

export function calculatePayrollPeriodPayables(
  payrolls: readonly WorkerPayroll[],
  periodMonth: string
): number {
  const workerBalances = new Map<string, number>();
  payrolls
    .filter((row) => row.period_month === periodMonth)
    .forEach((row) => {
      const balance =
        Number(row.base_wage) +
        Number(row.bonuses) +
        Number(row.overtime) -
        Number(row.deductions) -
        Number(row.advances) -
        Number(row.amount_paid);
      workerBalances.set(row.worker_id, (workerBalances.get(row.worker_id) || 0) + balance);
    });
  return Array.from(workerBalances.values()).reduce(
    (sum, balance) => sum + Math.max(0, balance),
    0
  );
}

export function withoutAnimalRecords<T extends { animal_id: string }>(
  records: readonly T[],
  animalId: string
): T[] {
  return records.filter((record) => record.animal_id !== animalId);
}

export function countLowStockFarmItems(
  feed: readonly { quantity: number; low_stock_threshold: number }[],
  medicine: readonly MedicineInventoryItem[]
): number {
  return countLowStock([...feed, ...medicine]);
}
