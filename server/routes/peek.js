// routes/peek.js

import express from "express";
import { listCollectionChunks, deleteChunkById } from "../services/chroma.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? "25", 10), 200);
    const offset = Math.max(parseInt(req.query.offset ?? "0", 10), 0);

    const data = await listCollectionChunks({ limit, offset });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "id is required" });
    }

    const result = await deleteChunkById({ id });

    return res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
