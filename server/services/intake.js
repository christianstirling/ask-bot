// server/services/intake.js
import { z } from "zod";
import { chatModel } from "./llm.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const IntakeSchema = z.object({
  hasEnoughInfo: z.boolean(),
  missing: z.array(z.string()).default([]),

  // structured intake
  intake: z.object({
    action: z.enum(["push", "pull"]).nullable().default(null),

    // numeric inputs (allow null until collected)
    initialForce: z.number().nullable().default(null),
    sustainedForce: z.number().nullable().default(null),
    handHeight: z.number().nullable().default(null),
    distance: z.number().nullable().default(null),
    frequency: z.number().nullable().default(null),

    // units (optional but useful)
    forceUnit: z.string().nullable().default(null), // e.g. "lb", "N"
    heightUnit: z.string().nullable().default(null), // e.g. "in", "cm"
    distanceUnit: z.string().nullable().default(null), // e.g. "ft", "m"
    frequencyUnit: z.string().nullable().default(null), // e.g. "per_min", "per_hour"

    // environment context for retrieval
    environment: z
      .object({
        summary: z.string().nullable().default(null), // free text description
        surface: z.string().nullable().default(null), // e.g. "concrete", "carpet"
        slope: z.string().nullable().default(null), // e.g. "flat", "ramp"
        loadType: z.string().nullable().default(null), // e.g. "cart", "pallet jack"
        constraints: z.string().nullable().default(null), // e.g. "tight turns"
      })
      .default({}),
  }),

  // control signal: should we run retrieval this turn?
  shouldRetrieveNow: z.boolean().default(false),
});

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are an intake parser for a push/pull ergonomics assistant.

TASK:
1) Extract structured intake fields from the conversation.
2) Decide if enough info is available to run retrieval (RAG) now.

REQUIRED to be "enough info":
- action (push or pull)
- initialForce (number)
- sustainedForce (number)
- handHeight (number)
- distance (number)
- frequency (number)
- environment.summary (non-empty description)

OUTPUT:
Return ONLY valid JSON with these keys:
- hasEnoughInfo (boolean)
- missing (array of strings describing missing fields)
- intake (object)
- shouldRetrieveNow (boolean)

RULES:
- Use null when unknown.
- If a user provides a value without a unit, infer from context if obvious; otherwise leave unit null.
- shouldRetrieveNow should become true only when the latest user message completes the last missing requirement or the conversation is otherwise clearly ready to retrieve solutions.
`,
  ],
  ["user", `HISTORY:\n{historyText}\n\nLATEST USER MESSAGE:\n{message}`],
]);

function historyToText(history = []) {
  if (!Array.isArray(history)) return "";
  return history
    .filter(
      (m) => m && typeof m.role === "string" && typeof m.content === "string",
    )
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");
}

export async function extractIntakeState({ message, history }) {
  const chain = prompt.pipe(chatModel);
  const raw = await chain.invoke({
    message,
    historyText: historyToText(history),
  });

  let parsed;
  try {
    parsed = JSON.parse(raw.content);
  } catch {
    throw new Error(
      `extractIntakeState: model did not return valid JSON: ${raw.content}`,
    );
  }

  return IntakeSchema.parse(parsed);
}
