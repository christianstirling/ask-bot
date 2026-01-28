// server/routes/ingest.js

// -- Imports and configuration --

import express from "express";
const router = express.Router();

import ingestText from "../services/ingest.js";

// -- Route --

router.post("/", async (req, res, next) => {
  try {
    console.log("Ingest Router - START");
    console.log("Request body:");
    console.log(req.body);
    const { docId, text, metadata } = req.body || {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "text (string) is required" });
    }
    console.log("CALLING ingestText IN services/ingest FROM routes/ingest");
    const result = await ingestText({
      text,
      docId,
      metadata: metadata || {},
    });
    console.log("RETURNED result FROM ingestText:");
    console.log(result);

    console.log("Ingest Router - FINISH: Success");
    return res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
