import {
  Customer,
  Supplier,
  DailySale,
  CustomerPayment,
  DailyPurchase,
  DailyExpense,
} from "@/types/database";
import { getTodayDateString } from "./utils";
import { subDays, format } from "date-fns";

const today = new Date();
const todayStr = getTodayDateString();
const yesterdayStr = format(subDays(today, 1), "yyyy-MM-dd");
const twoDaysAgoStr = format(subDays(today, 2), "yyyy-MM-dd");

export const initialCustomers: Customer[] = [
  {
    id: "c-001",
    name: "Haji Mohammad Rafiq",
    phone: "0300-1234567",
    address: "House 14, Street 5, Model Town",
    fixed_rate_per_kg: 190.0,
    previous_balance: 1500.0,
    is_active: true,
    created_at: new Date(2026, 0, 1).toISOString(),
  },
  {
    id: "c-002",
    name: "Dr. Tariq Mahmood",
    phone: "0321-7654321",
    address: "Plot 88, Sector G-9, Islamabad",
    fixed_rate_per_kg: 190.0,
    previous_balance: 0.0,
    is_active: true,
    created_at: new Date(2026, 0, 1).toISOString(),
  },
  {
    id: "c-003",
    name: "Mrs. Zainab Bibi",
    phone: "0333-9876543",
    address: "Flat 4-B, Al-Madina Heights",
    fixed_rate_per_kg: 185.0,
    previous_balance: 3200.0,
    is_active: true,
    created_at: new Date(2026, 0, 5).toISOString(),
  },
  {
    id: "c-004",
    name: "Bilal Ahmed Butt",
    phone: "0312-4567890",
    address: "Shop #12, Main Bazar Dairy Zone",
    fixed_rate_per_kg: 180.0,
    previous_balance: 850.0,
    is_active: true,
    created_at: new Date(2026, 0, 10).toISOString(),
  },
  {
    id: "c-005",
    name: "Chaudhry Akram Gujjar",
    phone: "0345-6789012",
    address: "Farm House 3, Canal View Road",
    fixed_rate_per_kg: 185.0,
    previous_balance: 0.0,
    is_active: true,
    created_at: new Date(2026, 0, 15).toISOString(),
  },
  {
    id: "c-006",
    name: "Malik Usman Ali",
    phone: "0304-9988776",
    address: "House 29, Block C, Faisal Town",
    fixed_rate_per_kg: 195.0,
    previous_balance: 450.0,
    is_active: true,
    created_at: new Date(2026, 1, 1).toISOString(),
  },
];

export const initialSuppliers: Supplier[] = [
  {
    id: "s-001",
    supplier_name: "Al-Rehman Dairy Farm",
    phone: "0301-1112233",
    purchase_rate_per_kg: 160.0,
    created_at: new Date(2026, 0, 1).toISOString(),
  },
  {
    id: "s-002",
    supplier_name: "Green Valley Buffalo Farm",
    phone: "0302-2223344",
    purchase_rate_per_kg: 162.0,
    created_at: new Date(2026, 0, 1).toISOString(),
  },
  {
    id: "s-003",
    supplier_name: "Punjab Pure Cattle Shed",
    phone: "0303-3334455",
    purchase_rate_per_kg: 158.0,
    created_at: new Date(2026, 0, 15).toISOString(),
  },
];

export const initialDailyPurchases: DailyPurchase[] = [
  {
    id: "dp-001",
    supplier_id: "s-001",
    purchase_date: todayStr,
    qty_kg: 60.0,
    rate_per_kg: 160.0,
    total_cost: 9600.0,
    created_at: new Date().toISOString(),
  },
  {
    id: "dp-002",
    supplier_id: "s-002",
    purchase_date: todayStr,
    qty_kg: 40.0,
    rate_per_kg: 162.0,
    total_cost: 6480.0,
    created_at: new Date().toISOString(),
  },
  {
    id: "dp-003",
    supplier_id: "s-001",
    purchase_date: yesterdayStr,
    qty_kg: 58.0,
    rate_per_kg: 160.0,
    total_cost: 9280.0,
    created_at: subDays(today, 1).toISOString(),
  },
];

export const initialDailySales: DailySale[] = [
  {
    id: "ds-001",
    customer_id: "c-001",
    entry_date: todayStr,
    qty_kg: 4.5,
    is_nagha: false,
    custom_rate: null,
    total_amount: 4.5 * 190.0,
    created_at: new Date().toISOString(),
  },
  {
    id: "ds-002",
    customer_id: "c-002",
    entry_date: todayStr,
    qty_kg: 2.0,
    is_nagha: false,
    custom_rate: null,
    total_amount: 2.0 * 190.0,
    created_at: new Date().toISOString(),
  },
  {
    id: "ds-003",
    customer_id: "c-003",
    entry_date: todayStr,
    qty_kg: 0,
    is_nagha: true, // Nagha today!
    custom_rate: null,
    total_amount: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: "ds-004",
    customer_id: "c-004",
    entry_date: todayStr,
    qty_kg: 15.0,
    is_nagha: false,
    custom_rate: 175.0, // Special wholesale rate
    total_amount: 15.0 * 175.0,
    created_at: new Date().toISOString(),
  },
  {
    id: "ds-005",
    customer_id: "c-005",
    entry_date: todayStr,
    qty_kg: 5.0,
    is_nagha: false,
    custom_rate: null,
    total_amount: 5.0 * 185.0,
    created_at: new Date().toISOString(),
  },
  {
    id: "ds-006",
    customer_id: "c-006",
    entry_date: todayStr,
    qty_kg: 3.0,
    is_nagha: false,
    custom_rate: null,
    total_amount: 3.0 * 195.0,
    created_at: new Date().toISOString(),
  },
  // Yesterday's deliveries
  {
    id: "ds-007",
    customer_id: "c-001",
    entry_date: yesterdayStr,
    qty_kg: 4.5,
    is_nagha: false,
    custom_rate: null,
    total_amount: 4.5 * 190.0,
    created_at: subDays(today, 1).toISOString(),
  },
  {
    id: "ds-008",
    customer_id: "c-002",
    entry_date: yesterdayStr,
    qty_kg: 2.0,
    is_nagha: false,
    custom_rate: null,
    total_amount: 2.0 * 190.0,
    created_at: subDays(today, 1).toISOString(),
  },
  {
    id: "ds-009",
    customer_id: "c-003",
    entry_date: yesterdayStr,
    qty_kg: 3.0,
    is_nagha: false,
    custom_rate: null,
    total_amount: 3.0 * 185.0,
    created_at: subDays(today, 1).toISOString(),
  },
];

export const initialCustomerPayments: CustomerPayment[] = [
  {
    id: "p-001",
    customer_id: "c-001",
    payment_date: todayStr,
    amount_paid: 2000.0,
    payment_mode: "Cash",
    notes: "Partial payment for milk bill",
    created_at: new Date().toISOString(),
  },
  {
    id: "p-002",
    customer_id: "c-003",
    payment_date: yesterdayStr,
    amount_paid: 1500.0,
    payment_mode: "EasyPaisa/JazzCash",
    notes: "TRX: 8943729834",
    created_at: subDays(today, 1).toISOString(),
  },
];

export const initialDailyExpenses: DailyExpense[] = [
  {
    id: "e-001",
    expense_date: todayStr,
    category: "Petrol/Fuel",
    amount: 1200.0,
    description: "Bike petrol for morning & evening delivery round",
    created_at: new Date().toISOString(),
  },
  {
    id: "e-002",
    expense_date: todayStr,
    category: "Feed/Containers",
    amount: 650.0,
    description: "New stainless steel measuring mug & ice bags",
    created_at: new Date().toISOString(),
  },
  {
    id: "e-003",
    expense_date: yesterdayStr,
    category: "Vehicle Maintenance",
    amount: 800.0,
    description: "Delivery bike oil change and tire puncture fix",
    created_at: subDays(today, 1).toISOString(),
  },
];
