// Seeds (or updates) the single `profile` row from src/data/profile.seed.json.
// Run with: node --env-file=.env.local scripts/seed-profile.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Fill in .env.local (see .env.example) and re-run."
  );
  process.exit(1);
}

const seedPath = path.join(__dirname, "..", "src", "data", "profile.seed.json");
let profile;
try {
  profile = JSON.parse(readFileSync(seedPath, "utf-8"));
} catch {
  console.error(
    `Could not read ${seedPath}. Copy profile.seed.example.json to profile.seed.json ` +
      "and fill in your real details first (it's gitignored, not committed)."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: existing, error: fetchError } = await supabase
  .from("profile")
  .select("id")
  .limit(1)
  .maybeSingle();
if (fetchError) throw fetchError;

if (existing) {
  const { error } = await supabase.from("profile").update(profile).eq("id", existing.id);
  if (error) throw error;
  console.log(`Updated profile ${existing.id} (${profile.full_name}).`);
} else {
  const { data, error } = await supabase.from("profile").insert(profile).select("id").single();
  if (error) throw error;
  console.log(`Inserted profile ${data.id} (${profile.full_name}).`);
}
