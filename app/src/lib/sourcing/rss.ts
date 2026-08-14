import { XMLParser } from "fast-xml-parser";
import type { SourcedJob } from "./types";

// Public RSS feeds, no auth, no ToS issue. Verified live with curl —
// see docs/CHANGELOG.md step 8/28. Add more by confirming a feed
// returns a <channel><item> RSS 2.0 document.
const RSS_FEEDS = [
  { name: "weworkremotely-programming", url: "https://weworkremotely.com/categories/remote-programming-jobs.rss" },
  { name: "weworkremotely-all", url: "https://weworkremotely.com/remote-jobs.rss" },
];

type RssItem = {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  guid?: string | { "#text": string };
};

const parser = new XMLParser({ ignoreAttributes: false });

/**
 * Fetches and parses public career/job-board RSS feeds, filtered to
 * internship-relevant postings.
 */
export async function fetchRssJobs(): Promise<SourcedJob[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, { headers: { Accept: "application/rss+xml, application/xml" } });
      if (!res.ok) {
        throw new Error(`rss/${feed.name}: ${res.status}`);
      }
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const items: RssItem[] = parsed?.rss?.channel?.item ?? [];
      const list = Array.isArray(items) ? items : [items];

      return list
        .filter((item) => item.title && /\bintern(s|ship)?\b/i.test(item.title))
        .map((item): SourcedJob => {
          const guid = typeof item.guid === "string" ? item.guid : item.guid?.["#text"];
          return {
            source: "rss",
            source_id: `${feed.name}/${guid ?? item.link ?? item.title}`,
            company: feed.name,
            title: item.title!,
            location: null,
            url: item.link ?? "",
            description: item.description ?? null,
            posted_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
            raw: item,
          };
        });
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
