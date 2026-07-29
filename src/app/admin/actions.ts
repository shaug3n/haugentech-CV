"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { withAdminAction } from "@/lib/admin/action-utils";

// Lives here rather than inline in admin/layout.tsx: an unwrapped action defined
// in the layout has no error boundary above it, so a throw from signOut() would
// replace the whole admin shell with Next's crash screen. Wrapped, a failure
// lands on the login page — which is where a failed sign-out should send you
// anyway, so there is no separate error status to render.
export const signOut = withAdminAction("/admin/login", async () => {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
});
