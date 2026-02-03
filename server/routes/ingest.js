// server/routes/ingest.js

// -- Imports and configuration --

import express from "express";
const router = express.Router();

import ingestText from "../services/ingest.js";

// -- Route --

router.post("/", async (req, res, next) => {
  try {
    const { docId, text, metadata } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text (string) is required" });
    }
    const result = await ingestText({
      text,
      docId,
      metadata: metadata || {},
    });

    return res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
