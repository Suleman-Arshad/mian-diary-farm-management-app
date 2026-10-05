"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, CustomerFormValues } from "@/lib/validations";
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
import { UserPlus, UserCheck, AlertCircle } from "lucide-react";

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerToEdit?: Customer | null;
  onSave: (values: CustomerFormValues) => Promise<void>;
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customerToEdit,
  onSave,
}: CustomerFormDialogProps) {
  const isEditing = Boolean(customerToEdit);
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      fixed_rate_per_kg: 180,
      previous_balance: 0,
      is_active: true,
    },
  });

  React.useEffect(() => {
    if (customerToEdit) {
      reset({
        name: customerToEdit.name,
        phone: customerToEdit.phone,
        address: customerToEdit.address || "",
        fixed_rate_per_kg: Number(customerToEdit.fixed_rate_per_kg),
        previous_balance: Number(customerToEdit.previous_balance),
        is_active: customerToEdit.is_active,
      });
    } else {
      reset({
        name: "",
        phone: "",
        address: "",
        fixed_rate_per_kg: 180,
        previous_balance: 0,
        is_active: true,
      });
    }
    setServerError(null);
  }, [customerToEdit, reset, open]);

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      setSubmitting(true);
      setServerError(null);
      await onSave({
        ...values,
        fixed_rate_per_kg: parseFloat(String(values.fixed_rate_per_kg)),
        previous_balance: parseFloat(String(values.previous_balance)) || 0,
      });
      onOpenChange(false);
    } catch (err: any) {
      if (err) console.error("Supabase Error:", err);
      setServerError(err?.message || "Failed to save customer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-sky-600 mb-1">
            {isEditing ? <UserCheck className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            <DialogTitle>
              {isEditing ? "Edit Customer Details" : "Add New Customer"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update delivery rate, contact info, and active status."
              : "Register a new regular customer for milk delivery rounds."}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <div className="my-2 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Customer Full Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Haji Mohammad Rafiq"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-rose-600 font-medium">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number (WhatsApp) *</Label>
            <Input
              id="phone"
              placeholder="e.g. 03001234567"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="text-xs text-rose-600 font-medium">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label htmlFor="address">Delivery Address / Colony</Label>
            <Input
              id="address"
              placeholder="e.g. House 14, Street 5, Model Town"
              {...register("address")}
            />
            {errors.address && (
              <p className="text-xs text-rose-600 font-medium">
                {errors.address.message}
              </p>
            )}
          </div>

          {/* Fixed Rate & Initial Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fixed_rate_per_kg">Fixed Rate / KG (Rs.) *</Label>
              <Input
                id="fixed_rate_per_kg"
                type="number"
                step="any"
                min="0"
                placeholder="180"
                {...register("fixed_rate_per_kg")}
              />
              {errors.fixed_rate_per_kg && (
                <p className="text-xs text-rose-600 font-medium">
                  {errors.fixed_rate_per_kg.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="previous_balance">Previous Balance (Rs.)</Label>
              <Input
                id="previous_balance"
                type="number"
                step="any"
                min="0"
                placeholder="0"
                disabled={isEditing} // Opening balance only set on creation
                {...register("previous_balance")}
              />
              {errors.previous_balance && (
                <p className="text-xs text-rose-600 font-medium">
                  {errors.previous_balance.message}
                </p>
              )}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              {...register("is_active")}
            />
            <Label htmlFor="is_active" className="text-sm font-normal text-slate-700 cursor-pointer">
              Active customer (included in daily milk entry table)
            </Label>
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
              {submitting ? "Saving..." : isEditing ? "Update Customer" : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
