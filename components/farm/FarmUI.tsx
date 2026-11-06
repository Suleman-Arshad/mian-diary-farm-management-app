import * as React from "react";

export function FarmPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </header>
  );
}

export function FarmSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-sm font-bold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

export function FarmField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-xs font-semibold text-slate-600">
      <span>{label}</span>
      {children}
    </label>
  );
}

export const farmFormGrid = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";
export const farmInputClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500";
