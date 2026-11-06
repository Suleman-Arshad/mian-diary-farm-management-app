"use client";

import * as React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { FarmStore } from "@/lib/farmStore";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Animal, AnimalRecord } from "@/types/database";
import {
  FarmField,
  FarmPageHeader,
  FarmSection,
  farmFormGrid,
  farmInputClass,
} from "@/components/farm/FarmUI";

const today = () => new Date().toISOString().slice(0, 10);
const animalAge = (birthDate: string | null) => {
  if (!birthDate) return "Unknown";
  const ageInMonths = Math.max(
    0,
    Math.floor((Date.now() - new Date(`${birthDate}T00:00:00`).getTime()) / 2629800000)
  );
  return ageInMonths >= 12 ? `${Math.floor(ageInMonths / 12)} yr` : `${ageInMonths} mo`;
};

export default function AnimalsPage() {
  const [animals, setAnimals] = React.useState<Animal[]>([]);
  const [records, setRecords] = React.useState<AnimalRecord[]>([]);
  const [saleAnimal, setSaleAnimal] = React.useState<Animal | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const [animalRows, recordRows] = await Promise.all([
        FarmStore.getAnimals(),
        FarmStore.getAnimalRecords(),
      ]);
      setAnimals(animalRows);
      setRecords(recordRows);
    } catch (error) {
      console.error("Could not load animal records", error);
      toast.error(error instanceof Error ? error.message : "Could not load animal records.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    window.addEventListener("milk-store-updated", load);
    return () => window.removeEventListener("milk-store-updated", load);
  }, [load]);

  const submitAnimal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const purchasePrice = Number(form.get("purchase_price") || 0);
    const salePrice = form.get("sale_price");
    try {
      await FarmStore.saveAnimal({
        tag_number: String(form.get("tag_number")).trim(),
        name: String(form.get("name")).trim(),
        animal_type: String(form.get("animal_type")) as Animal["animal_type"],
        breed: String(form.get("breed") || "").trim() || null,
        birth_date: String(form.get("birth_date") || "") || null,
        photo_url: String(form.get("photo_url") || "").trim() || null,
        status: String(form.get("status")) as Animal["status"],
        purchase_price: purchasePrice,
        purchase_date: String(form.get("purchase_date") || "") || null,
        sale_price: salePrice ? Number(salePrice) : null,
        sale_date: String(form.get("sale_date") || "") || null,
      });
      formElement.reset();
      await load();
      toast.success("Animal profile saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save animal.");
    }
  };

  const submitRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.saveAnimalRecord({
        animal_id: String(form.get("animal_id")),
        record_type: String(form.get("record_type")) as AnimalRecord["record_type"],
        record_date: String(form.get("record_date")),
        description: String(form.get("description")).trim(),
        next_due_date: String(form.get("next_due_date") || "") || null,
        cost: Number(form.get("cost") || 0),
      });
      formElement.reset();
      await load();
      toast.success("Animal history updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save history.");
    }
  };

  const deleteAnimal = async (animal: Animal) => {
    if (!window.confirm(`Delete ${animal.name} and its health and yield history?`)) return;
    try {
      await FarmStore.deleteAnimal(animal.id);
      await load();
      toast.success("Animal and related history deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete animal.");
    }
  };

  const submitSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!saleAnimal) return;
    const form = new FormData(event.currentTarget);
    try {
      await FarmStore.saveAnimal({
        ...saleAnimal,
        status: "Sold",
        sale_price: Number(form.get("sale_price")),
        sale_date: String(form.get("sale_date")),
      });
      setSaleAnimal(null);
      await load();
      toast.success("Animal sale recorded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record animal sale.");
    }
  };

  const markDeceased = async (animal: Animal) => {
    if (!window.confirm(`Mark ${animal.name} as deceased?`)) return;
    try {
      await FarmStore.saveAnimal({ ...animal, status: "Deceased" });
      await load();
      toast.success("Animal status updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update animal status.");
    }
  };

  const upcoming = records.filter(
    (record) => record.next_due_date && record.next_due_date >= today()
  );

  return (
    <div className="space-y-5">
      <FarmPageHeader
        title="Animal Management"
        description="Animal profiles, purchase and sale records, health history, vaccinations, and calving."
      />

      {upcoming.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {upcoming.length} vaccination, treatment, or calving follow-up reminder
            {upcoming.length === 1 ? "" : "s"} due.
          </span>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {(["Cow", "Buffalo", "Calf"] as const).map((type) => {
          const typeAnimals = animals.filter((animal) => animal.animal_type === type);
          const purchases = typeAnimals.reduce((sum, animal) => sum + Number(animal.purchase_price), 0);
          const sales = typeAnimals.reduce((sum, animal) => sum + Number(animal.sale_price || 0), 0);
          return (
            <div key={type} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{type} Financial Log</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900">{typeAnimals.length} animals</div>
              <div className="mt-1 text-xs text-slate-600">Purchases Rs. {purchases.toLocaleString()} · Sales Rs. {sales.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      <FarmSection title="Register Animal">
        <form onSubmit={submitAnimal} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Unique tag / ID *"><input className={farmInputClass} name="tag_number" required /></FarmField>
            <FarmField label="Name *"><input className={farmInputClass} name="name" required /></FarmField>
            <FarmField label="Type">
              <select className={farmInputClass} name="animal_type"><option>Cow</option><option>Buffalo</option><option>Calf</option></select>
            </FarmField>
            <FarmField label="Breed"><input className={farmInputClass} name="breed" /></FarmField>
            <FarmField label="Date of birth"><input className={farmInputClass} type="date" name="birth_date" /></FarmField>
            <FarmField label="Photo URL"><input className={farmInputClass} type="url" name="photo_url" /></FarmField>
            <FarmField label="Status">
              <select className={farmInputClass} name="status"><option>Active</option><option>Sold</option><option>Deceased</option></select>
            </FarmField>
            <FarmField label="Purchase price (Rs.)"><input className={farmInputClass} type="number" min="0" step="0.01" name="purchase_price" defaultValue="0" /></FarmField>
            <FarmField label="Purchase date"><input className={farmInputClass} type="date" name="purchase_date" /></FarmField>
            <FarmField label="Sale price (Rs.)"><input className={farmInputClass} type="number" min="0" step="0.01" name="sale_price" /></FarmField>
            <FarmField label="Sale date"><input className={farmInputClass} type="date" name="sale_date" /></FarmField>
          </div>
          <Button type="submit" variant="dairy">Save Animal</Button>
        </form>
      </FarmSection>

      <FarmSection title="Add Health, Vaccination, or Calving Record">
        <form onSubmit={submitRecord} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Animal *">
              <select className={farmInputClass} name="animal_id" required defaultValue="">
                <option value="" disabled>Select animal</option>
                {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.tag_number} — {animal.name}</option>)}
              </select>
            </FarmField>
            <FarmField label="Record type">
              <select className={farmInputClass} name="record_type"><option>Medical</option><option>Vaccination</option><option>Calving</option></select>
            </FarmField>
            <FarmField label="Record date *"><input className={farmInputClass} type="date" name="record_date" defaultValue={today()} required /></FarmField>
            <FarmField label="Next due / checkup"><input className={farmInputClass} type="date" name="next_due_date" /></FarmField>
            <FarmField label="Cost (Rs.)"><input className={farmInputClass} type="number" min="0" step="0.01" name="cost" defaultValue="0" /></FarmField>
            <FarmField label="Details *"><input className={farmInputClass} name="description" required /></FarmField>
          </div>
          <Button type="submit" variant="outline" disabled={!animals.length}>Add History</Button>
        </form>
      </FarmSection>

      <FarmSection title={`Animal Register (${animals.length})`}>
        {loading ? <p className="text-sm text-slate-500">Loading animals…</p> : animals.length === 0 ? (
          <p className="text-sm text-slate-500">No animals registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Animal</th><th className="p-3">Type / Breed</th><th className="p-3">Status</th><th className="p-3">Purchase</th><th className="p-3">Sale</th><th className="p-3">Age / DOB</th><th className="p-3"></th></tr></thead>
              <tbody className="divide-y">
                {animals.map((animal) => (
                  <tr key={animal.id}>
                    <td className="p-3"><div className="flex items-center gap-2 font-semibold">{animal.photo_url ? <img src={animal.photo_url} alt={`${animal.name} profile`} className="h-9 w-9 rounded-full border object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-xs font-bold text-sky-700">{animal.name.slice(0, 1).toUpperCase()}</span>}<span>{animal.tag_number} · {animal.name}</span></div></td>
                    <td className="p-3">{animal.animal_type}{animal.breed ? ` / ${animal.breed}` : ""}</td>
                    <td className="p-3">{animal.status}</td>
                    <td className="p-3">{animal.purchase_date || "—"} · Rs. {Number(animal.purchase_price).toLocaleString()}</td>
                    <td className="p-3">{animal.sale_date || "—"}{animal.sale_price ? ` · Rs. ${Number(animal.sale_price).toLocaleString()}` : ""}</td>
                    <td className="p-3">{animalAge(animal.birth_date)}{animal.birth_date ? ` · ${animal.birth_date}` : ""}</td>
                    <td className="p-3"><div className="flex items-center gap-1">{animal.status === "Active" && <><Button size="sm" variant="outline" onClick={() => setSaleAnimal(animal)}>Sale</Button><Button size="sm" variant="ghost" onClick={() => void markDeceased(animal)}>Deceased</Button></>}<Button size="iconSm" variant="ghost" aria-label={`Delete ${animal.name}`} onClick={() => void deleteAnimal(animal)}><Trash2 className="h-4 w-4 text-rose-600" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {saleAnimal && (
          <form onSubmit={submitSale} className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
            <p className="mb-3 text-sm font-semibold">Record sale for {saleAnimal.tag_number} · {saleAnimal.name}</p>
            <div className={farmFormGrid}>
              <FarmField label="Sale price (Rs.) *"><input className={farmInputClass} name="sale_price" type="number" step="0.01" min="0" required /></FarmField>
              <FarmField label="Sale date *"><input className={farmInputClass} name="sale_date" type="date" defaultValue={today()} required /></FarmField>
            </div>
            <div className="mt-3 flex gap-2"><Button type="submit" variant="dairy">Save Sale</Button><Button type="button" variant="outline" onClick={() => setSaleAnimal(null)}>Cancel</Button></div>
          </form>
        )}
      </FarmSection>

      <FarmSection title={`History (${records.length})`}>
        <div className="divide-y">
          {records.length === 0 ? <p className="py-2 text-sm text-slate-500">Health and production-related history will appear here.</p> : records.map((record) => {
            const animal = animals.find((row) => row.id === record.animal_id);
            return <div key={record.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><div><strong>{animal?.tag_number || "Animal"} · {record.record_type}</strong><p className="text-slate-600">{record.description}</p></div><div className="text-right text-xs text-slate-500">{record.record_date}{record.next_due_date ? ` · Next: ${record.next_due_date}` : ""}<div>Rs. {Number(record.cost).toLocaleString()}</div></div></div>;
          })}
        </div>
      </FarmSection>
    </div>
  );
}
