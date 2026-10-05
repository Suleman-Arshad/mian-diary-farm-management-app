"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export const toast = {
  success: (message: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dairy-toast", {
          detail: {
            id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            message,
            type: "success",
          },
        })
      );
    }
  },
  error: (message: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dairy-toast", {
          detail: {
            id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            message,
            type: "error",
          },
        })
      );
    }
  },
  info: (message: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("dairy-toast", {
          detail: {
            id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            message,
            type: "info",
          },
        })
      );
    }
  },
};

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts((prev) => [...prev, newToast]);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, 5000);
      }
    };

    window.addEventListener("dairy-toast", handleToast);
    return () => window.removeEventListener("dairy-toast", handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 max-w-md w-full pointer-events-none p-2 sm:p-0">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-2xl border text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            t.type === "success"
              ? "bg-emerald-600 text-white border-emerald-700 shadow-emerald-950/20"
              : t.type === "error"
              ? "bg-rose-600 text-white border-rose-700 shadow-rose-950/20"
              : "bg-sky-600 text-white border-sky-700 shadow-sky-950/20"
          }`}
        >
          {t.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : t.type === "error" ? (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 break-words leading-snug">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-white/80 hover:text-white p-0.5 rounded transition-colors shrink-0"
            title="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
