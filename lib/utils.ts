import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0";
  return `Rs. ${Number(amount).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatKg(qty: number | undefined | null): string {
  if (qty === undefined || qty === null || isNaN(qty)) return "0.00 KG";
  return `${Number(qty).toFixed(2)} KG`;
}

export function formatDateDisplay(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return "";
  try {
    const date = typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
    if (!isValid(date)) return String(dateStr);
    return format(date, "dd MMM yyyy");
  } catch {
    return String(dateStr);
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
