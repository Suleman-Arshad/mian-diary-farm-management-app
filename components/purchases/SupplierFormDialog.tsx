"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema, SupplierFormValues } from "@/lib/validations";
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
import { Truck, AlertCircle } from "lucide-react";

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierToEdit?: Supplier | null;
  onSave: (values: SupplierFormValues) => Promise<void>;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplierToEdit,
  onSave,
}: SupplierFormDialogProps) {
  const isEditing = Boolean(supplierToEdit);
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      supplier_name: "",
      phone: "",
      purchase_rate_per_kg: 160,
    },
  });

  React.useEffect(() => {
    if (supplierToEdit) {
      reset({
        supplier_name: supplierToEdit.supplier_name,
        phone: supplierToEdit.phone || "",
        purchase_rate_per_kg: Number(supplierToEdit.purchase_rate_per_kg),
      });
    } else {
      reset({
        supplier_name: "",
        phone: "",
        purchase_rate_per_kg: 160,
      });
    }
    setErrorMsg(null);
  }, [supplierToEdit, reset, open]);

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await onSave(values);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            <Truck className="h-5 w-5" />
            <DialogTitle>
              {isEditing ? "Edit Supplier Farm" : "Add Dairy Supplier / Farm"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Register cattle farm source and standard purchase price per KG.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="my-2 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="supplier_name">Supplier / Farm Name *</Label>
            <Input
              id="supplier_name"
              placeholder="e.g. Al-Rehman Buffalo Dairy"
              {...register("supplier_name")}
            />
            {errors.supplier_name && (
              <p className="text-xs text-rose-600">{errors.supplier_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Contact Phone</Label>
            <Input
              id="phone"
              placeholder="e.g. 03011112233"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-rose-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase_rate_per_kg">Standard Purchase Rate / KG (Rs.) *</Label>
            <Input
              id="purchase_rate_per_kg"
              type="number"
              step="0.5"
              min="1"
              placeholder="160"
              {...register("purchase_rate_per_kg")}
            />
            {errors.purchase_rate_per_kg && (
              <p className="text-xs text-rose-600">{errors.purchase_rate_per_kg.message}</p>
            )}
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
              {submitting ? "Saving..." : isEditing ? "Update Supplier" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
