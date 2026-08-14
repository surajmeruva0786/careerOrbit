import { supabaseServer } from "./supabase/server";

export type ApplicationRow = {
  id: string;
  status: string;
  submission_method: string | null;
  created_at: string;
  jobs: { company: string; title: string; location: string | null; url: string } | null;
  rankings: { fit_score: number; friction_score: number; reasoning: string | null } | null;
  resume_versions: {
    content: { cover_note?: string; [k: string]: unknown };
    diff_from_base: unknown;
  } | null;
};

const SELECT = `
  id, status, submission_method, created_at,
  jobs ( company, title, location, url ),
  rankings ( fit_score, friction_score, reasoning ),
  resume_versions ( content, diff_from_base )
`;

export async function getApplicationsByStatus(statuses: string[]): Promise<ApplicationRow[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("applications")
    .select(SELECT)
    .in("status", statuses)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ApplicationRow[];
}
