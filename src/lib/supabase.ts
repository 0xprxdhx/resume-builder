import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Environment validation
// Fail loudly at startup rather than silently at runtime.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL.\n" +
      "Add it to your .env.local file:\n" +
      "  NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co"
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "[supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Add it to your .env.local file:\n" +
      "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Database types
// Reflects the `resumes` table used throughout the app.
// Extend this as you add more tables.
// ─────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      resumes: {
        Row: {
          id: string;
          user_id: string;
          data: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data?: Record<string, unknown>;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton client
// One instance is created and reused for the lifetime of the app.
// This prevents multiple GoTrueClient warnings in development with
// React strict-mode double-rendering.
// ─────────────────────────────────────────────────────────────────────────────

const globalForSupabase = globalThis as unknown as {
  _supabaseClient: SupabaseClient<Database> | undefined;
};

export const supabase: SupabaseClient<Database> =
  globalForSupabase._supabaseClient ??
  createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Persist the session in localStorage so users stay logged in
      // across page refreshes and browser restarts.
      persistSession: true,
      // Automatically refresh the access token before it expires.
      autoRefreshToken: true,
      // Detect OAuth redirects and exchange the code for a session
      // automatically (used if you add Google / GitHub login later).
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        // Identify requests from this app in Supabase dashboard logs.
        "x-application-name": "resume-studio",
      },
    },
    db: {
      // Explicit schema — makes it clear we're working in `public`.
      schema: "public",
    },
  });

// Reuse the same instance across hot-reloads in development.
if (process.env.NODE_ENV !== "production") {
  globalForSupabase._supabaseClient = supabase;
}