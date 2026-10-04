"use client";

import * as React from "react";
import Link from "next/link";
import { Milk, Menu, X, PlusCircle, Calendar, Sparkles } from "lucide-react";
import { formatDateDisplay, getTodayDateString } from "@/lib/utils";
import { Button } from "@/lib/../components/ui/button";

interface NavbarProps {
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Navbar({ onMobileMenuToggle, isMobileMenuOpen }: NavbarProps) {
  const todayStr = getTodayDateString();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur transition-all">
      {/* Mobile brand & toggle */}
      <div className="flex items-center gap-2 sm:gap-3 lg:hidden">
        <button
          onClick={onMobileMenuToggle}
          className="rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6 text-slate-800" />
          ) : (
            <Menu className="h-6 w-6 text-slate-800" />
          )}
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
            <Milk className="h-5 w-5" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 hidden xs:inline">
            Mian Dairy Farm
          </span>
        </Link>
      </div>

      {/* Desktop Date & Title view */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-100/80 px-3 py-1.5 text-xs font-semibold text-slate-700">
          <Calendar className="h-3.5 w-3.5 text-sky-600" />
          <span>Today: {formatDateDisplay(todayStr)}</span>
        </div>
        <span className="text-xs text-slate-400 font-medium">|</span>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Daily Dispatch System Active</span>
        </div>
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link href="/daily-entry">
          <Button size="sm" variant="dairy" className="gap-1.5 shadow-sm text-xs sm:text-sm min-h-[44px] px-3.5">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden xs:inline">Record</span> Daily Milk
          </Button>
        </Link>
      </div>
    </header>
  );
}
