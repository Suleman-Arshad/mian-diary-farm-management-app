"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Wallet,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Milk,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { Customer, LedgerTransaction } from "@/types/database";
import { DataStore } from "@/lib/store";
import { formatCurrency, formatKg, formatDateDisplay } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PaymentDialog } from "@/components/customers/PaymentDialog";
import { PaymentFormValues } from "@/lib/validations";
import { toast } from "@/components/ui/toast";

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const router = useRouter();

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [allCustomers, setAllCustomers] = React.useState<Customer[]>([]);
  const [transactions, setTransactions] = React.useState<LedgerTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = React.useState(0);
  const [totalDeliveriesCost, setTotalDeliveriesCost] = React.useState(0);
  const [totalPaid, setTotalPaid] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);

  const loadLedger = React.useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const [ledgerData, customersList] = await Promise.all([
        DataStore.getCustomerLedger(customerId),
        DataStore.getCustomers(),
      ]);
      setCustomer(ledgerData.customer);
      setTransactions(ledgerData.transactions);
      setCurrentBalance(ledgerData.currentBalance);
      setTotalDeliveriesCost(ledgerData.totalDeliveriesCost);
      setTotalPaid(ledgerData.totalPaid);
      setAllCustomers(customersList);
    } catch (err) {
      console.error("Failed to load customer ledger", err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    loadLedger();
    const handleUpdate = () => loadLedger();
    window.addEventListener("milk-store-updated", handleUpdate);
    return () => window.removeEventListener("milk-store-updated", handleUpdate);
  }, [loadLedger]);

  const handleSavePayment = async (values: PaymentFormValues) => {
    try {
      const customer_id = String(values.customer_id).trim();
      if (!customer_id) {
        throw new Error("Customer foreign key is required to record a payment.");
      }
      await DataStore.saveCustomerPayment({
        customer_id,
        payment_date: values.payment_date,
        amount_paid: parseFloat(String(values.amount_paid)),
        payment_mode: values.payment_mode,
        notes: values.notes,
      });
      await loadLedger();
      toast.success("Payment recorded successfully!");
    } catch (error: any) {
      if (error) console.error("Supabase Error:", error);
      const msg = error?.message || "Failed to record payment to database.";
      toast.error(msg);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">Customer Not Found</h2>
        <p className="mt-1 text-sm text-slate-500">
          The requested customer could not be found or has been removed.
        </p>
        <Link href="/customers" className="mt-4 inline-block">
          <Button variant="outline">Back to Customers List</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="outline" size="iconSm" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {customer.name}
              </h1>
              {customer.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                {customer.phone}
              </span>
              {customer.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {customer.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="success"
            className="gap-1.5 shadow-sm text-xs sm:text-sm"
            onClick={() => setPaymentModalOpen(true)}
          >
            <Wallet className="h-4 w-4" />
            <span>Receive Payment</span>
          </Button>

          <Link href={`/reports?customerId=${customer.id}`}>
            <Button variant="outline" className="gap-1.5 text-xs sm:text-sm">
              <FileSpreadsheet className="h-4 w-4 text-sky-600" />
              <span>Generate Monthly Bill</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Current Net Balance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Current Outstanding Balance
          </span>
          <p
            className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
              currentBalance > 0 ? "text-rose-600" : "text-emerald-600"
            }`}
          >
            {formatCurrency(currentBalance)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {currentBalance > 0 ? "Pending collection" : "Account settled"}
          </span>
        </div>

        {/* Rate / KG */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Fixed Milk Rate
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Rs. {customer.fixed_rate_per_kg}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Per Kilogram (Default)</span>
        </div>

        {/* Total Deliveries Cost */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Milk Delivered
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-sky-700 mt-1">
            {formatCurrency(totalDeliveriesCost)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Charges billed</span>
        </div>

        {/* Total Payments Collected */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Payments Made
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
            {formatCurrency(totalPaid)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Recovered cash</span>
        </div>
      </div>

      {/* Ledger History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-sky-600" />
              Customer Transaction Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Chronological log of milk deliveries, absences (Nagha), and cash receipts.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
            {transactions.length} records
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No entries recorded for this customer yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction Details</TableHead>
                <TableHead>Milk Qty</TableHead>
                <TableHead>Debit (Billed)</TableHead>
                <TableHead>Credit (Paid)</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium whitespace-nowrap text-xs text-slate-700">
                    {formatDateDisplay(tx.date)}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tx.type === "PAYMENT" ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                          <ArrowDownRight className="h-4 w-4" />
                        </div>
                      ) : tx.description.includes("Nagha") ? (
                        <Badge variant="nagha" className="text-[10px]">Nagha</Badge>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100 text-sky-700 shrink-0">
                          <Milk className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <span className="text-xs text-slate-800 font-medium">
                        {tx.description}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="text-xs">
                    {tx.qty_kg !== undefined ? (
                      tx.qty_kg > 0 ? (
                        <span className="font-semibold text-slate-800">
                          {formatKg(tx.qty_kg)}
                        </span>
                      ) : (
                        <span className="text-slate-400">0.00 KG</span>
                      )
                    ) : (
                      "-"
                    )}
                  </TableCell>

                  {/* Debit (Customer is charged) */}
                  <TableCell className="text-xs">
                    {tx.debit > 0 ? (
                      <span className="font-semibold text-rose-600">
                        +{formatCurrency(tx.debit)}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>

                  {/* Credit (Customer paid) */}
                  <TableCell className="text-xs">
                    {tx.credit > 0 ? (
                      <span className="font-semibold text-emerald-600">
                        -{formatCurrency(tx.credit)}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </TableCell>

                  {/* Running Balance */}
                  <TableCell className="text-right text-xs">
                    <span
                      className={`font-bold ${
                        tx.running_balance > 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {formatCurrency(tx.running_balance)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        customers={allCustomers}
        preselectedCustomerId={customer.id}
        onSavePayment={handleSavePayment}
      />
    </div>
  );
}
