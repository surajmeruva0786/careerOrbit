import { anthropicClient, RANKING_MODEL } from "../anthropic";

export type MissingField = {
  field_name: string;
  question: string;
};

const SUBMIT_MISSING_FIELDS_TOOL = {
  name: "submit_missing_fields",
  description:
    "Submit the list of application questions this posting is likely to ask that the candidate's stored profile has no answer for.",
  input_schema: {
    type: "object" as const,
    properties: {
      missing_fields: {
        type: "array",
        description:
          "Only include a field if the posting text explicitly asks for it (e.g. 'must state visa status', 'notice period', 'expected salary', 'are you authorized to work in <country>'). Do not invent generic screening questions the posting never mentions.",
        items: {
          type: "object",
          properties: {
            field_name: {
              type: "string",
              description: "Short snake_case key, e.g. 'work_authorization', 'notice_period', 'expected_salary'.",
            },
            question: {
              type: "string",
              description: "The exact question to ask the candidate, in plain language.",
            },
          },
          required: ["field_name", "question"],
        },
      },
    },
    required: ["missing_fields"],
  },
};

/**
 * Compares a job posting's text against the candidate's stored
 * screening_answers and returns only the fields the posting actually
 * asks about that aren't already answered -- per PLAN.md §8, every
 * question emailed to the user must be real and specific, never a
 * generic form dump.
 */
export async function detectMissingFields(
  job: { company: string; title: string; description: string | null },
  screeningAnswers: Record<string, unknown>
): Promise<MissingField[]> {
  const client = anthropicClient();

  const message = await client.messages.create({
    model: RANKING_MODEL,
    max_tokens: 1024,
    tools: [SUBMIT_MISSING_FIELDS_TOOL],
    tool_choice: { type: "tool", name: "submit_missing_fields" },
    messages: [
      {
        role: "user",
        content: `Job posting:\nCompany: ${job.company}\nTitle: ${job.title}\nDescription: ${(job.description ?? "").slice(0, 4000)}\n\nCandidate's existing stored answers (do not re-ask any of these): ${JSON.stringify(screeningAnswers)}\n\nList only screening/application questions this specific posting text asks that aren't already answered above.`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a submit_missing_fields tool call");
  }
  const input = toolUse.input as { missing_fields: MissingField[] };
  return input.missing_fields ?? [];
}
