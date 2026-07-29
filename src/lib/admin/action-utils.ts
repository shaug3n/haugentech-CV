import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

export function revalidateSite() {
  revalidatePath("/", "layout");
}

/**
 * Authorizes an admin write.
 *
 * "A session exists" is not the same as "the site owner is signed in": the
 * Supabase anon key ships in the public client bundle, so anyone can hold a
 * valid session for this project. The database's RLS policies are the real
 * enforcement point (see `public.is_site_owner()` in
 * supabase/migrations/0001_init.sql); this is the app-level half of the same
 * check, so a non-owner gets a clean "Unauthorized" instead of a confusing
 * silent RLS rejection.
 *
 * Fails closed when `ADMIN_EMAIL` is unset: a misconfigured deployment refuses
 * writes rather than falling back to "any authenticated user".
 */
export async function requireUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured — refusing to authorize an admin write.");
  }
  if ((user.email ?? "").trim().toLowerCase() !== adminEmail) {
    throw new Error("Unauthorized");
  }
  return user;
}

export function formDataToRecord(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function uploadImage(
  supabase: SupabaseClient,
  file: File,
  folder: string,
): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

/**
 * Wraps an admin mutating server action so that ANY thrown error — a stale
 * session from `requireUser`, a failed image upload from `uploadImage`, or
 * anything else that isn't handled with an explicit `if (error) redirect(...)`
 * — lands the site owner back on `errorPath` with the same error banner a
 * failed database write produces, instead of Next.js's generic crash screen.
 *
 * `redirect()` and `notFound()` work by throwing a special Next.js
 * control-flow error. `unstable_rethrow` re-throws exactly those so a
 * successful save's redirect (or a `notFound()`) still propagates untouched.
 * Only genuine failures reach the `console.error` + redirect below, and the
 * original error's message/stack is never sent to the browser.
 *
 * Every new admin editor (certifications, projects, posts, ...) should wrap
 * its mutating action in this instead of hand-rolling try/catch, so the
 * error-banner behavior is inherited by construction rather than by
 * remembering to copy it.
 */
export function withAdminAction<Args extends unknown[]>(
  errorPath: string,
  action: (...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      await action(...args);
    } catch (err) {
      unstable_rethrow(err);
      console.error(`[admin action failed] ${errorPath}`, err);
      redirect(errorPath);
    }
  };
}
