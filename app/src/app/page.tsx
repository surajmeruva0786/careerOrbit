import { getApplicationsByStatus } from "@/lib/applications";
import { ApplicationCard } from "@/components/ApplicationCard";

// Always reads live from Supabase -- never prerendered/cached statically.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const needsReview = await getApplicationsByStatus(["pending_review", "tailored", "ranked"]);
  const history = await getApplicationsByStatus([
    "approved",
    "submitted",
    "awaiting_reply",
    "completed",
    "rejected",
    "skipped",
  ]);

  const sorted = [...needsReview].sort(
    (a, b) => (b.rankings?.fit_score ?? 0) - (a.rankings?.fit_score ?? 0)
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="max-w-3xl mx-auto py-12 px-6 flex flex-col gap-8">
        <header>
          <h1 className="text-2xl font-semibold">CareerOrbit</h1>
          <p className="text-sm opacity-70">Review queue — approve before anything gets submitted.</p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Needs your review ({sorted.length})</h2>
          {sorted.length === 0 && (
            <p className="text-sm opacity-60">
              Nothing ready yet. Sourcing/ranking/tailoring run on a schedule — see docs/CHANGELOG.md.
            </p>
          )}
          {sorted.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </section>

        {history.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-medium">History ({history.length})</h2>
            {history.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
