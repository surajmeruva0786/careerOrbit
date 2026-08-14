import { supabaseServer } from "../supabase/server";
import { scoreJob } from "./score";

const FIT_THRESHOLD = Number(process.env.RANKING_FIT_THRESHOLD ?? 55);

export type RankingResult = {
  scored: number;
  promotedToApplications: number;
};

/**
 * Scores every job that doesn't have a ranking yet against the single
 * profile row, stores every score in `rankings`, and creates an
 * `applications` row (status='ranked') only for postings at or above
 * FIT_THRESHOLD -- this is the volume control from PLAN.md §6.
 */
export async function runRanking(): Promise<RankingResult> {
  const supabase = supabaseServer();

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("id, full_name, experience, projects, skills, education")
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) throw new Error("No profile row found. Run scripts/seed-profile.mjs first.");

  const { data: alreadyRanked, error: rankedError } = await supabase
    .from("rankings")
    .select("job_id")
    .eq("profile_id", profile.id);
  if (rankedError) throw rankedError;
  const rankedJobIds = new Set((alreadyRanked ?? []).map((r) => r.job_id));

  const { data: jobs, error: jobsError } = await supabase
    .from("jobs")
    .select("id, company, title, location, description");
  if (jobsError) throw jobsError;

  const unranked = (jobs ?? []).filter((job) => !rankedJobIds.has(job.id));

  let scored = 0;
  let promoted = 0;

  for (const job of unranked) {
    const result = await scoreJob(job, profile);
    scored++;

    const { data: ranking, error: insertError } = await supabase
      .from("rankings")
      .insert({
        job_id: job.id,
        profile_id: profile.id,
        fit_score: result.fit_score,
        friction_score: result.friction_score,
        reasoning: result.reasoning,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    if (result.fit_score >= FIT_THRESHOLD) {
      const { error: appError } = await supabase.from("applications").upsert(
        {
          job_id: job.id,
          profile_id: profile.id,
          ranking_id: ranking.id,
          status: "ranked",
        },
        { onConflict: "job_id,profile_id", ignoreDuplicates: true }
      );
      if (appError) throw appError;
      promoted++;
    }
  }

  return { scored, promotedToApplications: promoted };
}
