import express from "express";
const router = express.Router();

router.post("/", async (req, res) => {
  const { docID, text, metadata } = req.body || {};

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text (string) is required" });
  }

  return res.json({
    ok: true,
    received: {
      docID: docID || null,
      textlength: text.length,
      metadata: metadata || {},
    },
    next: "In step 2, we will chunk -> embed -> upsert into Chroma.",
  });
});

export default router;
