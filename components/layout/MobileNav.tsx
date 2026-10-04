"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Truck,
  Receipt,
  FileSpreadsheet,
  X,
  Milk,
  Database,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const NAV_ITEMS = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Daily Milk Entry", href: "/daily-entry", icon: ClipboardList },
    { name: "Customers & Ledger", href: "/customers", icon: Users },
    { name: "Farm Purchases", href: "/purchases", icon: Truck },
    { name: "Daily Expenses", href: "/expenses", icon: Receipt },
    { name: "Billing & Reports", href: "/reports", icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer Sheet */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 p-6 text-slate-100 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col justify-between",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div>
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-6 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white">
                <Milk className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-white text-base">Mian Dairy Farm</span>
                <p className="text-[11px] text-slate-400">Mobile Delivery Portal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="Close Navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Links */}
          <nav className="mt-6 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all min-h-[44px]",
                    isActive
                      ? "bg-sky-600 text-white font-semibold shadow-md"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Database Status & Admin Footer in drawer */}
        <div className="pt-4 border-t border-slate-800 space-y-2.5">
          <div className="rounded-lg bg-slate-800/80 p-2.5 text-xs">
            <div className="flex items-center justify-between font-medium">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Database className="h-3.5 w-3.5 text-sky-400" />
                Backend
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase px-2 py-0.5 rounded",
                  isSupabaseConfigured
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                )}
              >
                {isSupabaseConfigured ? "Supabase" : "Local Demo"}
              </span>
            </div>
          </div>

          {user && (
            <div className="rounded-xl border border-slate-800 bg-slate-800/70 p-3 space-y-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate block">
                      {user.businessName || user.name || "Mian Dairy Farm"}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                      Admin
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                onClick={async () => {
                  onClose();
                  await logout();
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 py-1.5 px-2 text-xs font-semibold border border-slate-700/60 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Mobile Navigation for Delivery Boys */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur lg:hidden shadow-lg">
        <Link
          href="/"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 text-[10px] font-semibold transition-colors",
            pathname === "/" ? "text-sky-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span>Home</span>
        </Link>

        <Link
          href="/customers"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/customers") ? "text-sky-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Users className="h-5 w-5 mb-0.5" />
          <span>Customers</span>
        </Link>

        {/* Prominent Daily Entry Action in center */}
        <Link
          href="/daily-entry"
          className="flex flex-col items-center justify-center -mt-5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg shadow-sky-600/30 transition-transform active:scale-95 border-2 border-white">
            <ClipboardList className="h-6 w-6" />
          </div>
          <span className="text-[10px] font-bold text-sky-700 mt-1">Daily Entry</span>
        </Link>

        <Link
          href="/purchases"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/purchases") ? "text-sky-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Truck className="h-5 w-5 mb-0.5" />
          <span>Purchases</span>
        </Link>

        <Link
          href="/reports"
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 text-[10px] font-semibold transition-colors",
            pathname.startsWith("/reports") ? "text-sky-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <FileSpreadsheet className="h-5 w-5 mb-0.5" />
          <span>Billing</span>
        </Link>
      </nav>
    </>
  );
}
