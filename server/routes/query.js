import express from "express";
const router = express.Router();
import { heartbeat } from "../services/chroma";

router.post("/", async (req, res) => {
  const { question, topK } = req.body || {};

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "question (string) is required" });
  }

  const hb = await heartbeat();

  return res.json({
    ok: true,
    question,
    topK: 5, // The suggested format here was conditional if topK = num then set as topK value, otherwise set as 5 -- will come back to this later
    chroma: hb,
    next: "In step 3, we will embed question -> similarity search -> assemble prompt -> answer.",
  });
});

export default router;
