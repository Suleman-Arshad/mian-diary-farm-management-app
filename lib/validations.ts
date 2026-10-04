import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^[0-9+\-\s]+$/, "Please enter a valid phone number"),
  address: z.string().optional().default(""),
  fixed_rate_per_kg: z.coerce
    .number()
    .positive("Fixed rate must be greater than 0"),
  previous_balance: z.coerce
    .number()
    .min(0, "Previous balance cannot be negative")
    .default(0),
  is_active: z.boolean().default(true),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const paymentSchema = z.object({
  customer_id: z.string().min(1, "Customer selection is required"),
  payment_date: z.string().min(1, "Payment date is required"),
  amount_paid: z.coerce.number().positive("Amount paid must be greater than 0"),
  payment_mode: z.enum(["Cash", "Bank Transfer", "EasyPaisa/JazzCash"], {
    errorMap: () => ({ message: "Please select a valid payment method" }),
  }),
  notes: z.string().optional().default(""),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

export const supplierSchema = z.object({
  supplier_name: z.string().min(2, "Supplier name must be at least 2 characters"),
  phone: z.string().optional().default(""),
  purchase_rate_per_kg: z.coerce
    .number()
    .positive("Purchase rate must be greater than 0"),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export const purchaseSchema = z.object({
  supplier_id: z.string().min(1, "Supplier selection is required"),
  purchase_date: z.string().min(1, "Purchase date is required"),
  qty_kg: z.coerce.number().positive("Quantity must be greater than 0"),
  rate_per_kg: z.coerce.number().positive("Rate per KG must be greater than 0"),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;

export const expenseSchema = z.object({
  expense_date: z.string().min(1, "Expense date is required"),
  category: z.enum([
    "Petrol/Fuel",
    "Vehicle Maintenance",
    "Staff Salary",
    "Feed/Containers",
    "Miscellaneous",
  ]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  description: z.string().optional().default(""),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;

// Authentication Schemas
export const signupSchema = z
  .object({
    businessName: z
      .string()
      .min(2, "Dairy or business name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .min(10, "Phone number must be at least 10 digits")
      .regex(/^[0-9+\-\s()]+$/, "Please enter a valid phone number"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long"),
    confirmPassword: z
      .string()
      .min(6, "Confirm password must be at least 6 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

