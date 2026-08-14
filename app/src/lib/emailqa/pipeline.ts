import { supabaseServer } from "../supabase/server";
import { detectMissingFields } from "./detect";

export type PendingQuestion = {
  application_id: string;
  company: string;
  title: string;
  field_name: string;
  question: string;
};

export type AskResult = {
  queued: number;
  clean: number;
  failed: number;
  pending: PendingQuestion[];
};

/**
 * Per PLAN.md §8: for every application at status='approved', checks
 * whether the posting asks anything the stored profile can't answer.
 * If so, queues one email_threads row per question (status='sent')
 * and moves the application to 'awaiting_reply'; otherwise leaves it
 * at 'approved' for the submission pipeline.
 *
 * This does NOT send email itself -- the deployed app intentionally
 * holds no Gmail credentials (avoids storing a personal-inbox OAuth
 * grant in a serverless app on a currently-public repo). It returns
 * `pending`, the exact list of {application_id, question} the
 * operator (Claude Code, interactively or via a scheduled run) drafts
 * via Gmail and sends for review -- PLAN.md §8 option (a). Replies get
 * fed back in through resolveEmailAnswer below.
 */
export async function runEmailAsk(): Promise<AskResult> {
  const supabase = supabaseServer();

  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, profile_id, jobs(company, title, description)")
    .eq("status", "approved");
  if (error) throw error;

  let queued = 0;
  let clean = 0;
  let failed = 0;
  const pending: PendingQuestion[] = [];

  for (const app of applications ?? []) {
    const row = app as unknown as {
      id: string;
      profile_id: string;
      jobs: { company: string; title: string; description: string | null } | null;
    };
    if (!row.jobs) {
      failed++;
      continue;
    }
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profile")
        .select("screening_answers")
        .eq("id", row.profile_id)
        .single();
      if (profileError) throw profileError;

      const missing = await detectMissingFields(row.jobs, profile.screening_answers ?? {});
      if (missing.length === 0) {
        clean++;
        continue;
      }

      const threadRows = missing.map((field) => ({
        application_id: row.id,
        field_name: field.field_name,
        question: field.question,
        status: "sent" as const,
      }));
      const { error: threadError } = await supabase.from("email_threads").insert(threadRows);
      if (threadError) throw threadError;

      const { error: statusError } = await supabase
        .from("applications")
        .update({ status: "awaiting_reply" })
        .eq("id", row.id);
      if (statusError) throw statusError;

      queued++;
      for (const field of missing) {
        pending.push({
          application_id: row.id,
          company: row.jobs.company,
          title: row.jobs.title,
          field_name: field.field_name,
          question: field.question,
        });
      }
    } catch (err) {
      console.error(`email-ask failed for application ${row.id}:`, err);
      failed++;
    }
  }

  return { queued, clean, failed, pending };
}

/**
 * Feeds one answered question back into the system: stores it on the
 * profile permanently (so it's never asked again, per PLAN.md §8),
 * records it on application_fields with source='user_email_reply',
 * and resolves the matching email_threads row. Once every open thread
 * for an application is resolved, the application returns to
 * 'approved' so the submission pipeline picks it back up.
 *
 * Called by the operator after reading a real reply (see pipeline.ts
 * docstring above) -- parsing free-text email replies correctly is
 * itself a judgment call, not something to blind-automate.
 */
export async function resolveEmailAnswer(params: {
  application_id: string;
  field_name: string;
  answer: string;
  gmail_thread_id?: string;
  gmail_message_id?: string;
}): Promise<{ application_status: string }> {
  const supabase = supabaseServer();

  const { data: app, error: appError } = await supabase
    .from("applications")
    .select("id, profile_id")
    .eq("id", params.application_id)
    .single();
  if (appError) throw appError;

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("screening_answers")
    .eq("id", app.profile_id)
    .single();
  if (profileError) throw profileError;

  const updatedAnswers = { ...(profile.screening_answers ?? {}), [params.field_name]: params.answer };
  const { error: updateProfileError } = await supabase
    .from("profile")
    .update({ screening_answers: updatedAnswers })
    .eq("id", app.profile_id);
  if (updateProfileError) throw updateProfileError;

  const { error: fieldError } = await supabase.from("application_fields").upsert(
    {
      application_id: params.application_id,
      field_name: params.field_name,
      field_value: params.answer,
      source: "user_email_reply",
    },
    { onConflict: "application_id,field_name" }
  );
  if (fieldError) throw fieldError;

  const { error: threadError } = await supabase
    .from("email_threads")
    .update({
      status: "resolved",
      ...(params.gmail_thread_id ? { gmail_thread_id: params.gmail_thread_id } : {}),
      ...(params.gmail_message_id ? { gmail_message_id: params.gmail_message_id } : {}),
    })
    .eq("application_id", params.application_id)
    .eq("field_name", params.field_name);
  if (threadError) throw threadError;

  const { data: openThreads, error: openError } = await supabase
    .from("email_threads")
    .select("id")
    .eq("application_id", params.application_id)
    .neq("status", "resolved");
  if (openError) throw openError;

  let applicationStatus = "awaiting_reply";
  if ((openThreads ?? []).length === 0) {
    applicationStatus = "approved";
    const { error: statusError } = await supabase
      .from("applications")
      .update({ status: "approved" })
      .eq("id", params.application_id);
    if (statusError) throw statusError;
  }

  return { application_status: applicationStatus };
}
