// server/routes/chat.js
import express from "express";
const router = express.Router();
import { chat } from "../services/chat.js";
import { chatModel } from "../services/llm.js";
import { determine_most_impactful_input } from "../services/compute.js";

const TOP_K = 10;

function getMissingIntakeFields(intake = {}) {
  const required = [
    "action",
    "initialForce",
    // "sustainedForce",
    "handHeight",
    "distance",
    "frequency",
  ];
  return required.filter((k) => intake[k] == null || intake[k] === "");
}

function decidePhase(state, message) {
  console.log("DecidePhase:", !state?.phase);
  if (!state?.phase) {
    // console.log("decidePhase: state / phase not found");
    return "INTRO";
  }

  // Example: if intake missing required fields, keep collecting
  if (state.phase === "INTAKE") {
    // console.log("decidePhase: phase = intake");
    const missing = getMissingIntakeFields(state.intake);
    if (missing.length > 0) {
      // console.log("decidePhase: intake is missing fields; ", missing);
      return "INTAKE";
    }
    // console.log("decidePhase: intake is complete");
    return "CONFIRM_CALC";
  }

  if (state.phase === "CONFIRM_CALC") {
    // console.log("decidePhase: calculation confirmed");
    return "CALC";
  }

  if (state.phase === "CALC") {
    // console.log("decidePhase: phase = calc");
    return "INTERPRET";
  }
  if (state.phase === "INTERPRET") {
    // console.log("decidePhase: phase = interpret");
    return "RETRIEVE_SOLVE";
  }

  console.log(
    // "decidePhase: phase did not meet any of the criteria for orchestration, returning original phase ",
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

    // console.log("USER MESSAGE:", message);
    // console.log("HISTORY:", ...history);
    // console.log("HISTORY LENGTH:", history.length);
    // console.log("full STATE:", state);

    const phase = decidePhase(state, message);

    let assistantMessage;
    let systemPrompt;

    // console.log("NEXT STATE:", phase);
    let nextState = { ...state, phase };

    // console.log("STATE:", state);
    /**
     * =====
     * Here is where I will be adding in the first pipeline: confirm_calc
     * -----
     * Happens when intake is complete.
     * Purpose is to generate a response message from the AI prompting user to confirm that they are ready to begin calc.
     * =====
     */

    if (phase === "INTRO") {
      systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 
      Your job is to receive workplace task inputs from a user, perform a calculation using those values, 
      retrieve data from a database regarding relevant solutions based on the metrics resulting from those 
      calculations, and then suggest relevant solutions based on that data.
      Please generate the best response to the user's message based on the given chat history. 
      If you have not already, please introduce yourself to the user.
      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "INTAKE") {
      systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 
      Your job is to receive workplace task inputs from a user, perform a calculation using those values, 
      retrieve data from a database regarding relevant solutions based on the metrics resulting from those 
      calculations, and then suggest relevant solutions based on that data.
      The user has begun to provide their task inputs, but you are missing one or more values. Please prompt the user 
      to provide the missing values.
      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "CONFIRM_CALC") {
      systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 
      You have just received all of the necessary input variables to be able to perform an ergonomic analysis on 
      the user's workplace task. Please confirm that the user is ready to begin the analysis.
      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "CALC") {
      // Begin compute pipeline
      // Return results
      // Put results in the system prompt
      // Generate assistant message using this prompt

      const {
        handHeight,
        distance,
        frequency,
        initialForce,
        // sustainedForce,
        action,
      } = state.intake;

      const result = determine_most_impactful_input(
        handHeight,
        distance,
        frequency,
        initialForce,
        // sustainedForce,
        action,
      );

      systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 
      A metric analysis has been run on a set on data that the user has provided which describes a workplace task. 
      Below are the results of that analysis:
      ${result.description}
      Additionally, here is a list of the metric contribution percentages for each task input:
      ${result.mcpValues.map((input) => `${input.name}: ${input.value}`).join("\n")}
      Generate a response to the user based on the current chat history and the result of the analysis. 
      If the task is deemed acceptable, then tell that to the user.
      If the task is deemed not acceptable, then list the task inputs alongside their respective mcp values.
      
      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    // console.log("AI MESSAGE:", assistantMessage);

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
