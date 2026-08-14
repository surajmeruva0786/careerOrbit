import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function anthropicClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set. Get one from console.anthropic.com.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const RANKING_MODEL = process.env.ANTHROPIC_RANKING_MODEL || "claude-sonnet-5";
export const TAILORING_MODEL = process.env.ANTHROPIC_TAILORING_MODEL || "claude-sonnet-5";
