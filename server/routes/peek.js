// routes/peek.js

import express from "express";
import { listCollectionChunks } from "../services/chroma.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? "25", 10), 200);
    const offset = Math.min(parseInt(req.query.offset ?? "0", 10), 0);

    const data = await listCollectionChunks({ limit, offset });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
