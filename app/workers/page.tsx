"use client";

import * as React from "react";
import { FarmStore } from "@/lib/farmStore";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Worker, WorkerPayroll } from "@/types/database";
import { FarmField, FarmPageHeader, FarmSection, farmFormGrid, farmInputClass } from "@/components/farm/FarmUI";
import { formatCurrency, getCurrentMonthString, getTodayDateString } from "@/lib/utils";
import { calculatePayrollPeriodPayables, calculateWorkerPayables } from "@/lib/farmMetrics";

export default function WorkersPage() {
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [payrolls, setPayrolls] = React.useState<WorkerPayroll[]>([]);
  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthString());
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const [workerRows, payrollRows] = await Promise.all([
        FarmStore.getWorkers(),
        FarmStore.getWorkerPayrolls(),
      ]);
      setWorkers(workerRows);
      setPayrolls(payrollRows);
    } catch (error) {
      console.error("Could not load worker payroll", error);
      toast.error(error instanceof Error ? error.message : "Could not load worker payroll.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    window.addEventListener("milk-store-updated", load);
    return () => window.removeEventListener("milk-store-updated", load);
  }, [load]);

  const addWorker = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await FarmStore.saveWorker({
        name: String(form.get("name")).trim(),
        phone: String(form.get("phone") || "").trim() || null,
        wage_type: String(form.get("wage_type")) as Worker["wage_type"],
        wage_rate: Number(form.get("wage_rate")),
        is_active: true,
      });
      formElement.reset();
      await load();
      toast.success("Worker profile created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create worker.");
    }
  };

  const addPayroll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const worker = workers.find((row) => row.id === String(form.get("worker_id")));
    if (!worker) {
      toast.error("Choose an active worker.");
      return;
    }
    const daysWorked = Number(form.get("days_worked") || 0);
    const paid = Number(form.get("amount_paid") || 0);
    const advances = Number(form.get("advances") || 0);
    try {
      await FarmStore.saveWorkerPayroll({
        worker_id: worker.id,
        period_month: String(form.get("period_month")),
        payment_date: String(form.get("payment_date")),
        days_worked: daysWorked,
        base_wage: Number(form.get("base_wage") || 0),
        advances,
        bonuses: Number(form.get("bonuses") || 0),
        deductions: Number(form.get("deductions") || 0),
        overtime: Number(form.get("overtime") || 0),
        amount_paid: paid,
      });
      formElement.reset();
      await load();
      toast.success("Payroll payment recorded and expense deducted from that date's sales.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save payroll entry.");
    }
  };

  const periodRows = payrolls.filter((row) => row.period_month === selectedMonth);
  const monthEarnings = periodRows.reduce(
    (sum, row) => sum + Number(row.base_wage) + Number(row.bonuses) + Number(row.overtime) - Number(row.deductions),
    0
  );
  const monthPaid = periodRows.reduce((sum, row) => sum + Number(row.amount_paid) + Number(row.advances), 0);
  const outstanding = calculatePayrollPeriodPayables(payrolls, selectedMonth);
  const allOutstanding = calculateWorkerPayables(payrolls, workers, getCurrentMonthString());

  return (
    <div className="space-y-5">
      <FarmPageHeader title="Workers & Payroll" description="Staff profiles, monthly salary or daily wages, advances, bonuses, deductions, overtime, and payments." />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Active Workers</div><div className="mt-1 text-2xl font-extrabold">{workers.filter((worker) => worker.is_active).length}</div></div>
        <div className="rounded-xl border bg-white p-4"><div className="text-xs font-semibold uppercase text-slate-500">Payroll Paid · {selectedMonth}</div><div className="mt-1 text-2xl font-extrabold text-emerald-700">{formatCurrency(monthPaid)}</div></div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="text-xs font-semibold uppercase text-slate-600">Outstanding Payables</div><div className="mt-1 text-2xl font-extrabold text-amber-800">{formatCurrency(allOutstanding)}</div></div>
      </div>

      <FarmSection title="Register Worker">
        <form onSubmit={addWorker} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Name *"><input className={farmInputClass} name="name" required /></FarmField>
            <FarmField label="Phone"><input className={farmInputClass} name="phone" type="tel" /></FarmField>
            <FarmField label="Wage type"><select className={farmInputClass} name="wage_type"><option>Monthly Salary</option><option>Daily Wages</option></select></FarmField>
            <FarmField label="Salary / daily rate (Rs.) *"><input className={farmInputClass} name="wage_rate" type="number" step="0.01" min="0" required /></FarmField>
          </div>
          <Button type="submit" variant="dairy">Add Worker</Button>
        </form>
      </FarmSection>

      <FarmSection title="Record Payroll / Advance Payment">
        <p className="mb-3 text-xs text-slate-500">Amounts paid and advances automatically enter daily expenses. Do not record the same payroll payment again under Daily Expenses.</p>
        <form onSubmit={addPayroll} className="space-y-4">
          <div className={farmFormGrid}>
            <FarmField label="Worker *"><select className={farmInputClass} name="worker_id" required defaultValue=""><option value="" disabled>Select worker</option>{workers.filter((worker) => worker.is_active).map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.wage_type} ({formatCurrency(Number(worker.wage_rate))})</option>)}</select></FarmField>
            <FarmField label="Payroll month *"><input className={farmInputClass} name="period_month" type="month" defaultValue={selectedMonth} required /></FarmField>
            <FarmField label="Payment date *"><input className={farmInputClass} name="payment_date" type="date" defaultValue={getTodayDateString()} required /></FarmField>
            <FarmField label="Days worked (daily wage)"><input className={farmInputClass} name="days_worked" type="number" step="0.5" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Wages earned this entry (Rs.)"><input className={farmInputClass} name="base_wage" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Advance (Rs.)"><input className={farmInputClass} name="advances" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Bonus (Rs.)"><input className={farmInputClass} name="bonuses" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Deductions (Rs.)"><input className={farmInputClass} name="deductions" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Overtime (Rs.)"><input className={farmInputClass} name="overtime" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
            <FarmField label="Amount paid now (Rs.)"><input className={farmInputClass} name="amount_paid" type="number" step="0.01" min="0" defaultValue="0" /></FarmField>
          </div>
          <Button type="submit" variant="outline" disabled={!workers.some((worker) => worker.is_active)}>Save Payroll Entry</Button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Enter each payment or advance as a separate entry. Record salary or daily wages in “Wages earned” once when earned; for a subsequent payment tranche, enter 0 wages and only its payment amounts.</p>
      </FarmSection>

      <FarmSection title="Monthly Payroll Report">
        <div className="mb-4 flex flex-wrap items-center gap-2"><label className="text-xs font-semibold text-slate-600" htmlFor="payroll-month">Month</label><input id="payroll-month" className={farmInputClass + " max-w-48"} type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /><span className="ml-auto text-sm font-semibold">Earnings {formatCurrency(monthEarnings)} · Paid {formatCurrency(monthPaid)} · Balance {formatCurrency(outstanding)}</span></div>
        {loading ? <p className="text-sm text-slate-500">Loading payroll…</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Worker</th><th className="p-3">Date</th><th className="p-3">Wages</th><th className="p-3">Adjustments</th><th className="p-3">Advance + Paid</th><th className="p-3">Balance</th></tr></thead><tbody className="divide-y">{periodRows.map((row) => { const worker = workers.find((item) => item.id === row.worker_id); const due = Number(row.base_wage) + Number(row.bonuses) + Number(row.overtime) - Number(row.deductions); return <tr key={row.id}><td className="p-3 font-semibold">{worker?.name || "Worker"}</td><td className="p-3">{row.payment_date}</td><td className="p-3">{formatCurrency(Number(row.base_wage))}</td><td className="p-3">{formatCurrency(Number(row.bonuses) + Number(row.overtime) - Number(row.deductions))}</td><td className="p-3">{formatCurrency(Number(row.advances) + Number(row.amount_paid))}</td><td className="p-3">{formatCurrency(Math.max(0, due - Number(row.advances) - Number(row.amount_paid)))}</td></tr>; })}{periodRows.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={6}>No payroll transactions in this month.</td></tr>}</tbody></table></div>}
      </FarmSection>
    </div>
  );
}
