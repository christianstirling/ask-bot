// Express set up
import express from "express";
const PORT = 3000;
const app = express();

// Dotenv set up + api key initialization
import dotenv from "dotenv";
dotenv.config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Openai set up
import { ChatOpenAI } from "@langchain/openai";
const model = new ChatOpenAI({
  openAIApiKey: OPENAI_API_KEY,
  modelName: "gpt-4.1-mini",
});

// Chat function
// Takes in message, history, and model
// Returns the response message from model
import { ChatPromptTemplate } from "@langchain/core/prompts";
const chat = async function (message, history = "", model) {
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant named Ergo."],
    ["user", "{message}"],
  ]);

  const chain = prompt.pipe(model);

  const response = await chain.invoke({
    message: message,
  });

  return { message: response.content };
};

// Router set up
// Makes message and history from the REQ
// Calls chat function to generate response
// Sends response message as RES
const router = express.Router();
router.post("/", async (req, res) => {
  try {
    const message = req.body.message;
    console.log("User message: " + message);

    const history = req.body.history;

    const response = await chat(message, history, model);
    console.log("AI message: " + response.message);

    res.json(response);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Set up cors
import cors from "cors";
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

// Other express set up stuff
app.use(express.json());
app.use("/api/chat", router);

// Sets server listening port
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
