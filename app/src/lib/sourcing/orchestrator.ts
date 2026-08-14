import { supabaseServer } from "../supabase/server";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchRssJobs } from "./rss";
import type { SourcedJob } from "./types";

export type SourcingResult = {
  fetched: number;
  upserted: number;
  bySource: Record<string, number>;
};

function dedupe(jobs: SourcedJob[]): SourcedJob[] {
  const seen = new Map<string, SourcedJob>();
  for (const job of jobs) {
    seen.set(`${job.source}:${job.source_id}`, job);
  }
  return [...seen.values()];
}

/**
 * Runs every sourcing connector, dedupes by (source, source_id), and
 * upserts normalized postings into the jobs table.
 */
export async function runSourcing(): Promise<SourcingResult> {
  const [greenhouse, lever, rss] = await Promise.all([
    fetchGreenhouseJobs(),
    fetchLeverJobs(),
    fetchRssJobs(),
  ]);

  const all = dedupe([...greenhouse, ...lever, ...rss]);

  const supabase = supabaseServer();
  const { error, count } = await supabase
    .from("jobs")
    .upsert(
      all.map((job) => ({
        source: job.source,
        source_id: job.source_id,
        company: job.company,
        title: job.title,
        location: job.location,
        url: job.url,
        description: job.description,
        posted_at: job.posted_at,
        raw: job.raw,
      })),
      { onConflict: "source,source_id", count: "exact" }
    );
  if (error) throw error;

  return {
    fetched: greenhouse.length + lever.length + rss.length,
    upserted: count ?? all.length,
    bySource: {
      greenhouse: greenhouse.length,
      lever: lever.length,
      rss: rss.length,
    },
  };
}
