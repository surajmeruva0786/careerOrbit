import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client using the service_role key, which bypasses RLS.
 * Never import this from a client component.
 */
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Get it from Supabase dashboard > Project Settings > API."
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
