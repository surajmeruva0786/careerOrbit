import { supabaseServer } from "../supabase/server";

export type SubmissionPayload = {
  application_id: string;
  source: "greenhouse" | "lever" | "rss";
  method: "api" | "manual";
  target: { board: string | null; external_job_id: string | null; url: string };
  applicant: { full_name?: unknown; email?: unknown; phone?: unknown; location?: unknown; links?: unknown };
  resume: { experience?: unknown; projects?: unknown; cover_note?: unknown };
};

export type SubmissionResult = {
  queued: number;
  failed: number;
};

// Greenhouse/Lever source_id is stored as "boardToken/externalId" (see
// src/lib/sourcing/{greenhouse,lever}.ts).
function parseBoardSourceId(sourceId: string): { board: string | null; external_job_id: string | null } {
  const [board, external_job_id] = sourceId.split("/");
  return { board: board ?? null, external_job_id: external_job_id ?? null };
}

function buildPayload(
  applicationId: string,
  job: { source: string; source_id: string; url: string },
  resumeContent: Record<string, unknown>
): SubmissionPayload {
  const source = job.source as SubmissionPayload["source"];
  const method: SubmissionPayload["method"] = source === "rss" ? "manual" : "api";
  const target =
    method === "api"
      ? { ...parseBoardSourceId(job.source_id), url: job.url }
      : { board: null, external_job_id: null, url: job.url };

  return {
    application_id: applicationId,
    source,
    method,
    target,
    applicant: {
      full_name: resumeContent.full_name,
      email: resumeContent.email,
      phone: resumeContent.phone,
      location: resumeContent.location,
      links: resumeContent.links,
    },
    resume: {
      experience: resumeContent.experience,
      projects: resumeContent.projects,
      cover_note: resumeContent.cover_note,
    },
  };
}

/**
 * DRY RUN ONLY. Builds the submission payload for every application at
 * status='approved' that hasn't been queued yet, and logs it -- it does
 * NOT POST to any real ATS. Real submission (Greenhouse/Lever API POST,
 * per PLAN.md §9) is a deliberately separate, later step: firing a real
 * application under the user's name is the highest-stakes, least-
 * reversible action in this system and needs its own explicit sign-off.
 *
 * Marks submission_method so a payload isn't rebuilt/relogged every run;
 * status stays 'approved' since nothing was actually submitted.
 */
export async function runSubmission(): Promise<SubmissionResult> {
  const supabase = supabaseServer();

  const { data: applications, error } = await supabase
    .from("applications")
    .select("id, resume_version_id, jobs(source, source_id, url), resume_versions(content)")
    .eq("status", "approved")
    .is("submission_method", null);
  if (error) throw error;

  let queued = 0;
  let failed = 0;

  for (const app of applications ?? []) {
    const row = app as unknown as {
      id: string;
      jobs: { source: string; source_id: string; url: string } | null;
      resume_versions: { content: Record<string, unknown> } | null;
    };
    try {
      if (!row.jobs) throw new Error("application has no linked job");
      if (!row.resume_versions) throw new Error("application has no linked resume_version");

      const payload = buildPayload(row.id, row.jobs, row.resume_versions.content);
      console.log("[submission:dry-run]", JSON.stringify(payload));

      const { error: updateError } = await supabase
        .from("applications")
        .update({ submission_method: payload.method })
        .eq("id", row.id);
      if (updateError) throw updateError;

      queued++;
    } catch (err) {
      console.error(`submission dry-run failed for application ${row.id}:`, err);
      failed++;
    }
  }

  return { queued, failed };
}
