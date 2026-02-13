// server/services/clarify.js
import { chatModel } from "./llm.js";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const clarifyPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `
You are Ergo, a helpful assistant.
Always start by introducing yourself and stating your goals as an assistant.

Your job is to help the user discover solutions to the ergonomics issues surrounding a specific 
task within his job.
The task will always be either a push or a pull task.

The user will need to provide the type of task, the initial force needed to get the object moving,
the sustained force needed to keep it moving, the height of the worker's hands above the ground, 
the distance that the object is pushed, and the frequency with which the action is performed.

To be able to solve the problem accurately, you should prompt the user to provide any missing inputs.
Please do this in a conversational way, ideally by only asking for one piece of information
 at a time.
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
