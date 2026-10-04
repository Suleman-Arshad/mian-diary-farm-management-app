"use client";

import * as React from "react";
import { MessageSquare, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthlyBillSummary } from "@/types/database";
import { formatCurrency, formatKg } from "@/lib/utils";

interface WhatsAppShareButtonProps {
  bill: MonthlyBillSummary;
  className?: string;
}

export function WhatsAppShareButton({ bill, className }: WhatsAppShareButtonProps) {
  const handleShare = () => {
    // Clean phone number: remove dashes, spaces, leading 0 replaced with 92 for Pakistan or international format
    let cleanPhone = bill.customer.phone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "92" + cleanPhone.substring(1);
    }

    const message = `*MIAN DAIRY FARM - MONTHLY BILL* 🥛
-------------------------------------
*Customer:* ${bill.customer.name}
*Billing Month:* ${bill.monthName}

📊 *Bill Summary:*
• Total Milk Supplied: *${formatKg(bill.totalQtyKg)}*
• Rate / KG: *Rs. ${bill.customer.fixed_rate_per_kg}*
• This Month Charges: *${formatCurrency(bill.totalMilkCost)}*
• Previous Balance: *${formatCurrency(bill.previousBalance)}*
• Total Payments Made: *- ${formatCurrency(bill.totalPayments)}*

💰 *TOTAL NET PAYABLE: ${formatCurrency(bill.netPayableAmount)}*
-------------------------------------
💳 *Payment Methods Accepted:*
• Cash to Delivery Boy
• EasyPaisa / JazzCash: *0300-1234567*
• Bank Transfer: Ask for IBAN

_Please clear your milk dues before the 5th of the month. Thank you for choosing Mian Dairy Farm!_`;

    const encodedText = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      className={`gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 ${className}`}
    >
      <MessageSquare className="h-4 w-4 text-emerald-600 fill-emerald-100" />
      <span>Send via WhatsApp</span>
    </Button>
  );
}
