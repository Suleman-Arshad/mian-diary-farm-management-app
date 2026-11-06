"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
  Download,
  Loader2,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { MonthlyBillSummary } from "@/types/database";
import { DataStore } from "@/lib/store";
import { formatCurrency, formatDateDisplay, getCurrentMonthString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/customers/PaymentDialog";
import { InvoiceModal } from "@/components/reports/InvoiceModal";
import { PaymentFormValues } from "@/lib/validations";
import { toast } from "@/components/ui/toast";

export default function PaymentReceiptsPage() {
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthString());
  const [bills, setBills] = React.useState<MonthlyBillSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [paymentBill, setPaymentBill] = React.useState<MonthlyBillSummary | null>(null);
  const [invoiceBill, setInvoiceBill] = React.useState<MonthlyBillSummary | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = React.useState(false);
  const loadRequestId = React.useRef(0);

  const loadBills = React.useCallback(async () => {
    const requestId = ++loadRequestId.current;
    try {
      setLoading(true);
      setErrorMessage(null);
      const monthlyBills = await DataStore.getMonthlyBills(selectedMonth);
      if (requestId === loadRequestId.current) setBills(monthlyBills);
    } catch (error) {
      console.error("Failed to load monthly payment receipts", error);
      if (requestId === loadRequestId.current) {
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load monthly bills."
        );
      }
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [selectedMonth]);

  React.useEffect(() => {
    void loadBills();
    const handleUpdate = () => void loadBills();
    window.addEventListener("milk-store-updated", handleUpdate);
    return () => window.removeEventListener("milk-store-updated", handleUpdate);
  }, [loadBills]);

  const paymentCustomers = React.useMemo(
    () => (paymentBill ? [paymentBill.customer] : []),
    [paymentBill]
  );
  const totalOutstanding = bills.reduce(
    (sum, bill) => sum + bill.outstandingBalance,
    0
  );
  const totalReceived = bills.reduce((sum, bill) => sum + bill.totalPayments, 0);

  const handleSavePayment = async (values: PaymentFormValues) => {
    if (!paymentBill) return;
    await DataStore.saveCustomerPayment({
      customer_id: values.customer_id,
      payment_date: values.payment_date,
      billing_month: selectedMonth,
      amount_paid: values.amount_paid,
      payment_mode: values.payment_mode,
      notes: values.notes,
    });
    await loadBills();
    toast.success(`Payment receipt recorded for ${paymentBill.customer.name}.`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <ReceiptText className="h-6 w-6 text-sky-600" />
            Payment Receipts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track each customer&apos;s monthly bill, partial payments, and remaining balance.
          </p>
        </div>
        <label className="block w-full sm:w-56">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">
            Billing month
          </span>
          <span className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </span>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active customers
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{bills.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payments allocated to billing month
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {formatCurrency(totalReceived)}
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Total remaining
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-700">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Monthly customer ledger</h2>
            <p className="text-xs text-slate-500">
              Payments are allocated to the selected billing month, regardless of payment date.
            </p>
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-sky-600" />}
        </div>

        {errorMessage ? (
          <div className="p-8 text-center text-sm text-rose-700">{errorMessage}</div>
        ) : loading && bills.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading monthly bills...</div>
        ) : bills.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No active customers found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Brought forward</th>
                  <th className="px-4 py-3 text-right">Month charges</th>
                  <th className="px-4 py-3 text-right">Payments</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3">Payment history</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((bill) => (
                  <tr key={bill.customer.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{bill.customer.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {bill.customer.phone || "No phone number"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right text-slate-700">
                      {formatCurrency(bill.previousBalance)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-800">
                      {formatCurrency(bill.totalMilkCost)}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-emerald-700">
                      {formatCurrency(bill.totalPayments)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={bill.outstandingBalance > 0 ? "font-bold text-rose-700" : "font-bold text-emerald-700"}>
                        {formatCurrency(bill.outstandingBalance)}
                      </span>
                    </td>
                    <td className="max-w-[260px] px-4 py-4">
                      {bill.payments.length ? (
                        <ul className="space-y-1.5">
                          {bill.payments.map((payment) => (
                            <li key={payment.id} className="text-xs text-slate-600">
                              <span className="font-semibold text-slate-800">
                                {formatCurrency(payment.amount_paid)}
                              </span>{" "}
                              · {formatDateDisplay(payment.payment_date)} · {payment.payment_mode}
                              {payment.notes ? <span className="block truncate text-slate-500">{payment.notes}</span> : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400">No payments recorded</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => {
                            setInvoiceBill(bill);
                            setInvoiceModalOpen(true);
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Bill PDF
                        </Button>
                        {bill.outstandingBalance > 0 ? (
                          <Button
                            size="sm"
                            variant="success"
                            className="gap-1.5"
                            onClick={() => {
                              setPaymentBill(bill);
                              setPaymentModalOpen(true);
                            }}
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Receive
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 self-center text-xs font-semibold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Paid
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PaymentDialog
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        customers={paymentCustomers}
        preselectedCustomerId={paymentBill?.customer.id}
        billingMonth={selectedMonth}
        balanceDue={paymentBill?.outstandingBalance}
        onSavePayment={handleSavePayment}
      />
      <InvoiceModal
        open={invoiceModalOpen}
        onOpenChange={setInvoiceModalOpen}
        bill={invoiceBill}
      />
    </div>
  );
}
