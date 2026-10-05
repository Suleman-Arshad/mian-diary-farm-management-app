import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
export const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("http") &&
  !supabaseUrl.includes("your-project-url") &&
  !supabaseAnonKey.includes("your-anon-key")
);

if (typeof window !== "undefined") {
  if (isSupabaseConfigured) {
    console.info(`[Supabase Client] Connected to database: ${supabaseUrl}`);
  } else {
    console.warn(
      "[Supabase Client] Credentials missing or placeholder. Running in offline/demo mode. Please verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }
}

// Fallback dummy URL and Key so createClient doesn't throw during initial setup/static generation
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-project.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
