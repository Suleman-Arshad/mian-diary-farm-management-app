import { supabase, isSupabaseConfigured } from "./supabaseClient";

export interface AdminUser {
  id: string;
  email: string;
  role: "admin";
  name: string;
  businessName?: string;
  phone?: string | null;
}

const AUTH_STORAGE_KEY = "mian_dairy_auth_user";
const REGISTERED_USERS_KEY = "mian_dairy_registered_users";

// Default admin credentials (can be overridden via environment variables)
export const DEFAULT_ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@miandairy.com";
export const DEFAULT_ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

interface RegisteredUserRecord {
  id: string;
  email: string;
  password: string;
  businessName: string;
  phone?: string | null;
  role: "admin";
}

function getRegisteredUsers(): RegisteredUserRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REGISTERED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRegisteredUser(record: RegisteredUserRecord) {
  if (typeof window === "undefined") return;
  try {
    const current = getRegisteredUsers();
    // Replace if exists, else append
    const updated = current.filter(
      (u) => u.email.toLowerCase() !== record.email.toLowerCase()
    );
    updated.push(record);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save registered user locally", err);
  }
}

export const AuthService = {
  // -------------------------------------------------------------
  // SIGN UP
  // -------------------------------------------------------------
  async signUp(params: {
    email: string;
    password: string;
    businessName: string;
    phone?: string | null;
  }): Promise<{ user: AdminUser; hasSession: boolean; message?: string }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanBusinessName = params.businessName.trim();
    const cleanPhone =
      params.phone && typeof params.phone === "string" && params.phone.trim() !== ""
        ? params.phone.trim()
        : null;

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              business_name: cleanBusinessName,
              phone: cleanPhone,
              full_name: cleanBusinessName,
              role: "admin",
            },
          },
        });

        if (error) {
          console.error("Supabase Error:", error);
          throw new Error(error.message);
        }

        if (data.user) {
          const adminUser: AdminUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            role: "admin",
            name: cleanBusinessName,
            businessName: cleanBusinessName,
            phone: cleanPhone,
          };

          // Also save in local registry for seamless offline fallback
          saveRegisteredUser({
            id: adminUser.id,
            email: cleanEmail,
            password: params.password,
            businessName: cleanBusinessName,
            phone: cleanPhone,
            role: "admin",
          });

          // Check if session is already established (e.g. Email confirmation disabled in Supabase)
          if (data.session) {
            this.setLocalUser(adminUser);
            return { user: adminUser, hasSession: true };
          } else {
            // Confirmation email sent by Supabase
            return {
              user: adminUser,
              hasSession: false,
              message:
                "Registration successful! Please check your email to confirm your account before logging in.",
            };
          }
        }
      } catch (err: any) {
        // If Supabase returned an explicit error (like User already registered), rethrow it
        if (
          err.message &&
          !err.message.includes("Failed to fetch") &&
          !err.message.includes("network")
        ) {
          throw err;
        }
        console.warn("Supabase auth failed, falling back to local registration", err);
      }
    }

    // 2. Local Demo Registration Fallback
    const existing = getRegisteredUsers().find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (existing) {
      throw new Error("An account with this email address already exists. Please log in.");
    }

    const newUser: AdminUser = {
      id: `usr-${Date.now()}`,
      email: cleanEmail,
      role: "admin",
      name: cleanBusinessName,
      businessName: cleanBusinessName,
      phone: cleanPhone,
    };

    saveRegisteredUser({
      id: newUser.id,
      email: cleanEmail,
      password: params.password,
      businessName: cleanBusinessName,
      phone: cleanPhone,
      role: "admin",
    });

    this.setLocalUser(newUser);
    return { user: newUser, hasSession: true };
  },

  // -------------------------------------------------------------
  // SIGN IN
  // -------------------------------------------------------------
  async signIn(email: string, password: string): Promise<AdminUser> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });

        if (!error && data.user) {
          // ── Profile existence check ──────────────────────────────────────
          // If an admin row was deleted from `profiles` the Supabase Auth user
          // still exists, so signInWithPassword succeeds. We query profiles
          // here and reject the login when the record is missing.
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profileError) {
            console.error("Profile lookup error:", profileError);
          }

          if (!profileData) {
            // Revoke the newly-created session immediately.
            await supabase.auth.signOut();
            throw new Error(
              "Account not found or access revoked. Please contact support."
            );
          }
          // ────────────────────────────────────────────────────────────────

          const adminUser: AdminUser = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            role: "admin",
            name:
              data.user.user_metadata?.business_name ||
              data.user.user_metadata?.full_name ||
              cleanEmail.split("@")[0].toUpperCase() ||
              "Mian Dairy Administrator",
            businessName:
              data.user.user_metadata?.business_name ||
              "Mian Dairy Farm",
            phone: data.user.user_metadata?.phone || "",
          };
          this.setLocalUser(adminUser);
          return adminUser;
        } else if (error && !error.message.includes("Failed to fetch")) {
          // If Supabase gave an explicit error (invalid login credentials), check local fallback
          console.warn("Supabase auth response:", error.message);
        }
      } catch (err) {
        // Re-throw access-revoked errors — don't fall through to local auth.
        if (err instanceof Error && err.message.includes("access revoked")) {
          throw err;
        }
        console.warn("Supabase auth exception, checking local accounts", err);
      }
    }

    // 2. Check locally registered users (created via signup in local/demo mode)
    const localUser = getRegisteredUsers().find(
      (u) =>
        u.email.toLowerCase() === cleanEmail && u.password === password
    );
    if (localUser) {
      const adminUser: AdminUser = {
        id: localUser.id,
        email: localUser.email,
        role: "admin",
        name: localUser.businessName,
        businessName: localUser.businessName,
        phone: localUser.phone,
      };
      this.setLocalUser(adminUser);
      return adminUser;
    }

    // 3. Master Admin Credentials Fallback (for initial demo setup)
    if (
      (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() || cleanEmail === "admin") &&
      password === DEFAULT_ADMIN_PASSWORD
    ) {
      const adminUser: AdminUser = {
        id: "admin-master-001",
        email: DEFAULT_ADMIN_EMAIL,
        role: "admin",
        name: "Mian Dairy Farm",
        businessName: "Mian Dairy Farm",
        phone: "0300-1234567",
      };
      this.setLocalUser(adminUser);
      return adminUser;
    }

    throw new Error("Invalid email or password. Please check your credentials.");
  },

  // -------------------------------------------------------------
  // SIGN OUT
  // -------------------------------------------------------------
  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("Supabase signout failed", e);
      }
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new Event("mian-auth-changed"));
    }
  },

  // -------------------------------------------------------------
  // CURRENT USER HELPERS
  // -------------------------------------------------------------
  getCurrentUser(): AdminUser | null {
    if (typeof window === "undefined") return null;
    try {
      const item = localStorage.getItem(AUTH_STORAGE_KEY);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  setLocalUser(user: AdminUser): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      window.dispatchEvent(new Event("mian-auth-changed"));
    } catch (e) {
      console.error("Failed to store auth user", e);
    }
  },
};
