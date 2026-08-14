import { anthropicClient, TAILORING_MODEL } from "../anthropic";

type ExperienceEntry = { title: string; org: string; bullets: string[]; [k: string]: unknown };
type ProjectEntry = { name: string; bullets: string[]; [k: string]: unknown };

export type BaseResumeContent = {
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  [k: string]: unknown;
};

export type TailoredResume = {
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  cover_note: string;
};

const SUBMIT_TAILORED_RESUME_TOOL = {
  name: "submit_tailored_resume",
  description: "Submit the tailored resume for this job posting.",
  input_schema: {
    type: "object" as const,
    properties: {
      experience: {
        type: "array",
        description:
          "The SAME experience entries as the base resume (same org/title), reordered to put the most relevant first. Bullets may be reworded to mirror the job posting's language, but must describe the same real work -- no new facts, numbers, or claims.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            org: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["title", "org", "bullets"],
        },
      },
      projects: {
        type: "array",
        description:
          "A subset/reordering of the base resume's real projects, most relevant first. Same constraint: reword bullets, never invent projects or claims.",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["name", "bullets"],
        },
      },
      cover_note: {
        type: "string",
        description: "A short (3-5 sentence) cover note connecting the candidate's real experience to this specific role.",
      },
    },
    required: ["experience", "projects", "cover_note"],
  },
};

class TailoringIntegrityError extends Error {}

/** Rejects output that introduces orgs/projects not present in the base resume. */
function assertNoFabrication(base: BaseResumeContent, tailored: TailoredResume) {
  const baseOrgs = new Set(base.experience.map((e) => e.org));
  const baseProjects = new Set(base.projects.map((p) => p.name));

  for (const entry of tailored.experience) {
    if (!baseOrgs.has(entry.org)) {
      throw new TailoringIntegrityError(`Tailored resume invented an organization: "${entry.org}"`);
    }
  }
  for (const project of tailored.projects) {
    if (!baseProjects.has(project.name)) {
      throw new TailoringIntegrityError(`Tailored resume invented a project: "${project.name}"`);
    }
  }
}

/**
 * Tailors the base resume to a specific job posting: reorders and
 * rewords real experience/projects, never invents. Throws
 * TailoringIntegrityError if the model's output introduces an
 * organization or project that isn't in the base resume -- per
 * docs/PLAN.md's hard constraint, this is not a soft guideline.
 */
export async function tailorResume(
  job: { company: string; title: string; description: string | null },
  base: BaseResumeContent
): Promise<TailoredResume> {
  const client = anthropicClient();

  const message = await client.messages.create({
    model: TAILORING_MODEL,
    max_tokens: 2048,
    tools: [SUBMIT_TAILORED_RESUME_TOOL],
    tool_choice: { type: "tool", name: "submit_tailored_resume" },
    system:
      "You tailor resumes truthfully. You may reorder entries, select which real projects to foreground, " +
      "and reword bullets to mirror the job posting's language and emphasis. You must NEVER invent an " +
      "employer, project, number, or claim that isn't already in the base resume provided. If a bullet " +
      "doesn't fit, omit it -- do not embellish it into something false.",
    messages: [
      {
        role: "user",
        content:
          `Base resume (ground truth, do not add facts beyond this):\n${JSON.stringify(base)}\n\n` +
          `Job posting:\nCompany: ${job.company}\nTitle: ${job.title}\n` +
          `Description: ${(job.description ?? "").slice(0, 3000)}\n\n` +
          "Produce the tailored resume for this posting.",
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a submit_tailored_resume tool call");
  }
  const tailored = toolUse.input as TailoredResume;

  assertNoFabrication(base, tailored);

  return tailored;
}

export { TailoringIntegrityError };
