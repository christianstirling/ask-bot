// routes/peek.js

import express from "express";
import { listChunks, deleteChunk } from "../services/chroma.js";

const router = express.Router();

/**
 * =====
 * GET route - returns a certain number of chunk at a certain index
 * for the purpose of viewing the contents of those chunks
 * =====
 */

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? "25", 10), 200);
    const offset = Math.max(parseInt(req.query.offset ?? "0", 10), 0);

    const data = await listChunks({ limit, offset });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * =====
 * DELETE - deletes the selected chunk from the chroma database
 * =====
 */

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id is required" });
    }

    const result = await deleteChunk({ id });

    return res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
