"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Milk,
  Users,
  ClipboardList,
  Truck,
  Receipt,
  FileSpreadsheet,
  LayoutDashboard,
  CheckCircle2,
  Database,
  Calendar,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/components/auth/AuthProvider";

const NAV_ITEMS = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: "Daily Milk Entry",
    href: "/daily-entry",
    icon: ClipboardList,
    badge: "Daily",
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
    badge: null,
  },
  {
    name: "Farm Purchases",
    href: "/purchases",
    icon: Truck,
    badge: null,
  },
  {
    name: "Daily Expenses",
    href: "/expenses",
    icon: Receipt,
    badge: null,
  },
  {
    name: "Billing & Reports",
    href: "/reports",
    icon: FileSpreadsheet,
    badge: "PDF",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-30 bg-slate-900 text-slate-100 border-r border-slate-800">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/20">
          <Milk className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            Mian Dairy <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Farm</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">Milk & Distribution ERP</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
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
              className={cn(
                "group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sky-600 text-white shadow-md shadow-sky-600/20 font-semibold"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-sky-400 border border-sky-400/20"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Database Connection & Admin Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-sky-400" />
              Database
            </span>
            {isSupabaseConfigured ? (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Supabase
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Local Demo
              </span>
            )}
          </div>
        </div>

        {/* Admin User Card & Sign Out */}
        {user && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 space-y-2.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-md shadow-sky-500/20 shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate block">
                    {user.businessName || user.name || "Mian Dairy Farm"}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Admin
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 truncate block">
                  {user.email}
                </span>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/15 text-slate-300 hover:text-rose-400 py-1.5 px-2 text-xs font-semibold border border-slate-700/60 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
