import { NextRequest, NextResponse } from "next/server";
import { runSubmission } from "@/lib/submission/pipeline";

export const maxDuration = 60;

/** Same pattern as /api/cron/tailor; scheduled after it in vercel.json. Dry-run only -- see pipeline.ts docstring. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSubmission();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
