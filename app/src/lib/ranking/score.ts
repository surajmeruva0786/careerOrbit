import { anthropicClient, RANKING_MODEL } from "../anthropic";

export type ProfileForScoring = {
  full_name: string;
  experience: unknown;
  projects: unknown;
  skills: unknown;
  education: unknown;
};

export type JobForScoring = {
  company: string;
  title: string;
  location: string | null;
  description: string | null;
};

export type ScoreResult = {
  fit_score: number;
  friction_score: number;
  reasoning: string;
};

const SUBMIT_SCORE_TOOL = {
  name: "submit_score",
  description: "Submit the fit and friction score for this job posting against this candidate's profile.",
  input_schema: {
    type: "object" as const,
    properties: {
      fit_score: {
        type: "number",
        description:
          "0-100. How well this posting matches the candidate's actual domain background, skills, and seniority (internship-appropriate). 0 = no relevant overlap, 100 = ideal match.",
      },
      friction_score: {
        type: "number",
        description:
          "0-100. How much process friction this application likely has, inferred only from the posting text -- multi-stage interviews explicitly mentioned, OA/case-study mentioned, government clearance required, highly competitive framing, etc. 0 = low friction (simple apply), 100 = high friction.",
      },
      reasoning: {
        type: "string",
        description: "2-3 sentences: why this fit_score and friction_score, citing specific overlaps or gaps.",
      },
    },
    required: ["fit_score", "friction_score", "reasoning"],
  },
};

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

/**
 * Scores one job posting against the candidate profile using Claude.
 * Per docs/PLAN.md §6: fit on domain background + seniority, friction
 * inferred from posting language only -- never invents info about the
 * actual hiring process.
 */
export async function scoreJob(job: JobForScoring, profile: ProfileForScoring): Promise<ScoreResult> {
  const client = anthropicClient();

  const profileSummary = JSON.stringify(
    {
      name: profile.full_name,
      experience: profile.experience,
      projects: profile.projects,
      skills: profile.skills,
      education: profile.education,
    },
    null,
    0
  );

  const message = await client.messages.create({
    model: RANKING_MODEL,
    max_tokens: 1024,
    tools: [SUBMIT_SCORE_TOOL],
    tool_choice: { type: "tool", name: "submit_score" },
    messages: [
      {
        role: "user",
        content: `Candidate profile:\n${truncate(profileSummary, 4000)}\n\nJob posting:\nCompany: ${job.company}\nTitle: ${job.title}\nLocation: ${job.location ?? "unknown"}\nDescription: ${truncate(job.description ?? "", 3000)}\n\nScore this posting for this candidate. Be honest and specific -- a generic finance/ops internship should score low on fit even at a great company; a role that clearly overlaps the candidate's real experience should score high.`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a submit_score tool call");
  }
  const input = toolUse.input as ScoreResult;
  return {
    fit_score: Math.max(0, Math.min(100, Number(input.fit_score))),
    friction_score: Math.max(0, Math.min(100, Number(input.friction_score))),
    reasoning: input.reasoning,
  };
}
