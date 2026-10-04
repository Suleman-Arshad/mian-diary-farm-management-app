"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  AlertCircle,
  Milk,
  Share2,
} from "lucide-react";
import {
  Customer,
  DailySale,
  DailyPurchase,
  DailyExpense,
  MonthlyBillSummary,
} from "@/types/database";
import { DataStore } from "@/lib/store";
import {
  formatCurrency,
  formatKg,
  getCurrentMonthString,
  formatDateDisplay,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InvoiceModal } from "@/components/reports/InvoiceModal";
import { WhatsAppShareButton } from "@/components/reports/WhatsAppShareButton";
import { OutstandingRecoveryTable } from "@/components/reports/OutstandingRecoveryTable";
import { ProfitLossStatement } from "@/components/reports/ProfitLossStatement";
import { PaymentDialog } from "@/components/customers/PaymentDialog";
import { PaymentFormValues } from "@/lib/validations";

function ReportsContent() {
  const searchParams = useSearchParams();
  const queryCustId = searchParams.get("customerId");

  const [activeTab, setActiveTab] = React.useState("bill");
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [sales, setSales] = React.useState<DailySale[]>([]);
  const [purchases, setPurchases] = React.useState<DailyPurchase[]>([]);
  const [expenses, setExpenses] = React.useState<DailyExpense[]>([]);

  // Bill calculator state
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string>("");
  const [selectedMonth, setSelectedMonth] = React.useState<string>(getCurrentMonthString());
  const [billSummary, setBillSummary] = React.useState<MonthlyBillSummary | null>(null);

  // Modals
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [paymentTargetCustId, setPaymentTargetCustId] = React.useState<string | undefined>();

  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [custList, salesList, purList, expList] = await Promise.all([
        DataStore.getCustomers(),
        DataStore.getAllDailySales(),
        DataStore.getDailyPurchases(),
        DataStore.getDailyExpenses(),
      ]);
      setCustomers(custList);
      setSales(salesList);
      setPurchases(purList);
      setExpenses(expList);

      const targetId = queryCustId || custList[0]?.id || "";
      setSelectedCustomerId(targetId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [queryCustId]);

  React.useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("milk-store-updated", handleUpdate);
    return () => window.removeEventListener("milk-store-updated", handleUpdate);
  }, [loadData]);

  // Recalculate bill whenever customer or month changes
  React.useEffect(() => {
    if (selectedCustomerId && selectedMonth) {
      DataStore.getMonthlyBill(selectedCustomerId, selectedMonth).then((res) => {
        setBillSummary(res);
      });
    }
  }, [selectedCustomerId, selectedMonth]);

  const handleSavePayment = async (values: PaymentFormValues) => {
    await DataStore.saveCustomerPayment({
      customer_id: values.customer_id,
      payment_date: values.payment_date,
      amount_paid: values.amount_paid,
      payment_mode: values.payment_mode,
      notes: values.notes,
    });
    await loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-sky-600" />
            Billing, Reports & Accounting
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated monthly billing, client-side PDF export, WhatsApp sharing, outstanding recovery, and P&L.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="bill" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bill">Monthly Bill & PDF</TabsTrigger>
          <TabsTrigger value="recovery">Outstanding Recovery</TabsTrigger>
          <TabsTrigger value="pnl">Profit & Loss (P&L)</TabsTrigger>
        </TabsList>

        {/* TAB 1: MONTHLY BILL CALCULATOR */}
        <TabsContent value="bill" className="space-y-6">
          {/* Controls: Select Customer & Month */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Select Customer:
              </label>
              <Select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Select Billing Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {billSummary ? (
            <div className="space-y-6">
              {/* Bill Overview Cards */}
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-sky-50/30 p-5 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-sky-100">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                      Monthly Invoice Calculator
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                      {billSummary.customer.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Billing Cycle: <span className="font-semibold text-slate-700">{billSummary.monthName}</span> | Rate: <span className="font-semibold text-slate-700">Rs. {billSummary.customer.fixed_rate_per_kg}/KG</span>
                    </p>
                  </div>

                  {/* Actions: Download PDF & WhatsApp */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="dairy"
                      className="gap-2 shadow-sm"
                      onClick={() => setInvoiceModalOpen(true)}
                    >
                      <Download className="h-4 w-4" />
                      <span>Download PDF Bill</span>
                    </Button>

                    <WhatsAppShareButton bill={billSummary} />
                  </div>
                </div>

                {/* Arithmetic Breakdown */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 block">
                      1. Total Milk Supplied
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
                      {formatKg(billSummary.totalQtyKg)}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Across {billSummary.deliveries.length} days
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 block">
                      2. Milk Charges
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-sky-700 mt-1">
                      {formatCurrency(billSummary.totalMilkCost)}
                    </p>
                    <span className="text-[11px] text-sky-600 mt-0.5 block">
                      Current month sales
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 block">
                      3. Previous Balance
                    </span>
                    <p className="text-xl sm:text-2xl font-bold text-slate-700 mt-1">
                      {formatCurrency(billSummary.previousBalance)}
                    </p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      Brought forward
                    </span>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 shadow-sm">
                    <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
                      4. Total Net Due
                    </span>
                    <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                      {formatCurrency(billSummary.netPayableAmount)}
                    </p>
                    <span className="text-[11px] text-rose-600 mt-0.5 block">
                      Less payments ({formatCurrency(billSummary.totalPayments)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Deliveries Log Table */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Milk className="h-4 w-4 text-sky-600" />
                    Itemized Daily Delivery Log for {billSummary.monthName}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {billSummary.deliveries.length} days logged
                  </span>
                </div>

                {billSummary.deliveries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No deliveries logged for this customer in {billSummary.monthName}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Quantity (KG)</th>
                          <th className="p-3">Rate / KG</th>
                          <th className="p-3 text-right">Day Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {billSummary.deliveries.map((d) => (
                          <tr key={d.id} className={d.is_nagha ? "bg-rose-50/40" : ""}>
                            <td className="p-3 font-medium text-slate-700">
                              {formatDateDisplay(d.entry_date)}
                            </td>
                            <td className="p-3">
                              {d.is_nagha ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                                  Nagha (Absent)
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                  Delivered
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-slate-900">
                              {d.is_nagha ? "0.00 KG" : formatKg(d.qty_kg)}
                            </td>
                            <td className="p-3 text-slate-600">
                              Rs. {d.custom_rate || billSummary.customer.fixed_rate_per_kg}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900">
                              {formatCurrency(d.total_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">
              Select a customer to compute monthly bill.
            </div>
          )}
        </TabsContent>

        {/* TAB 2: OUTSTANDING RECOVERY */}
        <TabsContent value="recovery">
          <OutstandingRecoveryTable
            customers={customers}
            onCollectPayment={(custId) => {
              setPaymentTargetCustId(custId);
              setPaymentModalOpen(true);
            }}
          />
        </TabsContent>

        {/* TAB 3: PROFIT & LOSS */}
        <TabsContent value="pnl">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Accounting Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300"
            />
          </div>
          <ProfitLossStatement
            monthStr={selectedMonth}
            sales={sales}
            purchases={purchases}
            expenses={expenses}
          />
        </TabsContent>
      </Tabs>

      {/* Invoice Modal for PDF Download */}
      <InvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        bill={billSummary}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        customers={customers}
        preselectedCustomerId={paymentTargetCustId}
        onSavePayment={handleSavePayment}
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
