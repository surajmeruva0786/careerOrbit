import { LEVER_BOARDS } from "./companies";
import type { SourcedJob } from "./types";

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: { location?: string };
  descriptionPlain?: string;
  createdAt?: number;
};

/**
 * Fetches internship-relevant postings from the Lever Postings API
 * (no auth, no ToS issue) for every board in LEVER_BOARDS.
 */
export async function fetchLeverJobs(): Promise<SourcedJob[]> {
  const results = await Promise.allSettled(
    LEVER_BOARDS.map(async (token) => {
      const res = await fetch(`https://api.lever.co/v0/postings/${token}?mode=json`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`lever/${token}: ${res.status}`);
      }
      const postings: LeverPosting[] = await res.json();
      return postings
        .filter((posting) => /\bintern(s|ship)?\b/i.test(posting.text))
        .map(
          (posting): SourcedJob => ({
            source: "lever",
            source_id: `${token}/${posting.id}`,
            company: token,
            title: posting.text,
            location: posting.categories?.location ?? null,
            url: posting.hostedUrl,
            description: posting.descriptionPlain ?? null,
            posted_at: posting.createdAt ? new Date(posting.createdAt).toISOString() : null,
            raw: posting,
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
