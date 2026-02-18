// server/routes/chat.js
import express from "express";
const router = express.Router();
import { chat } from "../services/chat.js";
import { chatModel } from "../services/llm.js";

const TOP_K = 10;

function getMissingIntakeFields(intake = {}) {
  const required = [
    "action",
    "initialForce",
    "sustainedForce",
    "handHeight",
    "distance",
    "frequency",
  ];
  return required.filter((k) => intake[k] == null || intake[k] === "");
}

function decidePhase(state, message) {
  console.log("DecidePhase:", !state?.phase);
  if (!state?.phase) {
    console.log("decidePhase: state / phase not found");
    return "INTRO";
  }

  // Example: if intake missing required fields, keep collecting
  if (state.phase === "INTAKE") {
    console.log("decidePhase: phase = intake");
    const missing = getMissingIntakeFields(state.intake);
    if (missing.length > 0) {
      console.log("decidePhase: intake is missing fields; ", missing);
      return "INTAKE";
    }
    console.log("decidePhase: intake is complete");
    return "CALC";
  }

  if (state.phase === "CALC") {
    console.log("decidePhase: phase = calc");
    return "INTERPRET";
  }
  if (state.phase === "INTERPRET") {
    console.log("decidePhase: phase = interpret");
    return "RETRIEVE_SOLVE";
  }

  console.log(
    "decidePhase: phase did not meet any of the criteria for orchestration, returning original phase ",
    state.phase,
  );
  return state.phase;
}

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
    const { message, history = [], state = {} } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) is required" });
    }

    console.log("USER MESSAGE:", message);
    // console.log("HISTORY:", ...history);
    // console.log("HISTORY LENGTH:", history.length);

    console.log("full STATE:", state);

    const phase = decidePhase(state, message);

    let assistantMessage;

    console.log("NEXT STATE:", phase);
    let nextState = { ...state, phase };

    assistantMessage = await chat(message, history, chatModel);

    console.log("AI MESSAGE:", assistantMessage);

    return res.json({
      ok: true,
      mode: "chat",
      state: nextState,
      assistantMessage,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
