import { NextRequest, NextResponse } from "next/server";
import { resolveEmailAnswer } from "@/lib/emailqa/pipeline";

/**
 * Trusted-caller endpoint (reuses CRON_SECRET as a bearer token, same
 * as /api/cron/*) for feeding one answered email-Q&A question back
 * in. Not on a schedule -- called by the operator once a real reply
 * has been read and parsed. See emailqa/pipeline.ts for why parsing
 * isn't blind-automated.
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.application_id || !body.field_name || typeof body.answer !== "string") {
    return NextResponse.json(
      { ok: false, error: "application_id, field_name, and answer (string) are required" },
      { status: 400 }
    );
  }

  try {
    const result = await resolveEmailAnswer({
      application_id: body.application_id,
      field_name: body.field_name,
      answer: body.answer,
      gmail_thread_id: body.gmail_thread_id,
      gmail_message_id: body.gmail_message_id,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
