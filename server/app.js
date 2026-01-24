// Express set up
import express from "express";
const PORT = 3000;
const app = express();

// Set up cors
import cors from "cors";
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

// Other express set up stuff
app.use(express.json());

// Dotenv set up + api key initialization
import dotenv from "dotenv";
dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// LangChain set up
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// Openai set up
import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: "gpt-4.1-mini",
});

// Build history
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

// Chat function
// Takes in message, history, and model
// Returns the response message from model

const chat = async function (message, history = "", model) {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant named Ergo."],
    new MessagesPlaceholder("history"),
    ["user", "{message}"],
  ]);

  const chain = prompt.pipe(model);

  const response = await chain.invoke({
    message: message,
    history: coerceHistory(history),
  });

  return response.content;
};

// Router set up
// Makes message and history from the REQ
// Calls chat function to generate response
// Sends response message as RES
const router = express.Router();
router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body;
    console.log("User message: " + message);

    if (!message || typeof message !== "string") {
      return res
        .status(400)
        .json({ error: "message must be a non-empty string" });
    }

    const response = await chat(message, history, model);
    console.log("AI message: " + response.message);

    return res.json({ message: response });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Attach the router to the /api/chat route
app.use("/api/chat", router);

// Sets server listening port
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
