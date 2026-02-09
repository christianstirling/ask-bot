/**
 * Full ask endpoint
 *
 * POST /api/query
 *
 * retrieval AND answer generation
 */

import express from "express";
const router = express.Router();

import { retrieve } from "../services/retrieve.js";
import { chatModel } from "../services/llm.js";
import { chat } from "../services/chat.js";

/**
 * Query route
 *
 * POST /api/query/retrieve
 *
 * This route does retrieval only--no LLM calling here.
 * This should be used to validate Chroma results in dev only.
 *
 * a.) builds and validates input
 * b.) runs retrieve function to return a flat list of sources
 */

router.post("/retrieve", async (req, res, next) => {
  try {
    // a.)
    const { question, topK, where } = req.body || {};

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "question (string) is required" });
    }

    // b.)
    const sources = await retrieve({
      question,
      topK: Number.isFinite(topK) ? topK : 5,
      where: where && typeof where === "object" ? where : undefined,
    });

    return res.json({ ok: true, sources });
  } catch (err) {
    next(err);
  }
});

/**
 * Full ask endpoint
 *
 * POST /api/query
 *
 * Full RAG: retrieve -> assemble prompt -> chat
 *
 * a.) builds and validates input
 * b.) runs retrieve function to return flat list of sources
 * c.) build a context block for the LLM
 */

router.post("/", async (req, res, next) => {
  try {
    // a.)
    const {
      question,
      history = [],
      topK,
      where,
      returnSources = true,
    } = req.body || {};

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "question (string) is required" });
    }

    // b.)
    const sources = await retrieve({
      question,
      topK: Number.isFinite(topK) ? topK : 5,
      where: where && typeof where === "object" ? where : undefined,
    });

    // c.)
    const context = sources
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

    const ragMessage =
      `Use the SOURCES below to answer the user.\n` +
      `If the answer is not in the sources, say that you don't know.\n` +
      `Cite sources inline like: [SOURCE 1], [SOURCE 2]. \n\n` +
      `SOURCES:\n${context}\n\n` +
      `QUESTION:\n${question}`;

    const answer = await chat(ragMessage, history, chatModel);

    return res.json({
      ok: true,
      answer,
      ...(returnSources ? { sources } : {}),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
