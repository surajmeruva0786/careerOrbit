import { supabaseServer } from "../supabase/server";
import { tailorResume, type BaseResumeContent } from "./tailor";
import { diffResume } from "./diff";

export type TailoringResult = {
  tailored: number;
  failed: number;
};

/**
 * Tailors a resume for every application still at status='ranked',
 * storing the result as a resume_versions row (diffed against the
 * base) and advancing the application to status='tailored'.
 */
export async function runTailoring(): Promise<TailoringResult> {
  const supabase = supabaseServer();

  const { data: baseVersion, error: baseError } = await supabase
    .from("resume_versions")
    .select("id, profile_id, content")
    .eq("is_base", true)
    .limit(1)
    .maybeSingle();
  if (baseError) throw baseError;
  if (!baseVersion) throw new Error("No base resume_versions row found. Run scripts/seed-profile.mjs first.");

  const { data: applications, error: appsError } = await supabase
    .from("applications")
    .select("id, job_id, jobs(company, title, description)")
    .eq("status", "ranked");
  if (appsError) throw appsError;

  let tailored = 0;
  let failed = 0;

  for (const app of applications ?? []) {
    const job = (app as unknown as { jobs: { company: string; title: string; description: string | null } }).jobs;
    try {
      const base = baseVersion.content as BaseResumeContent;
      const result = await tailorResume(job, base);
      const diff = diffResume(base, result);

      const { data: version, error: versionError } = await supabase
        .from("resume_versions")
        .insert({
          profile_id: baseVersion.profile_id,
          application_id: app.id,
          is_base: false,
          content: { ...base, experience: result.experience, projects: result.projects, cover_note: result.cover_note },
          diff_from_base: diff,
        })
        .select("id")
        .single();
      if (versionError) throw versionError;

      const { error: updateError } = await supabase
        .from("applications")
        .update({ resume_version_id: version.id, status: "tailored" })
        .eq("id", app.id);
      if (updateError) throw updateError;

      tailored++;
    } catch (err) {
      console.error(`tailoring failed for application ${app.id}:`, err);
      failed++;
    }
  }

  return { tailored, failed };
}
