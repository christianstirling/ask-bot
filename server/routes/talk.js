// server/routes/chat.js
import express from "express";
import { z } from "zod";
import { runConversationTurn } from "../orchestrators/conversationOrchestrator.js";

const router = express.Router();

const BodySchema = z.object({
  message: z.string().optional().default(""),
  // optional: when user submits UI boxes instead of chat text
  form: z
    .object({
      action: z.string().optional(),
      initialForce: z.union([z.string(), z.number()]).optional(),
      sustainedForce: z.union([z.string(), z.number()]).optional(),
      handHeight: z.union([z.string(), z.number()]).optional(),
      distance: z.union([z.string(), z.number()]).optional(),
      frequency: z.union([z.string(), z.number()]).optional(),
      environmentDescription: z.string().optional(),
    })
    .optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .default([]),
  // optional: a lightweight session state the client stores and sends back
  state: z.object({}).passthrough().optional().default({}),
  debug: z.boolean().optional().default(false),
});

router.post("/", async (req, res, next) => {
  try {
    const body = BodySchema.parse(req.body);

    const result = await runConversationTurn({
      message: body.message,
      form: body.form,
      history: body.history,
      state: body.state,
      debug: body.debug,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
