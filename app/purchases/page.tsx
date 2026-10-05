"use client";

import * as React from "react";
import {
  Truck,
  PlusCircle,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Scale,
  Milk,
  Phone,
  DollarSign,
  ChevronRight,
  Info,
  Edit2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Supplier, DailyPurchase, DailyReconciliation } from "@/types/database";
import { DataStore } from "@/lib/store";
import {
  formatCurrency,
  formatKg,
  getTodayDateString,
  formatDateDisplay,
} from "@/lib/utils";
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
import { SupplierFormDialog } from "@/components/purchases/SupplierFormDialog";
import { PurchaseEntryDialog } from "@/components/purchases/PurchaseEntryDialog";
import { SupplierFormValues, PurchaseFormValues } from "@/lib/validations";

export default function PurchasesPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getTodayDateString());
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [purchases, setPurchases] = React.useState<DailyPurchase[]>([]);
  const [reconciliation, setReconciliation] = React.useState<DailyReconciliation | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = React.useState(false);
  const [supplierToEdit, setSupplierToEdit] = React.useState<Supplier | null>(null);
  const [purchaseModalOpen, setPurchaseModalOpen] = React.useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [supplierToDelete, setSupplierToDelete] = React.useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [supList, purList, reconData] = await Promise.all([
        DataStore.getSuppliers(),
        DataStore.getDailyPurchases(),
        DataStore.getDailyReconciliation(selectedDate),
      ]);
      const supMap = new Map(supList.map((s) => [s.id, s]));
      const validPurchases = purList
        .filter((p) => supMap.has(p.supplier_id))
        .map((p) => ({
          ...p,
          supplier: supMap.get(p.supplier_id) || p.supplier,
        }));
      setSuppliers(supList);
      setPurchases(validPurchases);
      setReconciliation(reconData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("milk-store-updated", handleUpdate);
    return () => window.removeEventListener("milk-store-updated", handleUpdate);
  }, [loadData]);

  const handleSaveSupplier = async (values: SupplierFormValues) => {
    try {
      await DataStore.saveSupplier({
        ...(supplierToEdit ? { id: supplierToEdit.id } : {}),
        supplier_name: values.supplier_name.trim(),
        phone: values.phone ? values.phone.trim() : "",
        purchase_rate_per_kg: parseFloat(String(values.purchase_rate_per_kg)),
      });
      await loadData();
      showToast(supplierToEdit ? "Supplier updated successfully!" : "Supplier registered successfully!");
    } catch (error: any) {
      if (error) console.error("Supabase Error:", error);
      const msg = error?.message || "Failed to save supplier to database.";
      showToast(msg, "error");
      throw error;
    }
  };

  const handleSavePurchase = async (values: PurchaseFormValues) => {
    try {
      const supplier_id = String(values.supplier_id).trim();
      if (!supplier_id) {
        throw new Error("Supplier foreign key is required to record intake.");
      }
      await DataStore.saveDailyPurchase({
        supplier_id,
        purchase_date: values.purchase_date,
        qty_kg: parseFloat(String(values.qty_kg)),
        rate_per_kg: parseFloat(String(values.rate_per_kg)),
      });
      await loadData();
      showToast("Farm milk intake recorded successfully!");
    } catch (error: any) {
      if (error) console.error("Supabase Error:", error);
      const msg = error?.message || "Failed to record purchase to database.";
      showToast(msg, "error");
      throw error;
    }
  };

  // Handle Delete Supplier
  const handleDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setIsDeleting(true);
    try {
      await DataStore.deleteSupplier(supplierToDelete.id);
      setDeleteDialogOpen(false);
      const deletedName = supplierToDelete.supplier_name;
      setSupplierToDelete(null);
      await loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("milk-store-updated"));
      }
      showToast(`"${deletedName}" deleted successfully.`);
    } catch (err: any) {
      if (err) console.error("Supabase Error:", err);
      showToast(err?.message || "Failed to delete supplier. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const datePurchases = purchases.filter((p) => p.purchase_date === selectedDate);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg text-sm font-medium transition-all duration-300 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Truck className="h-6 w-6 text-sky-600" />
            Farm Purchases &amp; Reconciliation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track raw milk bulk intake from dairy farms and calculate daily milk wastage/loss.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              setSupplierToEdit(null);
              setSupplierModalOpen(true);
            }}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Supplier Farm</span>
          </Button>

          <Button
            variant="dairy"
            className="gap-2"
            onClick={() => setPurchaseModalOpen(true)}
          >
            <Milk className="h-4 w-4" />
            <span>Record Intake</span>
          </Button>
        </div>
      </div>

      {/* RECONCILIATION ENGINE SECTION */}
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-sky-50/40 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-sky-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daily Milk Reconciliation Engine
              </h2>
              <p className="text-xs text-slate-500">
                Formula: Wastage / Loss = Farm Intake (KG) - Customer Deliveries (KG)
              </p>
            </div>
          </div>

          {/* Date Selector for Reconciliation */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm self-start sm:self-auto">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>
        </div>

        {reconciliation && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Farm Purchases (IN) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  1. Farm Milk Intake (IN)
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                  {formatKg(reconciliation.totalPurchasedKg)}
                </p>
                <span className="text-xs font-semibold text-slate-500 mt-1 block">
                  Cost: {formatCurrency(reconciliation.totalPurchaseCost)}
                </span>
              </div>

              {/* Customer Deliveries (OUT) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  2. Milk Distributed (OUT)
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-sky-700 mt-1">
                  {formatKg(reconciliation.totalDeliveredKg)}
                </p>
                <span className="text-xs font-semibold text-sky-600 mt-1 block">
                  Revenue: {formatCurrency(reconciliation.totalSalesRevenue)}
                </span>
              </div>

              {/* Wastage / Loss (KG) */}
              <div
                className={`rounded-xl border p-4 shadow-sm ${
                  reconciliation.status === "HIGH_LOSS"
                    ? "bg-rose-50 border-rose-200"
                    : reconciliation.status === "SURPLUS"
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    3. Wastage / Variance
                  </span>
                  {reconciliation.status === "HIGH_LOSS" ? (
                    <Badge variant="destructive">High Loss</Badge>
                  ) : reconciliation.status === "NORMAL" ? (
                    <Badge variant="success">Normal Loss</Badge>
                  ) : reconciliation.status === "BALANCED" ? (
                    <Badge variant="dairy">Balanced</Badge>
                  ) : (
                    <Badge variant="warning">Surplus / Extra</Badge>
                  )}
                </div>
                <p
                  className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
                    reconciliation.wastageKg > 0
                      ? reconciliation.status === "HIGH_LOSS"
                        ? "text-rose-700"
                        : "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {formatKg(reconciliation.wastageKg)}
                </p>
                <span className="text-xs font-medium text-slate-500 mt-1 block">
                  {reconciliation.wastagePercentage.toFixed(1)}% of total intake
                </span>
              </div>

              {/* Day Gross Margin */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  4. Day Gross Margin
                </span>
                {(() => {
                  const grossMargin =
                    reconciliation.totalSalesRevenue - reconciliation.totalPurchaseCost;
                  return (
                    <>
                      <p
                        className={`text-2xl sm:text-3xl font-extrabold mt-1 ${
                          grossMargin >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(grossMargin)}
                      </p>
                      <span className="text-xs font-medium text-slate-500 mt-1 block">
                        Sales - Milk Purchases
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Reconciliation Insight Banner */}
            <div className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-center gap-3 text-xs sm:text-sm">
              <Info className="h-4 w-4 text-sky-600 shrink-0" />
              <div className="text-slate-700">
                {reconciliation.totalPurchasedKg === 0 && reconciliation.totalDeliveredKg === 0 ? (
                  <span>No purchases or deliveries recorded for {formatDateDisplay(selectedDate)}.</span>
                ) : reconciliation.status === "HIGH_LOSS" ? (
                  <span className="text-rose-700 font-medium">
                    Warning: Wastage is above 3.0% ({formatKg(reconciliation.wastageKg)}). Inspect dairy milk containers, delivery handling, or recording discrepancies.
                  </span>
                ) : reconciliation.status === "NORMAL" ? (
                  <span className="text-emerald-700 font-medium">
                    Reconciliation within standard dairy parameters ({formatKg(reconciliation.wastageKg)} handling variance).
                  </span>
                ) : reconciliation.status === "SURPLUS" ? (
                  <span className="text-amber-700 font-medium">
                    Note: Customer deliveries exceed recorded farm intake by {formatKg(Math.abs(reconciliation.wastageKg))}. Please verify if a supplier intake log was missed.
                  </span>
                ) : (
                  <span className="text-slate-700 font-medium">
                    Milk intake and distribution are perfectly balanced (0.00 KG variance).
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout: Daily Purchases for Date & Registered Suppliers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Purchases Log for Selected Date (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Milk className="h-4 w-4 text-sky-600" />
              Farm Purchases on {formatDateDisplay(selectedDate)}
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {datePurchases.length} intake logs
            </span>
          </div>

          {datePurchases.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-xs text-slate-500">
                No farm purchases recorded for {formatDateDisplay(selectedDate)}.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setPurchaseModalOpen(true)}
              >
                Log Farm Intake
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farm Supplier</TableHead>
                  <TableHead>Intake Qty</TableHead>
                  <TableHead>Rate / KG</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datePurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-semibold text-slate-900">
                        {p.supplier?.supplier_name || "Unknown Farm"}
                      </span>
                      {p.supplier?.phone && (
                        <p className="text-[11px] text-slate-500">{p.supplier.phone}</p>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {formatKg(p.qty_kg)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      Rs. {p.rate_per_kg}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatCurrency(p.total_cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Historical Purchases Preview */}
          <div className="pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Recent All-Time Purchases
            </h4>
            <div className="rounded-xl border border-slate-200 bg-white p-3 divide-y divide-slate-100 text-xs">
              {purchases.slice(0, 5).map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {p.supplier?.supplier_name || "Farm"}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {formatDateDisplay(p.purchase_date)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{formatKg(p.qty_kg)}</span>
                    <span className="text-[11px] text-slate-500 block">
                      {formatCurrency(p.total_cost)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Supplier Directory (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="h-4 w-4 text-sky-600" />
              Registered Farms ({suppliers.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-sky-600 h-7"
              onClick={() => {
                setSupplierToEdit(null);
                setSupplierModalOpen(true);
              }}
            >
              + Add
            </Button>
          </div>

          <div className="space-y-3">
            {suppliers.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{s.supplier_name}</h4>
                    {s.phone && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {s.phone}
                      </p>
                    )}
                  </div>
                  {/* Edit + Delete action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      title="Edit Supplier"
                      onClick={() => {
                        setSupplierToEdit(s);
                        setSupplierModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      title="Delete Supplier"
                      onClick={() => {
                        setSupplierToDelete(s);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Standard Rate:</span>
                  <span className="font-bold text-sky-700">
                    Rs. {s.purchase_rate_per_kg} / KG
                  </span>
                </div>
              </div>
            ))}

            {suppliers.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <Truck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-xs text-slate-500">No supplier farms registered yet.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => {
                    setSupplierToEdit(null);
                    setSupplierModalOpen(true);
                  }}
                >
                  Add First Supplier
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Modal */}
      <SupplierFormDialog
        open={supplierModalOpen}
        onOpenChange={setSupplierModalOpen}
        supplierToEdit={supplierToEdit}
        onSave={handleSaveSupplier}
      />

      {/* Purchase Intake Modal */}
      <PurchaseEntryDialog
        open={purchaseModalOpen}
        onOpenChange={setPurchaseModalOpen}
        suppliers={suppliers}
        onSavePurchase={handleSavePurchase}
      />

      {/* Delete Supplier Confirmation Dialog */}
      {deleteDialogOpen && supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setDeleteDialogOpen(false)}
          />
          {/* Dialog panel */}
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Supplier</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900">{supplierToDelete.supplier_name}</span>?
              All associated purchase records will also be permanently removed.
            </p>
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDeleteSupplier}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Deleting…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
