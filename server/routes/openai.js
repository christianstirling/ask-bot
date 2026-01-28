import express from "express";
import { chat } from "../services/chat.js";
import { chatModel } from "../services/llm.js";

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

    const responseMessage = await chat(message, history, chatModel);
    console.log("AI message: " + responseMessage);

    return res.json({ message: responseMessage });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
