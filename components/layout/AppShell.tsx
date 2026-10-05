"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Toaster } from "@/components/ui/toast";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const pathname = usePathname();

  // If on login or signup page, don't show the dashboard shell (sidebar, navbar, mobile bottom bar)
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (isAuthPage) {
    return (
      <main className="min-h-screen bg-slate-900">
        <Toaster />
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 font-sans text-slate-900 antialiased flex flex-col">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Global Toast Notification Container */}
      <Toaster />

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-64 flex-1">
        <Navbar
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobileMenuOpen={mobileMenuOpen}
        />
        {/* Main page content - extra padding bottom for mobile bottom nav bar */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  );
}
