export type PaymentMode =
  | 'Cash'
  | 'Online'
  | 'JazzCash'
  | 'Bank Transfer'
  | 'EasyPaisa/JazzCash';

export type ExpenseCategory =
  | 'Petrol/Fuel'
  | 'Vehicle Maintenance'
  | 'Staff Salary'
  | 'Feed/Containers'
  | 'Feed Purchase'
  | 'Veterinary'
  | 'Worker Payroll'
  | 'Animal Purchase'
  | 'Miscellaneous';

export type AnimalType = 'Cow' | 'Buffalo' | 'Calf';
export type AnimalStatus = 'Active' | 'Sold' | 'Deceased';
export type WorkerWageType = 'Monthly Salary' | 'Daily Wages';

export interface Animal {
  id: string;
  tag_number: string;
  name: string;
  animal_type: AnimalType;
  breed: string | null;
  birth_date: string | null;
  photo_url: string | null;
  status: AnimalStatus;
  purchase_price: number;
  purchase_date: string | null;
  sale_price: number | null;
  sale_date: string | null;
  created_at: string;
}

export interface AnimalRecord {
  id: string;
  animal_id: string;
  record_type: 'Medical' | 'Vaccination' | 'Calving';
  record_date: string;
  description: string;
  next_due_date: string | null;
  cost: number;
  created_at: string;
  animal?: Animal;
}

export interface FeedInventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  unit_rate: number;
  created_at: string;
}

export interface FeedTransaction {
  id: string;
  feed_id: string;
  transaction_type: 'Purchase' | 'Consumption';
  quantity: number;
  unit_rate: number;
  total_cost: number;
  transaction_date: string;
  supplier_id: string | null;
  notes: string | null;
  created_at: string;
  feed?: FeedInventoryItem;
}

export interface MedicineInventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  unit_rate: number;
  created_at: string;
}

export interface VeterinaryLog {
  id: string;
  animal_id: string;
  medicine_id: string | null;
  treatment_date: string;
  treatment: string;
  dosage: string;
  quantity_used: number;
  medicine_cost: number;
  vet_fee: number;
  next_checkup_date: string | null;
  created_at: string;
  animal?: Animal;
}

export interface MilkProduction {
  id: string;
  animal_id: string;
  production_date: string;
  morning_yield: number;
  evening_yield: number;
  wastage: number;
  created_at: string;
  animal?: Animal;
}

export interface Worker {
  id: string;
  name: string;
  phone: string | null;
  wage_type: WorkerWageType;
  wage_rate: number;
  is_active: boolean;
  created_at: string;
}

export interface WorkerPayroll {
  id: string;
  worker_id: string;
  period_month: string;
  payment_date: string;
  days_worked: number;
  base_wage: number;
  advances: number;
  bonuses: number;
  deductions: number;
  overtime: number;
  amount_paid: number;
  created_at: string;
  worker?: Worker;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  payment_date: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
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
  billing_month?: string; // YYYY-MM
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
  payment?: CustomerPayment;
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
  outstandingBalance: number;
}