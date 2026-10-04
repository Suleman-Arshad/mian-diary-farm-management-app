"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema, ExpenseFormValues } from "@/lib/validations";
import { ExpenseCategory } from "@/types/database";
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
import { getTodayDateString } from "@/lib/utils";
import { Receipt, AlertCircle } from "lucide-react";

interface ExpenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveExpense: (values: ExpenseFormValues) => Promise<void>;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  onSaveExpense,
}: ExpenseFormDialogProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_date: getTodayDateString(),
      category: "Petrol/Fuel",
      amount: 0,
      description: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        expense_date: getTodayDateString(),
        category: "Petrol/Fuel",
        amount: 0,
        description: "",
      });
      setErrorMsg(null);
    }
  }, [open, reset]);

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await onSaveExpense(values);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to log expense.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <Receipt className="h-5 w-5" />
            <DialogTitle>Log Daily Operational Expense</DialogTitle>
          </div>
          <DialogDescription>
            Record fuel, vehicle servicing, staff wages, feed or container costs.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="my-2 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Expense Category *</Label>
            <Select id="category" {...register("category")}>
              <option value="Petrol/Fuel">Petrol / Fuel (Delivery Bikes & Vans)</option>
              <option value="Vehicle Maintenance">Vehicle Maintenance & Repairs</option>
              <option value="Staff Salary">Staff / Delivery Boy Daily Salary</option>
              <option value="Feed/Containers">Feed, Ice, Cans & Plastic Containers</option>
              <option value="Miscellaneous">Miscellaneous Operations</option>
            </Select>
            {errors.category && (
              <p className="text-xs text-rose-600">{errors.category.message}</p>
            )}
          </div>

          {/* Date & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense_date">Expense Date *</Label>
              <Input id="expense_date" type="date" {...register("expense_date")} />
              {errors.expense_date && (
                <p className="text-xs text-rose-600">{errors.expense_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (Rs.) *</Label>
              <Input
                id="amount"
                type="number"
                step="10"
                min="1"
                placeholder="1000"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-rose-600">{errors.amount.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Details / Description</Label>
            <Input
              id="description"
              placeholder="e.g. 5 Liters Petrol for delivery bike #3"
              {...register("description")}
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
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Saving..." : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
