import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Browser/client-side client. Subject to RLS — read-only dashboard use. */
export const supabaseBrowser = createClient(url, anonKey);
