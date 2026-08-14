import { NextRequest, NextResponse } from "next/server";
import { runTailoring } from "@/lib/tailoring/pipeline";

export const maxDuration = 60;

/** Same pattern as /api/cron/rank; scheduled after it in vercel.json. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runTailoring();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
