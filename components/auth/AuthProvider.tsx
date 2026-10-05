"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthService, AdminUser } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  isLoading: boolean;
  login: (user: AdminUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  isLoading: true,
  login: () => {},
  logout: async () => {},
});

// Helper to set/clear session cookie for server/middleware compatibility
function setSessionCookie(hasSession: boolean) {
  if (typeof document !== "undefined") {
    if (hasSession) {
      document.cookie = "mian_dairy_session=true; path=/; max-age=2592000; SameSite=Lax";
    } else {
      document.cookie = "mian_dairy_session=; path=/; max-age=0; SameSite=Lax";
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = React.useState<AdminUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  const isResolvedRef = React.useRef(false);

  const resolveSession = React.useCallback((finalUser: AdminUser | null) => {
    setUser(finalUser);
    setSessionCookie(Boolean(finalUser));
    isResolvedRef.current = true;
    setLoading(false);
  }, []);

  // Sync auth state on mount, storage events, and Supabase auth state change
  React.useEffect(() => {
    let isMounted = true;

    // 1. Instant check from local store for fast initial display
    const localUser = AuthService.getCurrentUser();
    if (localUser) {
      setUser(localUser);
      setSessionCookie(true);
    }

    // 2. Fallback timeout safeguard (2.5 seconds)
    // If session check hangs or takes longer than 2.5s, force loading = false to break screen lock
    const fallbackTimer = setTimeout(() => {
      if (isMounted && !isResolvedRef.current) {
        console.warn("[AuthProvider] 2.5s safeguard timeout expired. Unlocking session loader.");
        const fallbackUser = AuthService.getCurrentUser();
        resolveSession(fallbackUser);
      }
    }, 2500);

    // 3. Live session check with timeout promise race
    const checkAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          if (isMounted) resolveSession(localUser);
          return;
        }

        // Timeout promise after 2 seconds to prevent hanging Supabase queries
        const getSessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase auth session timeout")), 2000)
        );

        const { data } = await Promise.race([getSessionPromise, timeoutPromise]);
        const session = data?.session;

        if (!isMounted) return;

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
          AuthService.setLocalUser(adminUser);
          resolveSession(adminUser);
        } else {
          // If no session exists in Supabase, fall back to locally saved demo account or null
          const activeLocal = AuthService.getCurrentUser();
          resolveSession(activeLocal || null);
        }
      } catch (e) {
        console.warn("[AuthProvider] Session verification notice:", e);
        if (isMounted) {
          const activeLocal = AuthService.getCurrentUser();
          resolveSession(activeLocal || null);
        }
      } finally {
        if (isMounted && !isResolvedRef.current) {
          const activeLocal = AuthService.getCurrentUser();
          resolveSession(activeLocal || null);
        }
      }
    };

    checkAuth();

    // 4. Supabase auth state change listener
    let authListener: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted) return;

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
            AuthService.setLocalUser(adminUser);
            resolveSession(adminUser);
          } else if (event === "SIGNED_OUT") {
            AuthService.setLocalUser(null as any);
            resolveSession(null);
          } else if (event === "INITIAL_SESSION" && !session) {
            const activeLocal = AuthService.getCurrentUser();
            resolveSession(activeLocal || null);
          }
        });
        authListener = data.subscription;
      } catch (err) {
        console.warn("[AuthProvider] onAuthStateChange setup notice:", err);
      }
    }

    // 5. Local storage cross-tab/event sync
    const handleLocalAuthChanged = () => {
      if (isMounted) {
        const current = AuthService.getCurrentUser();
        setUser(current);
        setSessionCookie(Boolean(current));
      }
    };

    window.addEventListener("mian-auth-changed", handleLocalAuthChanged);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      window.removeEventListener("mian-auth-changed", handleLocalAuthChanged);
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [resolveSession]);

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Route protection and redirection guard
  React.useEffect(() => {
    if (loading) return;

    if (!user && !isAuthPage) {
      router.replace("/login");
    } else if (user && isAuthPage) {
      router.replace("/");
    }
  }, [user, loading, isAuthPage, router]);

  const login = (adminUser: AdminUser) => {
    setUser(adminUser);
    setSessionCookie(true);
    AuthService.setLocalUser(adminUser);
    isResolvedRef.current = true;
    setLoading(false);
    router.replace("/");
  };

  const logout = async () => {
    setLoading(true);
    setSessionCookie(false);
    await AuthService.signOut();
    setUser(null);
    isResolvedRef.current = true;
    setLoading(false);
    router.replace("/login");
  };

  // If on login or signup page, render immediately without any full-screen loading block
  if (isAuthPage) {
    return (
      <AuthContext.Provider value={{ user, loading, isLoading: loading, login, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // On protected routes, show the spinner screen ONLY while actively verifying (max 2.5s)
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

  // Once loading completes, if there is no user on a protected page, render null while redirecting to /login
  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, isLoading: loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
