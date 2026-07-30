import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client for static/build-time reads, or `null` when the
 * project isn't configured (env vars absent, or client construction fails).
 * Callers must treat `null` as "no data available" rather than throwing, so
 * public pages can still build without a `.env.local`.
 */
export function supabaseStatic(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}
