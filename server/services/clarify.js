// server/services/clarify.js
import { chatModel } from "./llm.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const clarifyPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are Ergo, a helpful assistant.
Your job is to ask for the missing information needed to analyze a push/pull task.

Requirements:
- Ask the MINIMUM number of questions to get the missing fields.
- Ask in a friendly, concise way.
- Use units in your questions (ask user to include them).
- If environment.summary is missing, ask for a brief description (1-2 sentences).
- Do NOT mention "schema" or internal tooling.
`,
  ],
  [
    "user",
    `
Missing fields:
{missing}

Already collected:
{collected}

Latest user message:
{message}
`,
  ],
]);

export async function generateClarifyingQuestion({
  missing,
  collected,
  message,
}) {
  const chain = clarifyPrompt.pipe(chatModel);

  const res = await chain.invoke({
    missing: JSON.stringify(missing ?? []),
    collected: JSON.stringify(collected ?? {}),
    message,
  });

  return res?.content ?? "Can you share a bit more detail so I can help?";
}
