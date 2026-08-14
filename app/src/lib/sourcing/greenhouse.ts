import { GREENHOUSE_BOARDS } from "./companies";
import type { SourcedJob } from "./types";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
  updated_at?: string;
};

/**
 * Fetches internship-relevant postings from the Greenhouse Job Board API
 * (no auth, no ToS issue) for every board in GREENHOUSE_BOARDS.
 */
export async function fetchGreenhouseJobs(): Promise<SourcedJob[]> {
  const results = await Promise.allSettled(
    GREENHOUSE_BOARDS.map(async (token) => {
      const res = await fetch(
        `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) {
        throw new Error(`greenhouse/${token}: ${res.status}`);
      }
      const data: { jobs: GreenhouseJob[] } = await res.json();
      return data.jobs
        .filter((job) => /\bintern(s|ship)?\b/i.test(job.title))
        .map(
          (job): SourcedJob => ({
            source: "greenhouse",
            source_id: `${token}/${job.id}`,
            company: token,
            title: job.title,
            location: job.location?.name ?? null,
            url: job.absolute_url,
            description: job.content ?? null,
            posted_at: job.updated_at ?? null,
            raw: job,
          })
        );
    })
  );

  const jobs: SourcedJob[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      jobs.push(...result.value);
    } else {
      console.error(result.reason);
    }
  }
  return jobs;
}
