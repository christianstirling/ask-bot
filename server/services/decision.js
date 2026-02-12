import { z } from "zod";
import { chatModel } from "./llm.js";
import { ChatPromptTemplate } from "@langchain/core/prompts.js";

const DecisionSchema = z.object({
  hasEnoughInfo: z.boolean(),
  missing: z.array(z.string()).default([]),
  collected: z.record(z.any()).default({}),
  nextQuestion: z.string().default(""),
});

const decisionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are an intake assistant for an ergonomics push/pull helper.
Your job is to determine whether you have enough information to proceed to retrieval + answering.

Required fields (minimum):
- action (push or pull)
- initialForce
- sustainedForce
- handHeight
- distance
- frequency

Return ONLY valid JSON with keys:
hasEnoughInfo (boolean),
missing (array of strings),
collected (object),
nextQuestion (string)
`,
  ],
  [
    "user",
    `Conversation so far:\n{historyText}\n\nLatest user message:\n{message}`,
  ],
]);

function historyToText(history = []) {
  if (!Array.isArray(history)) return "";
  return history
    .filter(
      (m) => m && typeof m.content === "string" && typeof m.role === "string",
    )
    .map((m) => `%{m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
}

export async function decideNextStep({ message, history }) {
  const chain = decisionPrompt.pipe(chatModel);

  const raw = await chain.invoke({
    message,
    historyText: historyToText(history),
  });

  let parsed;
  try {
    parsed = JSON.parse(raw.content);
  } catch {
    throw new Error(
      `decideNextStep: model did not return valid JSON: ${raw.content}`,
    );
  }

  return DecisionSchema.parse(parsed);
}
