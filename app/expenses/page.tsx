"use client";

import * as React from "react";
import {
  Receipt,
  PlusCircle,
  Filter,
  Trash2,
  Fuel,
  Wrench,
  UserCheck,
  Package,
  Layers,
  Calendar,
} from "lucide-react";
import { DailyExpense, ExpenseCategory } from "@/types/database";
import { DataStore } from "@/lib/store";
import {
  formatCurrency,
  formatDateDisplay,
  getCurrentMonthString,
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
import { ExpenseFormDialog } from "@/components/expenses/ExpenseFormDialog";
import { ExpenseFormValues } from "@/lib/validations";

export default function ExpensesPage() {
  const [expenses, setExpenses] = React.useState<DailyExpense[]>([]);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(getCurrentMonthString());
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await DataStore.getDailyExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("milk-store-updated", handleUpdate);
    return () => window.removeEventListener("milk-store-updated", handleUpdate);
  }, [loadData]);

  const handleSaveExpense = async (values: ExpenseFormValues) => {
    await DataStore.saveDailyExpense({
      expense_date: values.expense_date,
      category: values.category,
      amount: values.amount,
      description: values.description,
    });
    await loadData();
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm("Are you sure you want to delete this expense record?")) {
      await DataStore.deleteDailyExpense(id);
      await loadData();
    }
  };

  // Filter expenses by selected month and category
  const filteredExpenses = expenses.filter((e) => {
    const matchesMonth = e.expense_date.startsWith(selectedMonth);
    const matchesCat =
      selectedCategory === "ALL" || e.category === selectedCategory;
    return matchesMonth && matchesCat;
  });

  // Calculate category totals for the selected month
  const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(selectedMonth));
  const totalMonthlyAmount = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const getCategoryTotal = (cat: ExpenseCategory) =>
    monthExpenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + Number(e.amount), 0);

  const getCategoryBadge = (cat: ExpenseCategory) => {
    switch (cat) {
      case "Petrol/Fuel":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Fuel</Badge>;
      case "Vehicle Maintenance":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Maintenance</Badge>;
      case "Staff Salary":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Salary</Badge>;
      case "Feed/Containers":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Feed/Containers</Badge>;
      default:
        return <Badge variant="secondary">Misc</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-rose-600" />
            Daily Operational Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track overhead costs including fuel, bike servicing, staff wages, feed, and containers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="destructive"
            className="gap-2 shadow-sm"
            onClick={() => setModalOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Record Expense</span>
          </Button>
        </div>
      </div>

      {/* Month Selector & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-700">Filter Month:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs sm:text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-300 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: "All", value: "ALL" },
            { label: "Fuel", value: "Petrol/Fuel" },
            { label: "Maintenance", value: "Vehicle Maintenance" },
            { label: "Salary", value: "Staff Salary" },
            { label: "Containers", value: "Feed/Containers" },
            { label: "Misc", value: "Miscellaneous" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setSelectedCategory(item.value)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === item.value
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Breakdown Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Month */}
        <div className="col-span-2 lg:col-span-1 rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider block">
            Total Monthly Spend
          </span>
          <p className="text-2xl font-extrabold text-rose-900 mt-1">
            {formatCurrency(totalMonthlyAmount)}
          </p>
          <span className="text-[11px] text-rose-600 mt-1 block">
            {monthExpenses.length} transactions
          </span>
        </div>

        {/* Petrol / Fuel */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Fuel & Petrol</span>
            <Fuel className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(getCategoryTotal("Petrol/Fuel"))}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Delivery routes</span>
        </div>

        {/* Maintenance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Maintenance</span>
            <Wrench className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(getCategoryTotal("Vehicle Maintenance"))}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Bike/Vehicle fixes</span>
        </div>

        {/* Staff Salary */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Staff Salary</span>
            <UserCheck className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(getCategoryTotal("Staff Salary"))}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Delivery staff pay</span>
        </div>

        {/* Feed & Containers */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Feed / Supplies</span>
            <Package className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(getCategoryTotal("Feed/Containers"))}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Cans, ice & feed</span>
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-600 border-t-transparent" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No expenses recorded</h3>
          <p className="mt-1 text-xs text-slate-500">
            No expenses found matching the selected month and category.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setModalOpen(true)}
          >
            Log New Expense
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description / Notes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12 text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.map((exp) => (
              <TableRow key={exp.id}>
                <TableCell className="font-medium whitespace-nowrap text-xs text-slate-700">
                  {formatDateDisplay(exp.expense_date)}
                </TableCell>
                <TableCell>{getCategoryBadge(exp.category)}</TableCell>
                <TableCell className="text-xs text-slate-700 max-w-sm truncate">
                  {exp.description || "-"}
                </TableCell>
                <TableCell className="text-right font-bold text-rose-600 text-sm">
                  {formatCurrency(exp.amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={() => handleDeleteExpense(exp.id)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Expense Modal */}
      <ExpenseFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaveExpense={handleSaveExpense}
      />
    </div>
  );
}
