import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

const systemMessage = `
You are Ergo, a helpful ergonomics AI assistant.
You will be given information relating to a specific workplace task and 
solution data for solutions that are applicable to relevant tasks.
Please write a list of likely solutions to the user's specific problem in your own words 
(cite your sources at the end). You do not need to elaborate on how to implement these sources.
`;

function coerceHistory(history) {
  if (!Array.isArray(history)) return [];

  const out = [];

  for (const m of history) {
    if (!m || typeof m.content !== "string") continue;
    if (m.role === "user") out.push(new HumanMessage(m.content));
    else if (m.role === "assistant") out.push(new AIMessage(m.content));
    else if (m.role === "system") out.push(new SystemMessage(m.content));
  }

  return out;
}

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful chat bot named Ergo."],
  new MessagesPlaceholder("history"),
  ["user", "{message}"],
]);

// chat function -- called in openai router
export async function chat(message, history = [], model) {
  if (typeof message !== "string" || !message.trim()) {
    throw new Error("chat(): message must be a non-empty string");
  }
  if (!model) {
    throw new Error("chat(): model is required");
  }

  const chain = prompt.pipe(model);

  const response = await chain.invoke({
    message,
    history: coerceHistory(history),
  });

  return response?.content ?? "";
}
