import { NextRequest, NextResponse } from "next/server";
import { runRanking } from "@/lib/ranking/pipeline";

// Hobby plan caps function duration at 60s; each job is one sequential
// LLM call, so a big backlog may not finish in one run. runRanking()
// is idempotent (skips already-ranked jobs) so the next cron tick just
// picks up where this one left off.
export const maxDuration = 60;

/**
 * Vercel Cron hits this after /api/cron/source (scheduled 30 min
 * later, see vercel.json) so newly sourced jobs are ranked the same
 * day. Same CRON_SECRET bearer gate as the sourcing route.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runRanking();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
