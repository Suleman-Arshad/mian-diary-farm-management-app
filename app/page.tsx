"use client";

import * as React from "react";
import Link from "next/link";
import {
  Milk,
  Truck,
  Scale,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Wallet,
  Receipt,
  PlusCircle,
  ClipboardList,
  ChevronRight,
  ArrowDownRight,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  Customer,
  DailySale,
  DailyPurchase,
  DailyExpense,
  CustomerPayment,
  DailyReconciliation,
} from "@/types/database";
import { DataStore } from "@/lib/store";
import {
  formatCurrency,
  formatKg,
  getTodayDateString,
  formatDateDisplay,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/customers/PaymentDialog";
import { PaymentFormValues } from "@/lib/validations";

export default function DashboardPage() {
  const todayStr = getTodayDateString();

  const [loading, setLoading] = React.useState(true);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customerBalances, setCustomerBalances] = React.useState<Map<string, number>>(
    new Map()
  );
  const [todaySales, setTodaySales] = React.useState<DailySale[]>([]);
  const [todayPurchases, setTodayPurchases] = React.useState<DailyPurchase[]>([]);
  const [todayExpenses, setTodayExpenses] = React.useState<DailyExpense[]>([]);
  const [todayPayments, setTodayPayments] = React.useState<CustomerPayment[]>([]);
  const [reconciliation, setReconciliation] = React.useState<DailyReconciliation | null>(null);

  // Payment modal
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);

  const loadDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [custList, salesList, purList, expList, payList, reconData, supList] =
        await Promise.all([
          DataStore.getCustomers(),
          DataStore.getDailySalesByDate(todayStr, true),
          DataStore.getDailyPurchases(),
          DataStore.getDailyExpenses(),
          DataStore.getCustomerPayments(),
          DataStore.getDailyReconciliation(todayStr),
          DataStore.getSuppliers(),
        ]);
      const balances = await DataStore.getCustomerBalances();

      const activeCustMap = new Map(
        custList.filter((c) => c.is_active).map((c) => [c.id, c])
      );
      const validTodaySales = salesList
        .filter((s) => activeCustMap.has(s.customer_id))
        .map((s) => ({
          ...s,
          customer: activeCustMap.get(s.customer_id) || s.customer,
        }));

      const supMap = new Map(supList.map((s) => [s.id, s]));
      const validTodayPurchases = purList
        .filter((p) => p.purchase_date === todayStr && supMap.has(p.supplier_id))
        .map((p) => ({
          ...p,
          supplier: supMap.get(p.supplier_id) || p.supplier,
        }));

      setCustomers(custList);
      setCustomerBalances(balances);
      setTodaySales(validTodaySales);
      setTodayPurchases(validTodayPurchases);
      setTodayExpenses(expList.filter((e) => e.expense_date === todayStr));
      setTodayPayments(
        payList.filter(
          (p) => p.payment_date === todayStr && activeCustMap.has(p.customer_id)
        )
      );
      setReconciliation(reconData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [todayStr]);

  React.useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => loadDashboardData();
    window.addEventListener("milk-store-updated", handleUpdate);
    return () => window.removeEventListener("milk-store-updated", handleUpdate);
  }, [loadDashboardData]);

  const handleSavePayment = async (values: PaymentFormValues) => {
    await DataStore.saveCustomerPayment({
      customer_id: values.customer_id,
      payment_date: values.payment_date,
      amount_paid: values.amount_paid,
      payment_mode: values.payment_mode,
      notes: values.notes,
    });
    await loadDashboardData();
  };

  // Metrics computation
  const totalIntakeKg = todayPurchases.reduce((sum, p) => sum + Number(p.qty_kg), 0);
  const totalFarmCost = todayPurchases.reduce((sum, p) => sum + Number(p.total_cost), 0);

  const totalDistributedKg = todaySales.reduce(
    (sum, s) => sum + (s.is_nagha ? 0 : Number(s.qty_kg)),
    0
  );
  const totalSalesRevenue = todaySales.reduce(
    (sum, s) => sum + Number(s.total_amount),
    0
  );

  const wastageKg = totalIntakeKg - totalDistributedKg;
  const wastagePercentage = totalIntakeKg > 0 ? (wastageKg / totalIntakeKg) * 100 : 0;

  const totalDayExpenses = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalRecoveredCash = todayPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const naghaCount = todaySales.filter((s) => s.is_nagha).length;

  const totalOutstandingBalance = customers.reduce(
    (sum, c) => sum + (customerBalances.get(c.id) || 0),
    0
  );

  // Daily profit margin: Sales - (Farm Cost + Expenses)
  const dayNetMargin = totalSalesRevenue - (totalFarmCost + totalDayExpenses);

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-900 via-sky-800 to-slate-900 text-white p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-sky-500/30 text-sky-200 border border-sky-400/30">
                Dairy Operations Center
              </span>
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-sky-400" />
                {formatDateDisplay(todayStr)}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-white">
              Milk Dairy Overview & Dispatch
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Real-time monitoring of raw milk intake, route distributions, loss reconciliation, and cash flow.
            </p>
          </div>

          {/* Primary Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/daily-entry">
              <Button
                variant="dairy"
                className="gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-lg shadow-sky-500/20 text-xs sm:text-sm min-h-[44px] px-4"
              >
                <ClipboardList className="h-4 w-4" />
                <span>Today Route Entry</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs sm:text-sm min-h-[44px] px-4"
              onClick={() => setPaymentModalOpen(true)}
            >
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span>Collect Cash</span>
            </Button>
          </div>
        </div>

        {/* Decorative backdrop shapes */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 w-64 h-64 rounded-full bg-sky-500/10 pointer-events-none blur-2xl" />
      </div>

      {/* METRIC ROW 1: TODAY'S MILK VOLUME & RECONCILIATION */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Milk className="h-4 w-4 text-sky-600" />
          Today Volume &amp; Physical Reconciliation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Intake KG */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Farm Intake</span>
              <Truck className="h-4 w-4 text-sky-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {formatKg(totalIntakeKg)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Cost: {formatCurrency(totalFarmCost)}
            </span>
          </div>

          {/* Distributed KG */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Distributed to Customers</span>
              <Milk className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
              {formatKg(totalDistributedKg)}
            </p>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">
              Billed: {formatCurrency(totalSalesRevenue)}
            </span>
          </div>

          {/* Wastage / Loss KG */}
          <div
            className={`rounded-xl border p-4 shadow-sm ${
              wastagePercentage > 3.0
                ? "bg-rose-50 border-rose-200"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Loss / Wastage</span>
              <Scale className="h-4 w-4 text-amber-600" />
            </div>
            <p
              className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
                wastagePercentage > 3.0 ? "text-rose-700" : "text-slate-800"
              }`}
            >
              {formatKg(wastageKg)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {wastagePercentage.toFixed(1)}% of farm intake
            </span>
          </div>

          {/* Nagha Count */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Naghas (Absents)</span>
              <Badge variant="nagha" className="text-[10px]">Today</Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-600 mt-1">
              {naghaCount}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Deliveries paused today
            </span>
          </div>
        </div>
      </div>

      {/* METRIC ROW 2: FINANCIAL PULSE */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          Today Financial Pulse &amp; Cash Flow
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Today's Sales Revenue */}
          <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
              Today Sales Revenue
            </span>
            <p className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1">
              {formatCurrency(totalSalesRevenue)}
            </p>
            <span className="text-[11px] text-emerald-600 mt-0.5 block">
              Daily customer charges
            </span>
          </div>

          {/* Today's Farm Costs */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Today Farm Costs
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">
              {formatCurrency(totalFarmCost)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Bulk milk purchase
            </span>
          </div>

          {/* Today's Operating Expenses */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Today Expenses
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-1">
              {formatCurrency(totalDayExpenses)}
            </p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Fuel, maintenance, staff
            </span>
          </div>

          {/* Today Recovered Cash */}
          <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
            <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider block">
              Recovered Cash Today
            </span>
            <p className="text-2xl sm:text-3xl font-black text-sky-950 mt-1">
              {formatCurrency(totalRecoveredCash)}
            </p>
            <span className="text-[11px] text-sky-600 mt-0.5 block">
              {todayPayments.length} payments collected
            </span>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN LOWER SECTION: TODAY'S DELIVERIES FEED & QUICK SYSTEM ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Active Deliveries Feed */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-600" />
              Today Route Deliveries ({todaySales.length} Logged)
            </h3>
            <Link href="/daily-entry">
              <Button variant="ghost" size="sm" className="text-xs text-sky-600 h-7">
                Open Batch Entry <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          {todaySales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs text-slate-500">
                No deliveries recorded yet for today ({formatDateDisplay(todayStr)}).
              </p>
              <Link href="/daily-entry" className="mt-3 inline-block">
                <Button variant="dairy" size="sm">
                  Record Deliveries Now
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100 text-xs">
                {todaySales.map((sale) => (
                  <div
                    key={sale.id}
                    className={`p-3.5 flex items-center justify-between transition-colors ${
                      sale.is_nagha ? "bg-rose-50/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          sale.is_nagha
                            ? "bg-rose-100 text-rose-700"
                            : "bg-sky-100 text-sky-700"
                        }`}
                      >
                        <Milk className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {sale.customer?.name || "Customer"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {sale.customer?.phone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      {sale.is_nagha ? (
                        <Badge variant="nagha" className="text-[10px]">
                          Nagha
                        </Badge>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {formatKg(sale.qty_kg)}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            {formatCurrency(sale.total_amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Outstanding Receivables & Quick Nav */}
        <div className="space-y-4">
          {/* Outstanding Recovery Alert Card */}
          <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                Total Pending Recovery
              </span>
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-700">
              {formatCurrency(totalOutstandingBalance)}
            </p>
            <p className="text-xs text-slate-600 leading-snug">
              Outstanding balance across all registered customer accounts.
            </p>
            <Link href="/reports?tab=recovery" className="block pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs border-rose-300 text-rose-700 hover:bg-rose-100/60"
              >
                View Debtors & Send Reminders
              </Button>
            </Link>
          </div>

          {/* Quick Route Shortcuts */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Quick Shortcuts
            </h4>

            <Link
              href="/customers"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-sky-600" />
                <span>Customer Directory & Ledgers</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            <Link
              href="/purchases"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-sky-600" />
                <span>Farm Milk Intake & Suppliers</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            <Link
              href="/expenses"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-rose-600" />
                <span>Log Bike Petrol & Expenses</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>

            <Link
              href="/reports"
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>Monthly Invoices & P&L</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        customers={customers}
        onSavePayment={handleSavePayment}
      />
    </div>
  );
}
