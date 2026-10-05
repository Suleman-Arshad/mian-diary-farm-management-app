"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { purchaseSchema, PurchaseFormValues } from "@/lib/validations";
import { Supplier } from "@/types/database";
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
import { Milk, AlertCircle } from "lucide-react";

interface PurchaseEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  onSavePurchase: (values: PurchaseFormValues) => Promise<void>;
}

export function PurchaseEntryDialog({
  open,
  onOpenChange,
  suppliers,
  onSavePurchase,
}: PurchaseEntryDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplier_id: "",
      purchase_date: getTodayDateString(),
      qty_kg: 0,
      rate_per_kg: 160,
    },
  });

  const selectedSupplierId = watch("supplier_id");
  const qty = watch("qty_kg") || 0;
  const rate = watch("rate_per_kg") || 0;
  const estimatedCost = Number(qty) * Number(rate);

  // Auto-fill rate when supplier changes
  React.useEffect(() => {
    if (selectedSupplierId) {
      const sup = suppliers.find((s) => s.id === selectedSupplierId);
      if (sup) {
        setValue("rate_per_kg", Number(sup.purchase_rate_per_kg));
      }
    }
  }, [selectedSupplierId, suppliers, setValue]);

  React.useEffect(() => {
    if (open) {
      const defaultSupplier = suppliers[0];
      reset({
        supplier_id: defaultSupplier?.id || "",
        purchase_date: getTodayDateString(),
        qty_kg: 0,
        rate_per_kg: defaultSupplier ? Number(defaultSupplier.purchase_rate_per_kg) : 160,
      });
      setErrorMsg(null);
    }
  }, [open, suppliers, reset]);

  const onSubmit = async (values: PurchaseFormValues) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);

      const supplier_id = String(values.supplier_id).trim();
      if (!supplier_id) {
        throw new Error("Supplier foreign key is required to record intake.");
      }

      await onSavePurchase({
        ...values,
        supplier_id,
        qty_kg: parseFloat(String(values.qty_kg)),
        rate_per_kg: parseFloat(String(values.rate_per_kg)),
      });
      onOpenChange(false);
    } catch (err: any) {
      if (err) console.error("Supabase Error:", err);
      setErrorMsg(err?.message || "Failed to record purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            <Milk className="h-5 w-5" />
            <DialogTitle>Record Farm Milk Intake</DialogTitle>
          </div>
          <DialogDescription>
            Log morning or evening milk stock received from dairy cattle farms.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="my-2 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Supplier Select */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier_id">Select Farm Supplier *</Label>
            <Select id="supplier_id" {...register("supplier_id")}>
              <option value="" disabled>
                -- Choose Supplier --
              </option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.supplier_name} (Std: Rs. {s.purchase_rate_per_kg}/KG)
                </option>
              ))}
            </Select>
            {errors.supplier_id && (
              <p className="text-xs text-rose-600">{errors.supplier_id.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="purchase_date">Purchase Date *</Label>
            <Input id="purchase_date" type="date" {...register("purchase_date")} />
            {errors.purchase_date && (
              <p className="text-xs text-rose-600">{errors.purchase_date.message}</p>
            )}
          </div>

          {/* Quantity & Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="qty_kg">Intake Quantity (KG) *</Label>
              <Input
                id="qty_kg"
                type="number"
                step="any"
                min="0"
                placeholder="50"
                {...register("qty_kg")}
              />
              {errors.qty_kg && (
                <p className="text-xs text-rose-600">{errors.qty_kg.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rate_per_kg">Rate / KG (Rs.) *</Label>
              <Input
                id="rate_per_kg"
                type="number"
                step="any"
                min="0"
                placeholder="160"
                {...register("rate_per_kg")}
              />
              {errors.rate_per_kg && (
                <p className="text-xs text-rose-600">{errors.rate_per_kg.message}</p>
              )}
            </div>
          </div>

          {/* Total Cost live banner */}
          <div className="rounded-lg bg-sky-50 border border-sky-200 p-3 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-sky-800 font-medium">Total Cost:</span>
            <span className="font-extrabold text-sky-950 text-base">
              {formatCurrency(estimatedCost)}
            </span>
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
            <Button type="submit" variant="dairy" disabled={submitting}>
              {submitting ? "Saving..." : "Record Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
