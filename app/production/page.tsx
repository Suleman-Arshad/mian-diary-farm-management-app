"use client";

import * as React from "react";
import { FarmStore } from "@/lib/farmStore";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Animal, MilkProduction } from "@/types/database";
import { FarmField, FarmPageHeader, FarmSection, farmFormGrid, farmInputClass } from "@/components/farm/FarmUI";
import { formatKg } from "@/lib/utils";
import { format, startOfWeek, subDays } from "date-fns";

const today = () => new Date().toISOString().slice(0, 10);

export default function ProductionPage() {
  const [animals, setAnimals] = React.useState<Animal[]>([]);
  const [allAnimals, setAllAnimals] = React.useState<Animal[]>([]);
  const [production, setProduction] = React.useState<MilkProduction[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const [animalRows, productionRows] = await Promise.all([
        FarmStore.getAnimals(),
        FarmStore.getMilkProduction(),
      ]);
      setAllAnimals(animalRows);
      setAnimals(animalRows.filter((animal) => animal.status === "Active"));
      setProduction(productionRows);
    } catch (error) {
      console.error("Could not load milk production", error);
      toast.error(error instanceof Error ? error.message : "Could not load production.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    window.addEventListener("milk-store-updated", load);
    return () => window.removeEventListener("milk-store-updated", load);
  }, [load]);

  const saveYield = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.saveMilkProduction({
        animal_id: String(form.get("animal_id")),
        production_date: String(form.get("production_date")),
        morning_yield: Number(form.get("morning_yield") || 0),
        evening_yield: Number(form.get("evening_yield") || 0),
        wastage: Number(form.get("wastage") || 0),
      });
      formElement.reset();
      await load();
      toast.success("Daily animal yield saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save milk yield.");
    }
  };

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const monthStart = today().slice(0, 7);
  const total = (rows: MilkProduction[]) => rows.reduce(
    (sum, row) => sum + Number(row.morning_yield) + Number(row.evening_yield),
    0
  );
  const todayRows = production.filter((row) => row.production_date === today());
  const weekRows = production.filter((row) => row.production_date >= weekStart);
  const monthRows = production.filter((row) => row.production_date.startsWith(monthStart));
  const recentRows = production.filter((row) => row.production_date >= format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const animalTotals = animals.map((animal) => ({
    animal,
    yield: recentRows.filter((row) => row.animal_id === animal.id).reduce(
      (sum, row) => sum + Number(row.morning_yield) + Number(row.evening_yield),
      0
    ),
  })).sort((a, b) => b.yield - a.yield);

  return (
    <div className="space-y-5">
      <FarmPageHeader title="Milk Production" description="Record morning and evening yield per animal, monitor daily totals, and compare weekly and monthly production." />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Today Total</div><div className="mt-1 text-2xl font-extrabold text-sky-800">{formatKg(total(todayRows))} L/kg</div><div className="text-xs text-slate-500">Wastage: {formatKg(todayRows.reduce((sum, row) => sum + Number(row.wastage), 0))}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">This Week</div><div className="mt-1 text-2xl font-extrabold">{formatKg(total(weekRows))} L/kg</div><div className="text-xs text-slate-500">Since {weekStart}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">This Month</div><div className="mt-1 text-2xl font-extrabold">{formatKg(total(monthRows))} L/kg</div><div className="text-xs text-slate-500">{monthRows.length} animal-day records</div></div>
      </div>

      <FarmSection title="Daily Animal Yield">
        <form onSubmit={saveYield} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Animal *"><select className={farmInputClass} name="animal_id" required defaultValue=""><option value="" disabled>Select active animal</option>{animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.tag_number} — {animal.name}</option>)}</select></FarmField>
            <FarmField label="Date *"><input className={farmInputClass} name="production_date" type="date" defaultValue={today()} required /></FarmField>
            <FarmField label="Morning yield (L/kg)"><input className={farmInputClass} name="morning_yield" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Evening yield (L/kg)"><input className={farmInputClass} name="evening_yield" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Spoilage / wastage (L/kg)"><input className={farmInputClass} name="wastage" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
          </div>
          <Button type="submit" variant="dairy" disabled={!animals.length}>Save Daily Yield</Button>
          {animals.length === 0 && <p className="text-xs text-amber-700">Register an active animal before recording production.</p>}
        </form>
      </FarmSection>

      <FarmSection title="Recent Individual Yield (Last 7 Days)">
        {loading ? <p className="text-sm text-slate-500">Loading production…</p> : animalTotals.length === 0 ? <p className="text-sm text-slate-500">No active animals or production records.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Animal</th><th className="p-3">7-day yield (L/kg)</th><th className="p-3">Average / recorded day</th></tr></thead><tbody className="divide-y">{animalTotals.map(({ animal, yield: amount }) => { const count = recentRows.filter((row) => row.animal_id === animal.id).length; return <tr key={animal.id}><td className="p-3 font-semibold">{animal.tag_number} · {animal.name}</td><td className="p-3">{formatKg(amount)}</td><td className="p-3">{formatKg(count ? amount / count : 0)}</td></tr>; })}</tbody></table></div>}
      </FarmSection>

      <FarmSection title={`Daily Yield Log (${production.length})`}>
        <div className="divide-y">{production.slice(0, 40).map((row) => {
          const animal = allAnimals.find((item) => item.id === row.animal_id);
          const animalName = animal ? `${animal.tag_number} · ${animal.name}` : "Animal";
          return <div key={row.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><strong>{animalName}</strong><p className="text-xs text-slate-500">{row.production_date}</p></div><div className="text-right">AM {formatKg(Number(row.morning_yield))} · PM {formatKg(Number(row.evening_yield))}<p className="text-xs text-slate-500">Total {formatKg(Number(row.morning_yield) + Number(row.evening_yield))} · Wastage {formatKg(Number(row.wastage))}</p></div></div>;
        })}{production.length === 0 && <p className="py-2 text-sm text-slate-500">No yield records yet.</p>}</div>
      </FarmSection>
    </div>
  );
}
