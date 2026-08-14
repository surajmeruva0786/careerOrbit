import type { ApplicationRow } from "@/lib/applications";
import { ResumeDiff } from "./ResumeDiff";
import { approveApplication, rejectApplication } from "@/app/actions";

const REVIEWABLE_STATUSES = ["pending_review", "tailored", "ranked"];

export function ApplicationCard({ application }: { application: ApplicationRow }) {
  const job = application.jobs;
  const ranking = application.rankings;
  const resume = application.resume_versions;
  const reviewable = REVIEWABLE_STATUSES.includes(application.status);

  return (
    <div className="border border-black/10 dark:border-white/15 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-semibold">{job?.title ?? "Unknown title"}</div>
          <div className="text-sm opacity-70">
            {job?.company} {job?.location ? `· ${job.location}` : ""}
          </div>
        </div>
        {ranking && (
          <div className="text-right text-sm shrink-0">
            <div>
              fit <span className="font-mono font-semibold">{Math.round(ranking.fit_score)}</span>
            </div>
            <div className="opacity-70">
              friction <span className="font-mono">{Math.round(ranking.friction_score)}</span>
            </div>
          </div>
        )}
      </div>
      {ranking?.reasoning && <p className="text-sm opacity-80">{ranking.reasoning}</p>}
      <div className="flex items-center gap-3 text-sm">
        {job?.url && (
          <a href={job.url} target="_blank" rel="noreferrer" className="underline opacity-80 hover:opacity-100">
            View posting
          </a>
        )}
        <span className="opacity-50">status: {application.status}</span>
      </div>
      {resume && (
        <ResumeDiff
          diff={resume.diff_from_base}
          coverNote={typeof resume.content?.cover_note === "string" ? resume.content.cover_note : undefined}
        />
      )}
      {reviewable && (
        <div className="flex items-center gap-2 pt-1">
          <form action={approveApplication.bind(null, application.id)}>
            <button
              type="submit"
              className="text-sm rounded-md bg-emerald-600 text-white px-3 py-1.5 hover:bg-emerald-700"
            >
              Approve
            </button>
          </form>
          <form action={rejectApplication.bind(null, application.id)}>
            <button
              type="submit"
              className="text-sm rounded-md border border-black/15 dark:border-white/20 px-3 py-1.5 opacity-80 hover:opacity-100"
            >
              Reject
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
