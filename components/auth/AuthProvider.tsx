"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthService, AdminUser } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (user: AdminUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<AdminUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Sync auth state on mount, storage events, and Supabase auth state change
  React.useEffect(() => {
    const checkAuth = async () => {
      // 1. Check local session first for fast load
      const localUser = AuthService.getCurrentUser();
      if (localUser) {
        setUser(localUser);
      }

      // 2. If Supabase configured, verify live session
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const adminUser: AdminUser = {
              id: session.user.id,
              email: session.user.email || "",
              role: "admin",
              name:
                session.user.user_metadata?.business_name ||
                session.user.user_metadata?.full_name ||
                localUser?.name ||
                "Mian Dairy Administrator",
              businessName:
                session.user.user_metadata?.business_name ||
                localUser?.businessName ||
                "Mian Dairy Farm",
              phone:
                session.user.user_metadata?.phone ||
                localUser?.phone ||
                "",
            };
            setUser(adminUser);
            AuthService.setLocalUser(adminUser);
          } else if (!localUser) {
            setUser(null);
          }
        } catch (e) {
          console.warn("Supabase session check error", e);
        }
      }
      setLoading(false);
    };

    checkAuth();

    // Listen to local changes
    window.addEventListener("mian-auth-changed", checkAuth);

    // Listen to Supabase auth events if active
    let authListener: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const adminUser: AdminUser = {
            id: session.user.id,
            email: session.user.email || "",
            role: "admin",
            name:
              session.user.user_metadata?.business_name ||
              session.user.user_metadata?.full_name ||
              "Mian Dairy Administrator",
            businessName:
              session.user.user_metadata?.business_name ||
              "Mian Dairy Farm",
            phone: session.user.user_metadata?.phone || "",
          };
          setUser(adminUser);
          AuthService.setLocalUser(adminUser);
        } else {
          // If signed out from Supabase
          if (!AuthService.getCurrentUser()) {
            setUser(null);
          }
        }
      });
      authListener = data.subscription;
    }

    return () => {
      window.removeEventListener("mian-auth-changed", checkAuth);
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, []);

  // Route protection
  React.useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup";

    if (!user && !isAuthPage) {
      router.replace("/login");
    } else if (user && isAuthPage) {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  const login = (adminUser: AdminUser) => {
    setUser(adminUser);
    router.replace("/");
  };

  const logout = async () => {
    await AuthService.signOut();
    setUser(null);
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">
            Verifying secure session...
          </span>
        </div>
      </div>
    );
  }

  // Prevent flash of protected content while redirecting unauthenticated users
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (!user && !isAuthPage) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
