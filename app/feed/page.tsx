"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { FarmStore } from "@/lib/farmStore";
import { DataStore } from "@/lib/store";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { FarmField, FarmPageHeader, FarmSection, farmFormGrid, farmInputClass } from "@/components/farm/FarmUI";
import { DailyPurchase, FeedInventoryItem, FeedTransaction, Supplier, SupplierPayment } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { calculateSupplierPayables } from "@/lib/farmMetrics";

const today = () => new Date().toISOString().slice(0, 10);

export default function FeedPage() {
  const [inventory, setInventory] = React.useState<FeedInventoryItem[]>([]);
  const [transactions, setTransactions] = React.useState<FeedTransaction[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [milkPurchases, setMilkPurchases] = React.useState<DailyPurchase[]>([]);
  const [supplierPayments, setSupplierPayments] = React.useState<SupplierPayment[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const [items, movements, supplierRows, purchaseRows, paymentRows] = await Promise.all([
        FarmStore.getFeedInventory(),
        FarmStore.getFeedTransactions(),
        DataStore.getSuppliers(),
        DataStore.getDailyPurchases(),
        FarmStore.getSupplierPayments(),
      ]);
      setInventory(items);
      setTransactions(movements);
      setSuppliers(supplierRows);
      setMilkPurchases(purchaseRows);
      setSupplierPayments(paymentRows);
    } catch (error) {
      console.error("Could not load feed inventory", error);
      toast.error(error instanceof Error ? error.message : "Could not load feed inventory.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    window.addEventListener("milk-store-updated", load);
    return () => window.removeEventListener("milk-store-updated", load);
  }, [load]);

  const addItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.saveFeedItem({
        name: String(form.get("name")).trim(),
        unit: String(form.get("unit")).trim(),
        quantity: Number(form.get("quantity") || 0),
        low_stock_threshold: Number(form.get("low_stock_threshold") || 0),
        unit_rate: Number(form.get("unit_rate") || 0),
      });
      formElement.reset();
      await load();
      toast.success("Feed item added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add feed item.");
    }
  };

  const addMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("transaction_type")) as FeedTransaction["transaction_type"];
    const quantity = Number(form.get("quantity"));
    const rate = Number(form.get("unit_rate") || 0);
    try {
      await FarmStore.saveFeedTransaction({
        feed_id: String(form.get("feed_id")),
        transaction_type: type,
        quantity,
        unit_rate: rate,
        total_cost: type === "Purchase" ? quantity * rate : 0,
        transaction_date: String(form.get("transaction_date")),
        supplier_id: String(form.get("supplier_id") || "") || null,
        notes: String(form.get("notes") || "").trim() || null,
      });
      formElement.reset();
      await load();
      toast.success(type === "Purchase" ? "Feed stock received and expense recorded." : "Feed consumption recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record feed movement.");
    }
  };

  const addSupplierPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.saveSupplierPayment({
        supplier_id: String(form.get("supplier_id")),
        payment_date: String(form.get("payment_date")),
        amount: Number(form.get("amount")),
        notes: String(form.get("notes") || "").trim() || null,
      });
      formElement.reset();
      await load();
      toast.success("Supplier payment saved; payable balance updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save supplier payment.");
    }
  };

  const lowStock = inventory.filter((item) => Number(item.quantity) <= Number(item.low_stock_threshold));
  const selectedMonth = today().slice(0, 7);
  const monthSpend = transactions
    .filter((movement) => movement.transaction_type === "Purchase" && movement.transaction_date.startsWith(selectedMonth))
    .reduce((sum, movement) => sum + Number(movement.total_cost), 0);
  const todaySpend = transactions
    .filter((movement) => movement.transaction_type === "Purchase" && movement.transaction_date === today())
    .reduce((sum, movement) => sum + Number(movement.total_cost), 0);
  const supplierPayables = calculateSupplierPayables(milkPurchases, transactions, supplierPayments);

  return (
    <div className="space-y-5">
      <FarmPageHeader title="Feed & Fodder Inventory" description="Manage feed stock, purchases, supplier details, daily consumption, and low-stock alerts." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Feed Items</div><div className="mt-1 text-2xl font-extrabold">{inventory.length}</div></div>
        <div className={`rounded-xl border p-4 ${lowStock.length ? "border-amber-200 bg-amber-50" : "bg-white"}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><AlertTriangle className="h-4 w-4 text-amber-600" />Low Stock</div><div className="mt-1 text-2xl font-extrabold">{lowStock.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Feed Spend This Month</div><div className="mt-1 text-2xl font-extrabold text-rose-700">{formatCurrency(monthSpend)}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Today Feed Purchases</div><div className="mt-1 text-2xl font-extrabold text-rose-700">{formatCurrency(todaySpend)}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Supplier Payables</div><div className="mt-1 text-2xl font-extrabold text-amber-700">{formatCurrency(supplierPayables)}</div></div>
      </div>

      <FarmSection title="Add Feed / Fodder">
        <form onSubmit={addItem} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Feed name *"><input className={farmInputClass} name="name" placeholder="Sabz Chara, Wanda, Khal, Chokar, Bhoosa…" required /></FarmField>
            <FarmField label="Unit"><input className={farmInputClass} name="unit" defaultValue="kg" required /></FarmField>
            <FarmField label="Opening stock"><input className={farmInputClass} name="quantity" type="number" step="0.001" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Low-stock level"><input className={farmInputClass} name="low_stock_threshold" type="number" step="0.001" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Unit rate (Rs.)"><input className={farmInputClass} name="unit_rate" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
          </div>
          <Button type="submit" variant="dairy">Add Inventory Item</Button>
        </form>
      </FarmSection>

      <FarmSection title="Record Purchase or Daily Consumption">
        <p className="mb-3 text-xs text-slate-500">Feed purchases automatically create dated expenses and update stock. Do not enter the same purchase again on the expense page.</p>
        <form onSubmit={addMovement} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Feed item *">
              <select className={farmInputClass} name="feed_id" required defaultValue=""><option value="" disabled>Select feed</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </FarmField>
            <FarmField label="Movement">
              <select className={farmInputClass} name="transaction_type"><option>Purchase</option><option>Consumption</option></select>
            </FarmField>
            <FarmField label="Quantity *"><input className={farmInputClass} name="quantity" type="number" step="0.001" min="0.001" required /></FarmField>
            <FarmField label="Unit rate (Rs.)"><input className={farmInputClass} name="unit_rate" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Date *"><input className={farmInputClass} name="transaction_date" type="date" defaultValue={today()} required /></FarmField>
            <FarmField label="Supplier">
              <select className={farmInputClass} name="supplier_id" defaultValue=""><option value="">Not specified</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}</select>
            </FarmField>
            <FarmField label="Notes"><input className={farmInputClass} name="notes" /></FarmField>
          </div>
          <Button type="submit" variant="outline" disabled={!inventory.length}>Save Feed Movement</Button>
        </form>
      </FarmSection>

      <FarmSection title="Available Stock">
        {loading ? <p className="text-sm text-slate-500">Loading inventory…</p> : inventory.length === 0 ? <p className="text-sm text-slate-500">No inventory items added.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Feed</th><th className="p-3">Stock</th><th className="p-3">Low-stock alert</th><th className="p-3">Rate</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{inventory.map((item) => <tr key={item.id}><td className="p-3 font-semibold">{item.name}</td><td className="p-3">{Number(item.quantity).toLocaleString()} {item.unit}</td><td className="p-3">{Number(item.low_stock_threshold).toLocaleString()} {item.unit}</td><td className="p-3">{formatCurrency(Number(item.unit_rate))}/{item.unit}</td><td className="p-3">{Number(item.quantity) <= Number(item.low_stock_threshold) ? <span className="font-semibold text-amber-700">Reorder</span> : <span className="text-emerald-700">Available</span>}</td></tr>)}</tbody></table></div>
        )}
      </FarmSection>

      <FarmSection title="Recent Feed Transactions">
        <div className="divide-y">{transactions.slice(0, 30).map((movement) => {
          const item = inventory.find((row) => row.id === movement.feed_id);
          const supplier = suppliers.find((row) => row.id === movement.supplier_id);
          return <div key={movement.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><strong>{movement.transaction_type} · {item?.name || "Feed"}</strong><p className="text-xs text-slate-500">{supplier?.supplier_name || movement.notes || "—"}</p></div><div className="text-right">{Number(movement.quantity).toLocaleString()} {item?.unit || ""}<p className="text-xs text-slate-500">{movement.transaction_date} · {movement.transaction_type === "Purchase" ? formatCurrency(Number(movement.total_cost)) : "Consumption"}</p></div></div>;
        })}{transactions.length === 0 && <p className="py-2 text-sm text-slate-500">No feed transactions recorded.</p>}</div>
      </FarmSection>

      <FarmSection title="Supplier Payments & Payables">
        <form onSubmit={addSupplierPayment} className="mb-4 space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Supplier *"><select className={farmInputClass} name="supplier_id" required defaultValue=""><option value="" disabled>Select supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.supplier_name}</option>)}</select></FarmField>
            <FarmField label="Payment date *"><input className={farmInputClass} name="payment_date" type="date" defaultValue={today()} required /></FarmField>
            <FarmField label="Amount paid (Rs.) *"><input className={farmInputClass} name="amount" type="number" step="0.01" min="0.01" required /></FarmField>
            <FarmField label="Reference / notes"><input className={farmInputClass} name="notes" /></FarmField>
          </div>
          <Button type="submit" variant="outline" disabled={!suppliers.length}>Record Supplier Payment</Button>
        </form>
        <div className="divide-y">{suppliers.map((supplier) => {
          const purchased = milkPurchases.filter((row) => row.supplier_id === supplier.id).reduce((sum, row) => sum + Number(row.total_cost), 0) +
            transactions.filter((row) => row.supplier_id === supplier.id && row.transaction_type === "Purchase").reduce((sum, row) => sum + Number(row.total_cost), 0);
          const paid = supplierPayments.filter((row) => row.supplier_id === supplier.id).reduce((sum, row) => sum + Number(row.amount), 0);
          return <div key={supplier.id} className="flex justify-between gap-3 py-3 text-sm"><span className="font-semibold">{supplier.supplier_name}</span><span className="text-right">Purchased {formatCurrency(purchased)} · Paid {formatCurrency(paid)} · <strong>Due {formatCurrency(Math.max(0, purchased - paid))}</strong></span></div>;
        })}{suppliers.length === 0 && <p className="py-2 text-sm text-slate-500">Add a supplier in Farm Purchases to record payments.</p>}</div>
      </FarmSection>
    </div>
  );
}
