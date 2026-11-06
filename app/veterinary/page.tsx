"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { FarmStore } from "@/lib/farmStore";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { FarmField, FarmPageHeader, FarmSection, farmFormGrid, farmInputClass } from "@/components/farm/FarmUI";
import { Animal, MedicineInventoryItem, VeterinaryLog } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

const today = () => new Date().toISOString().slice(0, 10);

export default function VeterinaryPage() {
  const [animals, setAnimals] = React.useState<Animal[]>([]);
  const [medicines, setMedicines] = React.useState<MedicineInventoryItem[]>([]);
  const [logs, setLogs] = React.useState<VeterinaryLog[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const [animalRows, medicineRows, logRows] = await Promise.all([
        FarmStore.getAnimals(),
        FarmStore.getMedicineInventory(),
        FarmStore.getVeterinaryLogs(),
      ]);
      setAnimals(animalRows);
      setMedicines(medicineRows);
      setLogs(logRows);
    } catch (error) {
      console.error("Could not load veterinary records", error);
      toast.error(error instanceof Error ? error.message : "Could not load veterinary records.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    window.addEventListener("milk-store-updated", load);
    return () => window.removeEventListener("milk-store-updated", load);
  }, [load]);

  const addMedicine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.saveMedicine({
        name: String(form.get("name")).trim(),
        unit: String(form.get("unit")).trim(),
        quantity: Number(form.get("quantity") || 0),
        low_stock_threshold: Number(form.get("low_stock_threshold") || 0),
        unit_rate: Number(form.get("unit_rate") || 0),
      });
      formElement.reset();
      await load();
      toast.success("Medicine inventory updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save medicine.");
    }
  };

  const restockMedicine = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.adjustMedicineStock(
        String(form.get("medicine_id")),
        Number(form.get("quantity"))
      );
      formElement.reset();
      await load();
      toast.success("Medicine stock replenished.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not replenish medicine.");
    }
  };

  const addTreatment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.saveVeterinaryLog({
        animal_id: String(form.get("animal_id")),
        medicine_id: String(form.get("medicine_id") || "") || null,
        treatment_date: String(form.get("treatment_date")),
        treatment: String(form.get("treatment")).trim(),
        dosage: String(form.get("dosage") || "").trim(),
        quantity_used: Number(form.get("quantity_used") || 0),
        medicine_cost: Number(form.get("medicine_cost") || 0),
        vet_fee: Number(form.get("vet_fee") || 0),
        next_checkup_date: String(form.get("next_checkup_date") || "") || null,
      });
      formElement.reset();
      await load();
      toast.success("Treatment saved, stock adjusted, and expense recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save treatment.");
    }
  };

  const lowStock = medicines.filter((medicine) => Number(medicine.quantity) <= Number(medicine.low_stock_threshold));
  const reminders = logs.filter((log) => log.next_checkup_date && log.next_checkup_date >= today());

  return (
    <div className="space-y-5">
      <FarmPageHeader title="Medicines & Veterinary" description="Medicine and vaccine inventory, animal treatments, dosage, vet fees, and checkup reminders." />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Medicine Items</div><div className="mt-1 text-2xl font-extrabold">{medicines.length}</div></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-xs font-semibold uppercase text-slate-600">Low Stock</div><div className="mt-1 text-2xl font-extrabold">{lowStock.length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Upcoming Checkups</div><div className="mt-1 text-2xl font-extrabold">{reminders.length}</div></div>
      </div>
      {reminders.length > 0 && <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4" />{reminders.length} upcoming veterinary follow-up{reminders.length === 1 ? "" : "s"}.</div>}

      <FarmSection title="Add / Restock Medicine or Vaccine">
        <form onSubmit={addMedicine} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Medicine / vaccine name *"><input className={farmInputClass} name="name" required /></FarmField>
            <FarmField label="Unit"><input className={farmInputClass} name="unit" defaultValue="dose" required /></FarmField>
            <FarmField label="Available quantity"><input className={farmInputClass} name="quantity" type="number" step="0.001" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Low-stock level"><input className={farmInputClass} name="low_stock_threshold" type="number" step="0.001" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Unit cost (Rs.)"><input className={farmInputClass} name="unit_rate" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
          </div>
          <Button type="submit" variant="dairy">Save Medicine Inventory</Button>
        </form>
      </FarmSection>

      <FarmSection title="Restock Existing Medicine">
        <form onSubmit={restockMedicine} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1"><FarmField label="Medicine *"><select className={farmInputClass} name="medicine_id" required defaultValue=""><option value="" disabled>Select medicine</option>{medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} · current {Number(medicine.quantity)} {medicine.unit}</option>)}</select></FarmField></div>
          <div className="w-full sm:w-56"><FarmField label="Quantity to add *"><input className={farmInputClass} name="quantity" type="number" step="0.001" min="0.001" required /></FarmField></div>
          <Button type="submit" variant="outline" disabled={!medicines.length}>Restock Inventory</Button>
        </form>
      </FarmSection>

      <FarmSection title="Record Animal Treatment">
        <p className="mb-3 text-xs text-slate-500">Treatment medicine cost and vet fees are automatically added to the dated expense ledger.</p>
        <form onSubmit={addTreatment} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Animal *"><select className={farmInputClass} name="animal_id" required defaultValue=""><option value="" disabled>Select animal</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.tag_number} — {animal.name}</option>)}</select></FarmField>
            <FarmField label="Treatment / diagnosis *"><input className={farmInputClass} name="treatment" required /></FarmField>
            <FarmField label="Medicine / vaccine"><select className={farmInputClass} name="medicine_id" defaultValue=""><option value="">Not specified</option>{medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} · {Number(medicine.quantity)} {medicine.unit}</option>)}</select></FarmField>
            <FarmField label="Dosage / instructions"><input className={farmInputClass} name="dosage" /></FarmField>
            <FarmField label="Quantity used"><input className={farmInputClass} name="quantity_used" type="number" step="0.001" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Medicine cost (Rs.)"><input className={farmInputClass} name="medicine_cost" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Vet / doctor fee (Rs.)"><input className={farmInputClass} name="vet_fee" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Treatment date *"><input className={farmInputClass} name="treatment_date" type="date" defaultValue={today()} required /></FarmField>
            <FarmField label="Next checkup"><input className={farmInputClass} name="next_checkup_date" type="date" /></FarmField>
          </div>
          <Button type="submit" variant="outline" disabled={!animals.length}>Save Treatment</Button>
        </form>
      </FarmSection>

      <FarmSection title="Medicine Stock">
        {loading ? <p className="text-sm text-slate-500">Loading medicines…</p> : medicines.length === 0 ? <p className="text-sm text-slate-500">No medicine inventory yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Medicine</th><th className="p-3">Available</th><th className="p-3">Alert at</th><th className="p-3">Unit rate</th><th className="p-3">Status</th></tr></thead><tbody className="divide-y">{medicines.map((medicine) => <tr key={medicine.id}><td className="p-3 font-semibold">{medicine.name}</td><td className="p-3">{Number(medicine.quantity)} {medicine.unit}</td><td className="p-3">{Number(medicine.low_stock_threshold)} {medicine.unit}</td><td className="p-3">{formatCurrency(Number(medicine.unit_rate))}</td><td className="p-3">{Number(medicine.quantity) <= Number(medicine.low_stock_threshold) ? <span className="text-amber-700">Reorder</span> : <span className="text-emerald-700">Available</span>}</td></tr>)}</tbody></table></div>}
      </FarmSection>

      <FarmSection title="Treatment History">
        <div className="divide-y">{logs.map((log) => {
          const animal = animals.find((row) => row.id === log.animal_id);
          const medicine = medicines.find((row) => row.id === log.medicine_id);
          return <div key={log.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><strong>{animal?.tag_number || "Animal"} · {log.treatment}</strong><p className="text-slate-600">{medicine?.name || "No medicine specified"}{log.dosage ? ` · ${log.dosage}` : ""}</p><p className="text-xs text-slate-500">Next checkup: {log.next_checkup_date || "Not set"}</p></div><div className="text-right text-xs text-slate-500">{log.treatment_date}<div>Cost: {formatCurrency(Number(log.medicine_cost) + Number(log.vet_fee))}</div></div></div>;
        })}{logs.length === 0 && <p className="py-2 text-sm text-slate-500">No treatments logged.</p>}</div>
      </FarmSection>
    </div>
  );
}
