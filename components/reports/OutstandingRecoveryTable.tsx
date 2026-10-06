"use client";

import * as React from "react";
import Link from "next/link";
import { Customer } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
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
import {
  AlertCircle,
  MessageSquare,
  Wallet,
  ChevronRight,
  Phone,
  FileSpreadsheet,
} from "lucide-react";

interface OutstandingRecoveryTableProps {
  customers: Customer[];
  onCollectPayment: (customerId: string) => void;
}

export function OutstandingRecoveryTable({
  customers,
  onCollectPayment,
}: OutstandingRecoveryTableProps) {
  // Filter customers who owe money
  const debtors = customers
    .filter((c) => Number(c.previous_balance) > 0)
    .sort((a, b) => Number(b.previous_balance) - Number(a.previous_balance));

  const totalOverdue = debtors.reduce(
    (sum, c) => sum + Number(c.previous_balance),
    0
  );

  const handleSendReminder = (customer: Customer) => {
    if (!customer.phone) {
      alert(`No phone number on record for ${customer.name}. Please update their profile first.`);
      return;
    }
    let cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "92" + cleanPhone.substring(1);
    }

    const message = `*MIAN DAIRY FARM - RECOVERY REMINDER* 🥛
-------------------------------------
Dear ${customer.name},

This is a gentle reminder that your pending milk account balance is *${formatCurrency(
      customer.previous_balance
    )}*.

Kindly clear this payment at your earliest convenience with your delivery boy or via:
• EasyPaisa / JazzCash: *0300-1234567*

Thank you for your continuous cooperation!
_Mian Dairy Farm Management_`;

    const encodedText = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Recovery summary banner */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Outstanding Account Receivables
            </h3>
            <p className="text-xs text-slate-600">
              {debtors.length} customer(s) have pending balances awaiting collection.
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-xs text-rose-700 font-semibold block">Total Pending Dues</span>
          <span className="text-2xl font-extrabold text-rose-700">
            {formatCurrency(totalOverdue)}
          </span>
        </div>
      </div>

      {debtors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-8 text-center text-xs text-emerald-800 font-medium">
          Awesome! No pending customer balances found. All accounts are settled.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone / WhatsApp</TableHead>
              <TableHead>Rate / KG</TableHead>
              <TableHead>Pending Dues</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debtors.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-semibold text-slate-900 hover:text-sky-600 flex items-center gap-1"
                  >
                    {c.name}
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                  </Link>
                  {c.address && (
                    <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                      {c.address}
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {c.phone}
                  </div>
                </TableCell>

                <TableCell className="text-xs font-semibold text-slate-800">
                  Rs. {c.fixed_rate_per_kg}
                </TableCell>

                <TableCell className="font-extrabold text-rose-600 text-sm">
                  {formatCurrency(c.previous_balance)}
                </TableCell>

                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 gap-1"
                      onClick={() => handleSendReminder(c)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Reminder</span>
                    </Button>

                    <Button
                      variant="dairy"
                      size="sm"
                      className="h-8 px-2.5 text-xs gap-1"
                      onClick={() => onCollectPayment(c.id)}
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      <span>Collect</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
