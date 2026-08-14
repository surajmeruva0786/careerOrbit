import { NextRequest, NextResponse } from "next/server";
import { runSourcing } from "@/lib/sourcing/orchestrator";

export const maxDuration = 60;

/**
 * Vercel Cron hits this on a schedule (see vercel.json). Vercel signs
 * cron requests with a bearer token equal to CRON_SECRET when that env
 * var is set -- reject anything else so this can't be triggered by a
 * random request to a public URL.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSourcing();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
