import type { ReactElement } from "react";

export function openPdfPrintWindow(title: string): Window {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Allow pop-ups for this site to print the bill.");
  }

  printWindow.document.title = title;
  printWindow.document.body.textContent = "Preparing bill for printing...";
  printWindow.document.body.style.fontFamily = "sans-serif";
  printWindow.document.body.style.padding = "2rem";
  return printWindow;
}

export async function printPdfDocument(
  documentElement: ReactElement,
  title: string,
  existingPrintWindow?: Window
): Promise<void> {
  const printWindow = existingPrintWindow ?? openPdfPrintWindow(title);

  try {
    const { pdf } = await import("@react-pdf/renderer");
    const blob = await pdf(documentElement).toBlob();
    const url = URL.createObjectURL(blob);

    printWindow.addEventListener(
      "beforeunload",
      () => URL.revokeObjectURL(url),
      { once: true }
    );
    printWindow.addEventListener(
      "load",
      () => {
        if (!printWindow.closed) {
          printWindow.focus();
          window.setTimeout(() => printWindow.print(), 300);
        }
      },
      { once: true }
    );
    printWindow.location.href = url;
  } catch (error) {
    printWindow.close();
    throw error;
  }
}
