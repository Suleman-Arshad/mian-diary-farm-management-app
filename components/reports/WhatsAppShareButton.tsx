"use client";

import * as React from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MonthlyBillSummary } from "@/types/database";
import { formatCurrency, formatKg } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { InvoicePDFDocument } from "@/components/reports/InvoicePDFDocument"; // Ensure correct import path
import { toast } from "sonner"; // Or your project's toast library

interface WhatsAppShareButtonProps {
  bill: MonthlyBillSummary;
  className?: string;
}

export function WhatsAppShareButton({ bill, className }: WhatsAppShareButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const hasPhone = Boolean(bill.customer?.phone);

  const handleShare = async () => {
    if (!hasPhone) return;
    setLoading(true);

    try {
      // 1. Clean Phone Number
      const rawPhone = bill.customer.phone || "";
      let cleanPhone = rawPhone.replace(/[^0-9]/g, "");
      if (cleanPhone.startsWith("0")) {
        cleanPhone = "92" + cleanPhone.substring(1);
      }

      // 2. Draft Summary Text
      const messageText = `*MIAN DAIRY FARM - MONTHLY BILL* 🥛\nCustomer: ${bill.customer.name}\nBilling Month: ${bill.monthName}\nNet Payable: ${formatCurrency(bill.netPayableAmount)}\n\nPlease find your itemized PDF bill attached below. Thank you!`;

      // 3. Generate PDF Blob in Memory (No Local Download)
      const pdfBlob = await pdf(<InvoicePDFDocument bill={bill} />).toBlob();
      const fileName = `Milk_Bill_${bill.customer.name.replace(/\s+/g, "_")}_${bill.monthName}.pdf`;
      const file = new File([pdfBlob], fileName, { type: "application/pdf" });

      // 4. Mobile Devices: Native Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Milk Bill - ${bill.customer.name}`,
          text: messageText,
        });
        toast.success("Bill shared successfully!");
      } else {
        // 5. Desktop Fallback: Open WhatsApp Chat with Pre-filled Text
        const encodedText = encodeURIComponent(messageText);
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        // Optional: Trigger direct in-memory download if browser blocks direct file sharing
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);

        toast.info("WhatsApp chat opened & PDF generated for easy attachment.");
      }
    } catch (error) {
      console.error("Error sharing PDF via WhatsApp:", error);
      toast.error("Failed to share PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleShare}
      disabled={!hasPhone || loading}
      title={!hasPhone ? "No phone number on record for this customer" : "Send WhatsApp bill"}
      className={`gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
      ) : (
        <MessageSquare className="h-4 w-4 text-emerald-600 fill-emerald-100" />
      )}
      <span>{loading ? "Preparing PDF..." : "Send via WhatsApp"}</span>
    </Button>
  );
}