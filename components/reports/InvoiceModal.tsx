"use client";

import * as React from "react";
import { MonthlyBillSummary } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatKg, formatDateDisplay } from "@/lib/utils";
import { FileText, Download, CheckCircle2, Loader2 } from "lucide-react";
import { InvoicePDFDocument } from "./InvoicePDFDocument";

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: MonthlyBillSummary | null;
}

export function InvoiceModal({ open, onOpenChange, bill }: InvoiceModalProps) {
  const [downloading, setDownloading] = React.useState(false);

  if (!bill) return null;

  const fileName = `Milk_Bill_${bill.customer.name.replace(/\s+/g, "_")}_${bill.month}.pdf`;

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      // Dynamically import pdf from @react-pdf/renderer on client
      const { pdf } = await import("@react-pdf/renderer");
      const blob = await pdf(<InvoicePDFDocument bill={bill} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Error generating PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            <FileText className="h-5 w-5" />
            <DialogTitle>Monthly Milk Bill & Invoice</DialogTitle>
          </div>
          <DialogDescription>
            {bill.customer.name} - Billing Cycle: {bill.monthName}
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Preview Card */}
        <div className="space-y-4 pt-2">
          {/* Customer & Billing Meta */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold uppercase tracking-wider block">Customer</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{bill.customer.name}</p>
              <p className="text-slate-600 mt-0.5">{bill.customer.phone}</p>
              {bill.customer.address && <p className="text-slate-500">{bill.customer.address}</p>}
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-semibold uppercase tracking-wider block">Standard Rate</span>
              <p className="text-sm font-bold text-sky-700 mt-0.5">Rs. {bill.customer.fixed_rate_per_kg}/KG</p>
              <p className="text-slate-500 mt-1">Total Milk: <span className="font-semibold text-slate-800">{formatKg(bill.totalQtyKg)}</span></p>
            </div>
          </div>

          {/* Breakdown calculation */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Previous Unpaid Balance:</span>
              <span className="font-bold text-slate-800">{formatCurrency(bill.previousBalance)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Current Month Milk Charges ({formatKg(bill.totalQtyKg)}):</span>
              <span className="font-bold text-slate-800">{formatCurrency(bill.totalMilkCost)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-600">Payments Made this Month:</span>
              <span className="font-bold text-emerald-600">-{formatCurrency(bill.totalPayments)}</span>
            </div>
            <div className="flex justify-between pt-2 text-sm font-bold">
              <span className="text-slate-900">Total Net Amount Payable:</span>
              <span className="text-rose-600 text-base">{formatCurrency(bill.netPayableAmount)}</span>
            </div>
          </div>

          {/* Recent itemized deliveries snippet */}
          <div>
            <span className="text-xs font-semibold text-slate-700 mb-2 block">
              Deliveries Included ({bill.deliveries.length} entries):
            </span>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Quantity</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bill.deliveries.map((d) => (
                    <tr key={d.id} className={d.is_nagha ? "bg-rose-50/40" : ""}>
                      <td className="p-2 text-slate-700">{formatDateDisplay(d.entry_date)}</td>
                      <td className="p-2">
                        {d.is_nagha ? (
                          <span className="text-[10px] text-rose-700 font-bold uppercase">Nagha</span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-medium">Delivered</span>
                        )}
                      </td>
                      <td className="p-2 font-semibold">
                        {d.is_nagha ? "0.00 KG" : formatKg(d.qty_kg)}
                      </td>
                      <td className="p-2 text-right font-bold text-slate-800">
                        {formatCurrency(d.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {/* Imperative PDF Download Button */}
          <Button
            variant="dairy"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{downloading ? "Generating PDF..." : "Download PDF Invoice"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
