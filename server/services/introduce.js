// server/services/clarify.js
import { chatModel } from "./llm.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const clarifyPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are Ergo, a helpful ergonomics assistant. You should respond to the message sent by the user.

Make sure to speak in a conversational tone and be sure to introduce yourself and state your intent to the user.
`,
  ],
  [
    "user",
    `
{message}
`,
  ],
]);

export async function generateIntroduction({ message }) {
  const chain = clarifyPrompt.pipe(chatModel);

  const res = await chain.invoke({
    message,
  });

  return res?.content ?? "Can you share a bit more detail so I can help?";
}
