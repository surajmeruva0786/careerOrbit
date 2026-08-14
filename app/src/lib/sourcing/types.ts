export type SourcedJob = {
  source: "greenhouse" | "lever" | "rss";
  source_id: string;
  company: string;
  title: string;
  location: string | null;
  url: string;
  description: string | null;
  posted_at: string | null;
  raw: unknown;
};
