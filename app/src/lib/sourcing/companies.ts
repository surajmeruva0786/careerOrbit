// Board tokens confirmed live against each ATS's public API (see
// docs/CHANGELOG.md step 6/7). Add more by testing:
//   curl https://boards-api.greenhouse.io/v1/boards/<token>/jobs
//   curl https://api.lever.co/v0/postings/<token>?mode=json
// A 200 with a jobs/postings array means the token is valid.

export const GREENHOUSE_BOARDS = [
  "anthropic",
  "stripe",
  "databricks",
  "scaleai",
  "robinhood",
  "airbnb",
  "coinbase",
  "figma",
  "elastic",
  "mongodb",
  "gitlab",
  "affirm",
  "brex",
  "discord",
  "dropbox",
  "asana",
  "cloudflare",
];

export const LEVER_BOARDS: string[] = [];
