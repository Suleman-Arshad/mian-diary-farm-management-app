"use client";

import * as React from "react";
import {
  ClipboardList,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Milk,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { Customer, DailySale } from "@/types/database";
import { DataStore } from "@/lib/store";
import {
  formatCurrency,
  formatKg,
  getTodayDateString,
  formatDateDisplay,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface EntryRowState {
  customer_id: string;
  customer_name: string;
  phone: string;
  fixed_rate: number;
  qty_kg: number | string;
  is_nagha: boolean;
  use_custom_rate: boolean;
  custom_rate: number | string;
  total_amount: number;
  isExisting: boolean;
}

export default function DailyMilkEntryPage() {
  const [selectedDate, setSelectedDate] = React.useState<string>(getTodayDateString());
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [rows, setRows] = React.useState<EntryRowState[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  // Load active customers and any existing entries for the chosen date
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setSaveSuccess(false);
      setStatusMessage(null);

      const [allCustomers, existingSales] = await Promise.all([
        DataStore.getCustomers(),
        DataStore.getDailySalesByDate(selectedDate),
      ]);

      const activeCustomers = allCustomers.filter((c) => c.is_active);
      setCustomers(activeCustomers);

      const salesMap = new Map<string, DailySale>();
      existingSales.forEach((s) => salesMap.set(s.customer_id, s));

      // Build rows
      const initialRows: EntryRowState[] = activeCustomers.map((cust) => {
        const existing = salesMap.get(cust.id);
        if (existing) {
          return {
            customer_id: cust.id,
            customer_name: cust.name,
            phone: cust.phone,
            fixed_rate: cust.fixed_rate_per_kg,
            qty_kg: existing.is_nagha ? 0 : existing.qty_kg,
            is_nagha: existing.is_nagha,
            use_custom_rate: Boolean(existing.custom_rate && existing.custom_rate !== cust.fixed_rate_per_kg),
            custom_rate: existing.custom_rate ?? cust.fixed_rate_per_kg,
            total_amount: existing.total_amount,
            isExisting: true,
          };
        } else {
          // Default empty or default regular delivery
          return {
            customer_id: cust.id,
            customer_name: cust.name,
            phone: cust.phone,
            fixed_rate: cust.fixed_rate_per_kg,
            qty_kg: "", // empty for user to type
            is_nagha: false,
            use_custom_rate: false,
            custom_rate: cust.fixed_rate_per_kg,
            total_amount: 0,
            isExisting: false,
          };
        }
      });

      setRows(initialRows);
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to load daily entries");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Recalculate row total amount
  const calculateRowTotal = (
    qty: number | string,
    isNagha: boolean,
    useCustomRate: boolean,
    customRate: number | string,
    fixedRate: number
  ): number => {
    if (isNagha) return 0;
    const numericQty = parseFloat(String(qty)) || 0;
    const rate = useCustomRate
      ? parseFloat(String(customRate)) || fixedRate
      : fixedRate;
    return Math.round(numericQty * rate * 100) / 100;
  };

  // Handle Qty change
  const handleQtyChange = (index: number, val: string) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = copy[index];
      const isNagha = false; // typing quantity automatically removes nagha
      const total = calculateRowTotal(
        val,
        isNagha,
        row.use_custom_rate,
        row.custom_rate,
        row.fixed_rate
      );
      copy[index] = {
        ...row,
        qty_kg: val,
        is_nagha: isNagha,
        total_amount: total,
      };
      return copy;
    });
  };

  // Toggle Nagha (Absent)
  const handleToggleNagha = (index: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = copy[index];
      const newNagha = !row.is_nagha;
      const newQty = newNagha ? 0 : (row.qty_kg === 0 || row.qty_kg === "0" ? "" : row.qty_kg);
      const total = calculateRowTotal(
        newQty,
        newNagha,
        row.use_custom_rate,
        row.custom_rate,
        row.fixed_rate
      );
      copy[index] = {
        ...row,
        is_nagha: newNagha,
        qty_kg: newQty,
        total_amount: total,
      };
      return copy;
    });
  };

  // Toggle Custom Rate
  const handleToggleCustomRate = (index: number) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = copy[index];
      const newUseCustom = !row.use_custom_rate;
      const total = calculateRowTotal(
        row.qty_kg,
        row.is_nagha,
        newUseCustom,
        row.custom_rate,
        row.fixed_rate
      );
      copy[index] = {
        ...row,
        use_custom_rate: newUseCustom,
        total_amount: total,
      };
      return copy;
    });
  };

  // Change Custom Rate value
  const handleCustomRateValue = (index: number, val: string) => {
    setRows((prev) => {
      const copy = [...prev];
      const row = copy[index];
      const total = calculateRowTotal(
        row.qty_kg,
        row.is_nagha,
        row.use_custom_rate,
        val,
        row.fixed_rate
      );
      copy[index] = {
        ...row,
        custom_rate: val,
        total_amount: total,
      };
      return copy;
    });
  };

  // Save all deliveries batch
  const handleSaveAll = async () => {
    try {
      setSaving(true);
      setStatusMessage(null);

      const entriesToSave = rows.map((row) => {
        const qty = row.is_nagha ? 0 : parseFloat(String(row.qty_kg)) || 0;
        const customRate = row.use_custom_rate
          ? parseFloat(String(row.custom_rate)) || row.fixed_rate
          : null;

        return {
          customer_id: row.customer_id,
          entry_date: selectedDate,
          qty_kg: qty,
          is_nagha: row.is_nagha,
          custom_rate: customRate,
          total_amount: row.total_amount,
        };
      });

      await DataStore.saveBatchDailySales(entriesToSave);
      setSaveSuccess(true);
      setStatusMessage("All milk deliveries saved successfully!");
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err?.message || "Failed to save deliveries.");
    } finally {
      setSaving(false);
    }
  };

  // Summary counts
  const totalKgs = rows.reduce(
    (sum, r) => sum + (r.is_nagha ? 0 : parseFloat(String(r.qty_kg)) || 0),
    0
  );
  const totalAmount = rows.reduce((sum, r) => sum + r.total_amount, 0);
  const totalNaghas = rows.filter((r) => r.is_nagha).length;
  const totalDeliveries = rows.filter(
    (r) => !r.is_nagha && (parseFloat(String(r.qty_kg)) || 0) > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Header and Date Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-sky-600" />
            Daily Milk Batch Entry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Fast delivery logging for morning & evening routes. Toggle Nagha or adjust rates on the fly.
          </p>
        </div>

        {/* Date Selector & Save Button */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <Calendar className="h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>

          <Button
            variant="dairy"
            className="gap-2 shadow-sm"
            onClick={handleSaveAll}
            disabled={saving || loading}
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Deliveries..." : "Save All Deliveries"}</span>
          </Button>
        </div>
      </div>

      {/* Success / Status Banner */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2.5 rounded-xl p-3.5 text-xs sm:text-sm font-medium border transition-all ${
            saveSuccess
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {saveSuccess ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Live Day Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-sky-700 uppercase tracking-wider">
            Total Distributed Milk
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-sky-900 mt-1">
            {formatKg(totalKgs)}
          </p>
          <span className="text-[11px] text-sky-600 mt-0.5 block">
            Across {totalDeliveries} households
          </span>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Day Total Sales
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-900 mt-1">
            {formatCurrency(totalAmount)}
          </p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Calculated revenue</span>
        </div>

        <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            Nagha (Absents)
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 mt-1">
            {totalNaghas}
          </p>
          <span className="text-[11px] text-rose-600 mt-0.5 block">Milk withheld today</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Route Customers
          </span>
          <p className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">
            {rows.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Active on round</span>
        </div>
      </div>

      {/* Batch Entry Grid / Mobile Cards */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Milk className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No active customers</h3>
          <p className="mt-1 text-xs text-slate-500">
            Please register active customers in Customer Management first.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-56">Customer Name</TableHead>
                  <TableHead className="w-36">Quantity (KG)</TableHead>
                  <TableHead className="w-28 text-center">Nagha (Absent)</TableHead>
                  <TableHead className="w-56">Rate / KG (Rs.)</TableHead>
                  <TableHead className="text-right">Daily Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow
                    key={row.customer_id}
                    className={row.is_nagha ? "bg-rose-50/40 opacity-75" : ""}
                  >
                    {/* Index */}
                    <TableCell className="text-center font-mono text-xs text-slate-400">
                      {idx + 1}
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div>
                        <span className="font-semibold text-slate-900">{row.customer_name}</span>
                        <p className="text-[11px] text-slate-500">{row.phone}</p>
                      </div>
                    </TableCell>

                    {/* Qty Input */}
                    <TableCell>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.25"
                          min="0"
                          placeholder="0.00"
                          value={row.qty_kg}
                          disabled={row.is_nagha}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className={`w-28 font-semibold ${
                            row.is_nagha ? "bg-slate-100 text-slate-400 line-through" : ""
                          }`}
                        />
                      </div>
                    </TableCell>

                    {/* Nagha Toggle */}
                    <TableCell className="text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleNagha(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                          row.is_nagha
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-300 hover:border-rose-400 hover:text-rose-600"
                        }`}
                      >
                        {row.is_nagha ? "Nagha" : "Deliver"}
                      </button>
                    </TableCell>

                    {/* Rate per KG (Default or Custom Override) */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {row.use_custom_rate ? (
                            <Input
                              type="number"
                              step="1"
                              value={row.custom_rate}
                              disabled={row.is_nagha}
                              onChange={(e) => handleCustomRateValue(idx, e.target.value)}
                              className="w-24 h-8 text-xs font-semibold"
                            />
                          ) : (
                            <span className="text-xs font-semibold text-slate-700">
                              Rs. {row.fixed_rate}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleCustomRate(idx)}
                            className="text-[11px] text-sky-600 hover:underline font-medium"
                          >
                            {row.use_custom_rate ? "Reset" : "Override"}
                          </button>
                        </div>
                        {row.use_custom_rate && (
                          <span className="text-[10px] text-amber-600 block">Custom rate applied</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Daily Total */}
                    <TableCell className="text-right">
                      <span
                        className={`text-sm font-bold ${
                          row.is_nagha ? "text-slate-400" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(row.total_amount)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card System for Delivery Boys */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {rows.map((row, idx) => (
              <div
                key={row.customer_id}
                className={`rounded-xl border p-4 shadow-sm transition-all ${
                  row.is_nagha
                    ? "bg-rose-50/50 border-rose-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-base font-bold text-slate-900">
                      {row.customer_name}
                    </span>
                    <p className="text-xs text-slate-500">{row.phone}</p>
                  </div>

                  {/* Nagha Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleNagha(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${
                      row.is_nagha
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-300"
                    }`}
                  >
                    {row.is_nagha ? "Nagha (Absent)" : "Mark Nagha"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  {/* Quantity input */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                      Milk (KG)
                    </label>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="0.0"
                      value={row.qty_kg}
                      disabled={row.is_nagha}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                      className={`text-base font-bold ${row.is_nagha ? "bg-slate-100 line-through" : ""}`}
                    />
                  </div>

                  {/* Rate override & Total */}
                  <div className="flex flex-col justify-end text-right">
                    <span className="text-[11px] text-slate-500">
                      Rate: Rs. {row.use_custom_rate ? row.custom_rate : row.fixed_rate}/KG
                    </span>
                    <div className="mt-1">
                      <span className="text-xs text-slate-400">Total: </span>
                      <span
                        className={`text-base font-bold ${
                          row.is_nagha ? "text-slate-400" : "text-emerald-700"
                        }`}
                      >
                        {formatCurrency(row.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile custom rate toggle */}
                {!row.is_nagha && (
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleToggleCustomRate(idx)}
                      className="text-sky-600 font-semibold"
                    >
                      {row.use_custom_rate ? "Remove Custom Rate" : "+ Override Rate"}
                    </button>
                    {row.use_custom_rate && (
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={row.custom_rate}
                        onChange={(e) => handleCustomRateValue(idx, e.target.value)}
                        className="w-24 h-7 text-xs"
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Sticky Bottom Save Action Bar */}
          <div className="sticky bottom-16 lg:bottom-4 z-10 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white shadow-xl">
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <div>
                <span className="text-slate-400 block text-[11px]">Total Distributed</span>
                <span className="font-bold text-sky-400">{formatKg(totalKgs)}</span>
              </div>
              <div className="border-l border-slate-700 pl-4">
                <span className="text-slate-400 block text-[11px]">Total Billed</span>
                <span className="font-bold text-emerald-400">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <Button
              variant="dairy"
              size="lg"
              className="gap-2 font-bold px-6 text-sm"
              onClick={handleSaveAll}
              disabled={saving}
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save All"}</span>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
