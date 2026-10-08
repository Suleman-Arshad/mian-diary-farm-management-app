"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Search,
  Wallet,
  Phone,
  MapPin,
  ChevronRight,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
} from "lucide-react";
import { Customer } from "@/types/database";
import { DataStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
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
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { PaymentDialog } from "@/components/customers/PaymentDialog";
import { CustomerFormValues, PaymentFormValues } from "@/lib/validations";

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customerBalances, setCustomerBalances] = React.useState<Map<string, number>>(
    new Map()
  );
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterActive, setFilterActive] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Dialog states
  const [customerModalOpen, setCustomerModalOpen] = React.useState(false);
  const [customerToEdit, setCustomerToEdit] = React.useState<Customer | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [preselectedCustId, setPreselectedCustId] = React.useState<string | undefined>();

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [data, balances] = await Promise.all([
        DataStore.getCustomers(),
        DataStore.getCustomerBalances(),
      ]);
      setCustomers(data);
      setCustomerBalances(balances);
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

  // Handle Add/Edit Customer Save
  const handleSaveCustomer = async (values: CustomerFormValues) => {
    try {
      await DataStore.saveCustomer({
        ...(customerToEdit ? { id: customerToEdit.id } : {}),
        name: values.name,
        phone: values.phone && typeof values.phone === "string" && values.phone.trim() ? values.phone.trim() : null,
        address: values.address,
        fixed_rate_per_kg: parseFloat(String(values.fixed_rate_per_kg)),
        previous_balance: parseFloat(String(values.previous_balance)) || 0,
        is_active: values.is_active,
      });
      await loadData();
      showToast(customerToEdit ? "Customer details updated successfully!" : "New customer registered successfully!");
    } catch (error: any) {
      if (error) console.error("Supabase Error:", error);
      const msg = error?.message || "Failed to save customer to database.";
      showToast(msg, "error");
      throw error;
    }
  };

  // Handle Payment Save
  const handleSavePayment = async (values: PaymentFormValues) => {
    try {
      if (!values.customer_id) {
        throw new Error("Customer foreign key is required to record a payment.");
      }
      await DataStore.saveCustomerPayment({
        customer_id: values.customer_id,
        payment_date: values.payment_date,
        amount_paid: parseFloat(String(values.amount_paid)),
        payment_mode: values.payment_mode,
        notes: values.notes,
      });
      await loadData();
      showToast("Payment recorded successfully!");
    } catch (error: any) {
      if (error) console.error("Supabase Error:", error);
      const msg = error?.message || "Failed to save payment to database.";
      showToast(msg, "error");
      throw error;
    }
  };

  // Handle Delete Customer
  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await DataStore.deleteCustomer(customerToDelete.id);
      setDeleteDialogOpen(false);
      const deletedName = customerToDelete.name;
      setCustomerToDelete(null);
      await loadData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("milk-store-updated"));
      }
      showToast(`"${deletedName}" deleted successfully.`);
    } catch (err: any) {
      if (err) console.error("Supabase Error:", err);
      showToast(err?.message || "Failed to delete customer. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered customer list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterActive === "ACTIVE") return c.is_active;
    if (filterActive === "INACTIVE") return !c.is_active;
    return true;
  });

  const totalOutstanding = customers.reduce(
    (sum, c) => sum + (customerBalances.get(c.id) || 0),
    0
  );
  const activeCount = customers.filter((c) => c.is_active).length;

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

      {/* Top Header & Quick Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-600" />
            Customer Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage regular household delivery accounts, fixed rates, and ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Button
            variant="outline"
            className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={() => {
              setPreselectedCustId(undefined);
              setPaymentModalOpen(true);
            }}
          >
            <Wallet className="h-4 w-4 text-emerald-600" />
            <span>Collect Payment</span>
          </Button>

          <Button
            variant="dairy"
            className="gap-2"
            onClick={() => {
              setCustomerToEdit(null);
              setCustomerModalOpen(true);
            }}
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Total Customers</span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{customers.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Active Deliveries</span>
          <p className="text-xl sm:text-2xl font-bold text-sky-600 mt-1">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm col-span-2 sm:col-span-1 lg:col-span-2">
          <span className="text-xs font-medium text-slate-500">Total Outstanding Balance</span>
          <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone or address..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterActive(filter)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filterActive === filter
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {filter === "ALL" ? "All" : filter === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* Customers List / Table */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No customers found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {searchQuery
              ? "Try refining your search terms."
              : "Get started by registering your first customer."}
          </p>
          {!searchQuery && (
            <Button
              variant="dairy"
              size="sm"
              className="mt-4"
              onClick={() => {
                setCustomerToEdit(null);
                setCustomerModalOpen(true);
              }}
            >
              Add Customer Now
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact &amp; Address</TableHead>
                  <TableHead>Fixed Rate</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-semibold text-slate-900 hover:text-sky-600 hover:underline flex items-center gap-1.5"
                      >
                        {c.name}
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {c.phone ? (
                          <div className="flex items-center gap-1 text-slate-600">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{c.phone}</span>
                          </div>
                        ) : null}
                        {c.address && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-xs">{c.address}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-900">
                        Rs. {c.fixed_rate_per_kg}
                      </span>
                      <span className="text-[11px] text-slate-500"> / KG</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-bold ${
                          (customerBalances.get(c.id) || 0) > 0
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(customerBalances.get(c.id) || 0)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {c.is_active ? (
                        <Badge variant="success" className="gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Collect Payment */}
                        <Button
                          variant="ghost"
                          size="iconSm"
                          title="Collect Payment"
                          onClick={() => {
                            setPreselectedCustId(c.id);
                            setPaymentModalOpen(true);
                          }}
                          className="text-emerald-600 hover:bg-emerald-50"
                        >
                          <Wallet className="h-4 w-4" />
                        </Button>
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="iconSm"
                          title="Edit Customer"
                          onClick={() => {
                            setCustomerToEdit(c);
                            setCustomerModalOpen(true);
                          }}
                          className="text-slate-600 hover:bg-slate-100"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {/* Ledger */}
                        <Link href={`/customers/${c.id}`}>
                          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Ledger</span>
                          </Button>
                        </Link>
                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="iconSm"
                          title="Delete Customer"
                          onClick={() => {
                            setCustomerToDelete(c);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/customers/${c.id}`}
                      className="text-base font-bold text-slate-900 hover:text-sky-600 flex items-center gap-1"
                    >
                      {c.name}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </Link>
                    {c.phone && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {c.phone}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Badge + delete icon on mobile */}
                  <div className="flex items-center gap-1.5">
                    {c.is_active ? (
                      <Badge variant="success" className="text-[10px]">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                    )}
                    <button
                      title="Delete Customer"
                      onClick={() => {
                        setCustomerToDelete(c);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {c.address && (
                  <p className="text-xs text-slate-600 flex items-center gap-1 line-clamp-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {c.address}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500">Rate: </span>
                    <span className="font-semibold text-slate-800">Rs. {c.fixed_rate_per_kg}/KG</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Balance: </span>
                    <span
                      className={`font-bold ${
                        (customerBalances.get(c.id) || 0) > 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(customerBalances.get(c.id) || 0)}
                    </span>
                  </div>
                </div>

                {/* Mobile action buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs py-1.5 h-8"
                    onClick={() => {
                      setPreselectedCustId(c.id);
                      setPaymentModalOpen(true);
                    }}
                  >
                    <Wallet className="h-3.5 w-3.5 mr-1" />
                    Pay
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-slate-700 text-xs py-1.5 h-8"
                    onClick={() => {
                      setCustomerToEdit(c);
                      setCustomerModalOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>

                  <Link href={`/customers/${c.id}`} className="w-full">
                    <Button variant="dairy" size="sm" className="w-full text-xs py-1.5 h-8">
                      Ledger
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Customer Add/Edit Dialog */}
      <CustomerFormDialog
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
        customerToEdit={customerToEdit}
        onSave={handleSaveCustomer}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        customers={customers}
        preselectedCustomerId={preselectedCustId}
        onSavePayment={handleSavePayment}
      />

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && customerToDelete && (
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
                <h3 className="text-base font-bold text-slate-900">Delete Customer</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-700">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900">{customerToDelete.name}</span>?
              All associated sales records and payment history will also be permanently removed.
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
                onClick={handleDeleteCustomer}
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