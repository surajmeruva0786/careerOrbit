import { NextRequest, NextResponse } from "next/server";
import { runEmailAsk } from "@/lib/emailqa/pipeline";

export const maxDuration = 60;

/**
 * Same auth pattern as the other /api/cron/* routes. Queues questions
 * (see pipeline.ts) and returns them in `pending` so whoever is
 * watching this cron's output knows what needs a Gmail draft sent --
 * this route does not send email itself.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runEmailAsk();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
