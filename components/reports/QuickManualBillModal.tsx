"use client";

import * as React from "react";
import { Download, FileText, Loader2, Printer } from "lucide-react";
import { Customer } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatKg, getTodayDateString } from "@/lib/utils";
import { DataStore } from "@/lib/store";
import { openPdfPrintWindow, printPdfDocument } from "@/lib/printPdf";
import { toast } from "@/components/ui/toast";
import {
  QuickManualBill,
  QuickManualBillPDFDocument,
} from "./QuickManualBillPDFDocument";

interface QuickManualBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  initialCustomerId: string;
}

const parseAmount = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export function QuickManualBillModal({
  open,
  onOpenChange,
  customers,
  initialCustomerId,
}: QuickManualBillModalProps) {
  const [customerId, setCustomerId] = React.useState(initialCustomerId);
  const [regularQty, setRegularQty] = React.useState("");
  const [extraQty, setExtraQty] = React.useState("");
  const [rate, setRate] = React.useState("");
  const [previousBalance, setPreviousBalance] = React.useState("");
  const [payments, setPayments] = React.useState("");
  const [downloading, setDownloading] = React.useState(false);
  const [printing, setPrinting] = React.useState(false);
  const [pendingBill, setPendingBill] = React.useState<QuickManualBill | null>(null);
  const [pendingDate, setPendingDate] = React.useState<string | null>(null);
  const [deliverySaved, setDeliverySaved] = React.useState(false);
  const [paymentSaved, setPaymentSaved] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const regularQtyKg = parseAmount(regularQty);
  const extraQtyKg = parseAmount(extraQty);
  const ratePerKg = parseAmount(rate);
  const totalQtyKg = regularQtyKg + extraQtyKg;
  const totalAmount = Math.round(totalQtyKg * ratePerKg * 100) / 100;
  const previousBalanceAmount = parseAmount(previousBalance);
  const paymentsAmount = parseAmount(payments);
  const netPayable =
    previousBalanceAmount + totalAmount - paymentsAmount;

  React.useEffect(() => {
    if (!open) return;
    const nextCustomerId =
      customers.find((customer) => customer.id === initialCustomerId)?.id ??
      customers[0]?.id ??
      "";
    setCustomerId(nextCustomerId);
    setRegularQty("");
    setExtraQty("");
    setPreviousBalance("");
    setPayments("");
    setPendingBill(null);
    setPendingDate(null);
    setDeliverySaved(false);
    setPaymentSaved(false);
    setErrorMessage(null);
    const customer = customers.find((item) => item.id === nextCustomerId);
    setRate(customer ? String(customer.fixed_rate_per_kg) : "");
  }, [open, initialCustomerId]);

  const handleCustomerChange = (nextCustomerId: string) => {
    setCustomerId(nextCustomerId);
    const customer = customers.find((item) => item.id === nextCustomerId);
    setRate(customer ? String(customer.fixed_rate_per_kg) : "");
  };

  const handleGenerate = async (output: "download" | "print") => {
    if (!selectedCustomer && !pendingBill) return;
    setErrorMessage(null);
    let printWindow: Window | undefined;
    try {
      if (!pendingBill) {
        const amounts = [regularQty, extraQty, rate, previousBalance, payments];
        const hasInvalidAmount = amounts.some(
          (value) =>
            value.trim() !== "" &&
            (!Number.isFinite(Number(value)) || Number(value) < 0)
        );
        if (hasInvalidAmount) {
          throw new Error("Bill quantities, rate, balance, and payments must be non-negative numbers.");
        }
        if (totalQtyKg > 0 && ratePerKg <= 0) {
          throw new Error("Enter a rate greater than zero for milk quantities.");
        }
      }

      const bill: QuickManualBill | null =
        pendingBill ??
        (selectedCustomer
          ? {
              customer: selectedCustomer,
              regularQtyKg,
              extraQtyKg,
              ratePerKg,
              previousBalance: previousBalanceAmount,
              payments: paymentsAmount,
              totalQtyKg,
              totalAmount,
              netPayable,
            }
          : null);
      if (!bill) return;
      const billDate = pendingDate ?? getTodayDateString();
      const printTitle = `Quick Manual Bill - ${bill.customer.name}`;
      if (output === "print") {
        printWindow = openPdfPrintWindow(printTitle);
      }

      if (output === "print") setPrinting(true);
      else setDownloading(true);

      setPendingBill(bill);
      setPendingDate(billDate);

      if (!deliverySaved) {
        if (bill.totalQtyKg > 0) {
          const existingSale = (await DataStore.getDailySalesByDate(billDate)).find(
            (sale) => sale.customer_id === bill.customer.id
          );
          const combinedQty =
            (existingSale && !existingSale.is_nagha ? Number(existingSale.qty_kg) : 0) +
            bill.totalQtyKg;
          const combinedAmount =
            Number(existingSale?.total_amount ?? 0) + bill.totalAmount;

          await DataStore.saveBatchDailySales([
            {
              customer_id: bill.customer.id,
              entry_date: billDate,
              qty_kg: combinedQty,
              is_nagha: false,
              custom_rate:
                combinedQty > 0
                  ? Math.round((combinedAmount / combinedQty) * 100) / 100
                  : bill.ratePerKg,
              total_amount: combinedAmount,
            },
          ]);
        }
        setDeliverySaved(true);
      }

      if (!paymentSaved) {
        if (bill.payments > 0) {
          await DataStore.saveCustomerPayment({
            customer_id: bill.customer.id,
            payment_date: billDate,
            amount_paid: bill.payments,
            payment_mode: "Cash",
            notes: "Payment recorded with quick manual bill",
          });
        }
        setPaymentSaved(true);
      }

      if (output === "print") {
        await printPdfDocument(
          <QuickManualBillPDFDocument bill={bill} />,
          printTitle,
          printWindow
        );
      } else {
        const { pdf } = await import("@react-pdf/renderer");
        const blob = await pdf(<QuickManualBillPDFDocument bill={bill} />).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Quick_Manual_Bill_${bill.customer.name.replace(/\s+/g, "_")}_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      toast.success(
        output === "print"
          ? "Quick manual bill saved and sent to print."
          : "Quick manual bill saved and PDF generated."
      );
      onOpenChange(false);
    } catch (error) {
      printWindow?.close();
      console.error("Failed to save or generate quick manual bill", error);
      const message =
        error instanceof Error ? error.message : "Failed to save or generate quick bill.";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setDownloading(false);
      setPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <div className="mb-1 flex items-center gap-2 text-sky-600">
            <FileText className="h-5 w-5" />
            <DialogTitle>Quick Manual Bill</DialogTitle>
          </div>
          <DialogDescription>
            Enter summary quantities and balances to generate a concise PDF bill.
          </DialogDescription>
        </DialogHeader>

        {errorMessage && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        {pendingBill && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {deliverySaved
              ? "Delivery totals are saved."
              : "Saving delivery totals..."}
            {pendingBill.payments > 0
              ? paymentSaved
                ? " Payment is saved."
                : " Payment will be saved before the PDF is generated."
              : ""}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            Customer
            <Select
              className="mt-1.5"
              value={customerId}
              onChange={(event) => handleCustomerChange(event.target.value)}
              disabled={customers.length === 0 || Boolean(pendingBill)}
            >
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.phone ? ` (${customer.phone})` : ""}
                </option>
              ))}
            </Select>
          </label>

          <label className="text-xs font-semibold text-slate-700">
            Regular Milk Quantity (KG)
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={regularQty}
              onChange={(event) => setRegularQty(event.target.value)}
              placeholder="0.00"
              disabled={Boolean(pendingBill)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Extra Milk Quantity (KG) <span className="font-normal text-slate-400">Optional</span>
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={extraQty}
              onChange={(event) => setExtraQty(event.target.value)}
              placeholder="0.00"
              disabled={Boolean(pendingBill)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Standard Rate per KG (Rs.)
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              disabled={Boolean(pendingBill)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Previous Unpaid Balance (Rs.) <span className="font-normal text-slate-400">Optional</span>
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={previousBalance}
              onChange={(event) => setPreviousBalance(event.target.value)}
              placeholder="0.00"
              disabled={Boolean(pendingBill)}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
            Payments Made (Rs.) <span className="font-normal text-slate-400">Optional</span>
            <Input
              className="mt-1.5"
              type="number"
              min="0"
              step="0.01"
              value={payments}
              onChange={(event) => setPayments(event.target.value)}
              placeholder="0.00"
              disabled={Boolean(pendingBill)}
            />
          </label>
        </div>

        <div className="mt-4 space-y-2 rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Total Milk</span>
            <span className="font-semibold text-slate-900">{formatKg(totalQtyKg)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Milk Amount ({formatKg(totalQtyKg)} × {formatCurrency(ratePerKg)}/KG)</span>
            <span className="font-semibold text-slate-900">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Net Payable</span>
            <span className="text-sm font-bold text-rose-700">
              {formatCurrency(netPayable)}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGenerate("print")}
            disabled={(!selectedCustomer && !pendingBill) || downloading || printing}
            className="gap-2"
          >
            {printing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {printing ? "Preparing..." : "Print PDF"}
          </Button>
          <Button
            variant="dairy"
            onClick={() => handleGenerate("download")}
            disabled={(!selectedCustomer && !pendingBill) || downloading || printing}
            className="gap-2"
          >
            {downloading || printing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading || printing
              ? "Saving & Generating PDF..."
              : pendingBill
                ? "Retry Save / Generate PDF"
                : "Save & Generate Quick Bill PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
