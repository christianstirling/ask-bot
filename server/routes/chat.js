// server/routes/chat.js
import express from "express";
const router = express.Router();

import { extractIntakeState } from "../services/intake.js";
import { generateClarifyingQuestion } from "../services/clarify.js";
import { retrieve } from "../services/retrieve.js";
import { chat } from "../services/chat.js";
import { chatModel } from "../services/llm.js";
import { generateIntroduction } from "../services/introduce.js";
import { generateSolution } from "../services/solve.js";

function buildContextBlock(sources) {
  return sources
    .map((s, i) => {
      const title = s?.metadata?.title ? ` | title=${s.metadata.title}` : "";
      const docId = s?.metadata?.docId
        ? `docId=${s.metadata.docId}`
        : "docId=?";
      const chunkIndex =
        typeof s?.metadata?.chunkIndex === "number"
          ? `chunkIndex=${s.metadata.chunkIndex}`
          : "chunkIndex=?";
      return `SOURCE ${i + 1} (id=${s.id} ${docId} ${chunkIndex}${title})\n${s.content}`;
    })
    .join("\n\n");
}

router.post("/", async (req, res, next) => {
  try {
    const {
      message,
      history = [],
      topK,
      where,
      returnSources = true,
    } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) is required" });
    }

    console.log("MESSAGE:", message);
    console.log("HISTORY:", ...history);
    console.log("HISTORY LENGTH:", history.length);

    // 1) Extract intake + decision
    const state = await extractIntakeState({ message, history });
    console.log("INTAKE STATE:", JSON.stringify(state.hasEnoughInfo, null, 2));

    // if (process.env.NODE_ENV === "development") {
    //   console.log("INTAKE STATE:", JSON.stringify(state, null, 2));
    // }

    // 2) Not enough info -> ask via LLM
    if (!state.hasEnoughInfo) {
      if (history.length <= 1) {
        // Introduce
        console.log("INTRODUCE");
        const assistantMessage = await generateIntroduction({
          message,
        });

        return res.json({
          ok: true,
          mode: "introduce",
          assistantMessage,
          state,
        });
      } else {
        console.log("CLARIFY");
        const assistantMessage = await generateClarifyingQuestion({
          missing: state.missing,
          collected: state.intake,
          message,
          history,
        });
        return res.json({
          ok: true,
          mode: "clarify",
          assistantMessage,
          state, // return state for client debugging (remove later if you want)
        });
      }
    }

    // 3) Enough info, but only retrieve when appropriate
    if (state.shouldRetrieveNow && state.hasEnoughInfo) {
      const sources = await retrieve({
        question: message,
        topK: Number.isFinite(topK) ? topK : 10,
        where: where && typeof where === "object" ? where : undefined,
      });

      const context = buildContextBlock(sources);
      console.log("CONTEXT:", context);

      // const ragMessage =
      //   `Below are the latest user message and a list of the sources from the solution database.\n` +
      //   `If the answer is not in the sources, say you don't know.\n` +
      //   `Cite sources inline like: [SOURCE 1].\n\n` +
      //   `SOURCES:\n${context}\n\n` +
      //   `USER QUESTION:\n${message}`;

      // const assistantMessage = await chat(ragMessage, history, chatModel);

      console.log("SOLVE");

      const assistantMessage = await generateSolution({
        message,
        history,
        context,
      });

      return res.json({
        ok: true,
        mode: "rag_answer",
        assistantMessage,
        ...(returnSources ? { sources } : {}),
        state,
      });
    }

    // 4) Enough info but decision says "not yet": normal chat turn
    // (Optional, but matches your requirement about "appropriate time")
    const assistantMessage = await chat(message, history, chatModel);

    return res.json({
      ok: true,
      mode: "chat",
      assistantMessage,
      state,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
