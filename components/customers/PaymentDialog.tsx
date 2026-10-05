"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema, PaymentFormValues } from "@/lib/validations";
import { Customer } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getTodayDateString, formatCurrency } from "@/lib/utils";
import { Wallet, AlertCircle } from "lucide-react";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  preselectedCustomerId?: string;
  onSavePayment: (values: PaymentFormValues) => Promise<void>;
}

export function PaymentDialog({
  open,
  onOpenChange,
  customers,
  preselectedCustomerId,
  onSavePayment,
}: PaymentDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      customer_id: preselectedCustomerId || "",
      payment_date: getTodayDateString(),
      amount_paid: 0,
      payment_mode: "Cash",
      notes: "",
    },
  });

  const selectedCustomerId = watch("customer_id");
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  React.useEffect(() => {
    if (open) {
      reset({
        customer_id: preselectedCustomerId || (customers[0]?.id ?? ""),
        payment_date: getTodayDateString(),
        amount_paid: 0,
        payment_mode: "Cash",
        notes: "",
      });
      setErrorMsg(null);
    }
  }, [open, preselectedCustomerId, customers, reset]);

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const customer_id = String(values.customer_id).trim();
      if (!customer_id) {
        throw new Error("Customer foreign key is required to record a payment.");
      }

      await onSavePayment({
        ...values,
        customer_id,
        amount_paid: parseFloat(String(values.amount_paid)),
      });
      onOpenChange(false);
    } catch (err: any) {
      if (err) console.error("Supabase Error:", err);
      setErrorMsg(err?.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <Wallet className="h-5 w-5" />
            <DialogTitle>Record Customer Payment</DialogTitle>
          </div>
          <DialogDescription>
            Log a recovery payment to deduct from customer ledger balance.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="my-2 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_id">Select Customer *</Label>
            <Select id="customer_id" {...register("customer_id")}>
              <option value="" disabled>
                -- Choose Customer --
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </Select>
            {errors.customer_id && (
              <p className="text-xs text-rose-600">{errors.customer_id.message}</p>
            )}
          </div>

          {/* Current balance indicator */}
          {selectedCustomer && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-600">Fixed Rate: Rs. {selectedCustomer.fixed_rate_per_kg}/KG</span>
              <span className="font-semibold text-slate-800">
                Opening Balance: {formatCurrency(selectedCustomer.previous_balance)}
              </span>
            </div>
          )}

          {/* Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input id="payment_date" type="date" {...register("payment_date")} />
              {errors.payment_date && (
                <p className="text-xs text-rose-600">{errors.payment_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount_paid">Amount Paid (Rs.) *</Label>
              <Input
                id="amount_paid"
                type="number"
                step="10"
                min="1"
                placeholder="2000"
                {...register("amount_paid")}
              />
              {errors.amount_paid && (
                <p className="text-xs text-rose-600">{errors.amount_paid.message}</p>
              )}
            </div>
          </div>

          {/* Payment Mode */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_mode">Payment Method *</Label>
            <Select id="payment_mode" {...register("payment_mode")}>
              <option value="Cash">Cash (In-Hand)</option>
              <option value="EasyPaisa/JazzCash">EasyPaisa / JazzCash</option>
              <option value="Bank Transfer">Bank Transfer / Online</option>
            </Select>
            {errors.payment_mode && (
              <p className="text-xs text-rose-600">{errors.payment_mode.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Transaction Reference</Label>
            <Input
              id="notes"
              placeholder="e.g. Paid in cash to delivery boy, or JazzCash TID"
              {...register("notes")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={submitting}>
              {submitting ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
