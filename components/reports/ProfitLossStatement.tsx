"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Milk,
  Receipt,
  Truck,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatKg } from "@/lib/utils";
import { DailySale, DailyPurchase, DailyExpense } from "@/types/database";

interface ProfitLossStatementProps {
  monthStr: string; // YYYY-MM
  sales: DailySale[];
  purchases: DailyPurchase[];
  expenses: DailyExpense[];
}

export function ProfitLossStatement({
  monthStr,
  sales,
  purchases,
  expenses,
}: ProfitLossStatementProps) {
  // Filter data for selected month
  const monthSales = sales.filter((s) => s.entry_date.startsWith(monthStr));
  const monthPurchases = purchases.filter((p) => p.purchase_date.startsWith(monthStr));
  const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(monthStr));

  // Revenue
  const totalSalesRevenue = monthSales.reduce(
    (sum, s) => sum + Number(s.total_amount),
    0
  );
  const totalMilkSoldKg = monthSales.reduce(
    (sum, s) => sum + (s.is_nagha ? 0 : Number(s.qty_kg)),
    0
  );

  // Costs
  const totalFarmCost = monthPurchases.reduce(
    (sum, p) => sum + Number(p.total_cost),
    0
  );
  const totalMilkPurchasedKg = monthPurchases.reduce(
    (sum, p) => sum + Number(p.qty_kg),
    0
  );

  // Expenses
  const totalOperatingExpenses = monthExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Profit calculations
  const grossProfit = totalSalesRevenue - totalFarmCost;
  const netProfit = totalSalesRevenue - (totalFarmCost + totalOperatingExpenses);
  const profitMargin =
    totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Net Profit Big Banner */}
      <div
        className={`rounded-2xl border p-6 shadow-sm ${
          netProfit >= 0
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50"
            : "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/50"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md ${
                netProfit >= 0 ? "bg-emerald-600 shadow-emerald-500/30" : "bg-rose-600 shadow-rose-500/30"
              }`}
            >
              {netProfit >= 0 ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Monthly Net Profit ({monthStr})
              </span>
              <h2
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {formatCurrency(netProfit)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block">Profit Margin</span>
              <span
                className={`text-lg font-bold ${
                  profitMargin >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {profitMargin.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Gross Margin</span>
              <span className="text-lg font-bold text-slate-800">
                {formatCurrency(grossProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              1. Sales Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
              <Milk className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(totalSalesRevenue)}
          </p>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Milk Distributed:</span>
              <span className="font-semibold text-slate-800">{formatKg(totalMilkSoldKg)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Selling Rate:</span>
              <span className="font-semibold text-slate-800">
                {totalMilkSoldKg > 0 ? formatCurrency(totalSalesRevenue / totalMilkSoldKg) + "/KG" : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Farm Milk Cost */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              2. Farm Milk Purchases
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Truck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            -{formatCurrency(totalFarmCost)}
          </p>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Milk Purchased:</span>
              <span className="font-semibold text-slate-800">{formatKg(totalMilkPurchasedKg)}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Purchase Rate:</span>
              <span className="font-semibold text-slate-800">
                {totalMilkPurchasedKg > 0 ? formatCurrency(totalFarmCost / totalMilkPurchasedKg) + "/KG" : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Operational Expenses */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              3. Operating Expenses
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700">
            -{formatCurrency(totalOperatingExpenses)}
          </p>
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>Expense Count:</span>
              <span className="font-semibold text-slate-800">{monthExpenses.length} entries</span>
            </div>
            <div className="flex justify-between">
              <span>Fuel & Salaries:</span>
              <span className="font-semibold text-slate-800">Included</span>
            </div>
          </div>
        </div>
      </div>

      {/* P&L Detailed Statement Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 font-bold text-sm text-slate-800">
          Monthly P&L Statement Equation Breakdown
        </div>
        <div className="p-4 space-y-3 text-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="font-semibold text-slate-700">Total Customer Deliveries Revenue (A)</span>
            <span className="font-bold text-slate-900">{formatCurrency(totalSalesRevenue)}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-amber-800">
            <span>Less: Farm Milk Cost of Goods Sold (B)</span>
            <span className="font-semibold">-{formatCurrency(totalFarmCost)}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold text-slate-900 bg-slate-50/50 p-2 rounded">
            <span>GROSS PROFIT (A - B)</span>
            <span>{formatCurrency(grossProfit)}</span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-rose-700">
            <span>Less: Operational & Delivery Expenses (C)</span>
            <span className="font-semibold">-{formatCurrency(totalOperatingExpenses)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 text-base font-extrabold text-slate-900 p-2 bg-emerald-50/80 rounded border border-emerald-200">
            <span className="text-emerald-900">NET BUSINESS PROFIT (A - B - C)</span>
            <span className={netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}>
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
