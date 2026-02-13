// server/services/solve.js

import { chatModel } from "./llm.js";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

const clarifyPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are Ergo, a helpful ergonomics assistant.

At this point, you likely have all of the inputs from the user regarding a task that they want
 you to help develop a solution for. You should also have access to some context from a solution database
 which should provide some solutions that are relevant to the user's problem.

Please devise a list of 3 specific solutions from the context block and cite the source blocks next to each solution.

`,
  ],

  new MessagesPlaceholder("history"),

  [
    "user",
    `
Latest user message:
{message}

Context block: (these are the most relevant solutions that were pulled from out database)
{context}
`,
  ],
]);

function coerceHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (m) =>
        m &&
        typeof m === "object" &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        m.content.trim() !== "",
    )
    .map((m) => {
      if (m.role === "user") return new HumanMessage(m.content);
      if (m.role === "assistant") return new AIMessage(m.content);
      if (m.role === "system") return new SystemMessage(m.content);
      // If you ever store other roles, either map them or drop them:
      return null;
    })
    .filter(Boolean);
}

export async function generateSolution({ message, history, context }) {
  const chain = clarifyPrompt.pipe(chatModel);

  const res = await chain.invoke({
    history: coerceHistory(history),
    message,
    context,
  });

  return res?.content;
}
