// server/routes/chat.js
import express from "express";
const router = express.Router();
import { chat } from "../services/chat.js";
import { chatModel } from "../services/llm.js";
import { determine_most_impactful_input } from "../services/compute.js";
import { retrieve } from "../services/retrieve.js";

// const TOP_K = 10;
let result;

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

function moveToNextPhase(state, message) {
  if (!state?.phase) {
    return "INTRO";
  }

  if (state.phase === "INTAKE") {
    const missing = getMissingIntakeFields(state.intake);
    if (missing.length > 0) {
      return "INTAKE";
    }
    return "CONFIRM_CALC";
  }

  if (state.phase === "CONFIRM_CALC") {
    return "CALC";
  }

  if (state.phase === "CALC") {
    return "CALC_DETAILS";
  }

  if (state.phase === "CALC_DETAILS") {
    return "SUMMARY_PROMPT";
  }

  if (state.phase === "SUMMARY_PROMPT") {
    return "SUMMARY_CAPTURE";
  }

  if (state.phase === "SUMMARY_CAPTURE") {
    return "SOLVE";
  }

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
    console.log("Phase in: ", state.phase);

    const phase = moveToNextPhase(state, message);

    console.log("Phase out: ", phase);

    let assistantMessage;
    // let systemPrompt;

    let nextState = { ...state, phase };

    if (phase === "INTRO") {
      const systemPrompt = `Assistant directions:
      
      You are Ergo, a helpful ergonomics AI assistant. 

      Your job is to greet the user and give them an introduction to you and to this app.
      The purpose of the app is to take input from a Task Input form, use it to compute
      a metric analysis, and ultimately provide solution suggestions to the user 
      to help improve the task.

      Ask the user what they want help with. If the user wants analysis or solution development for a workplace task, please refer them to the 
      Task Input form to enter details related to this task.

      Please generate the best response to the user's message based on the given chat history. 

      Try to keep responses short and sweet, while making sure to answer any specific 
      questions asked by the user.
      
      If you have not already, please introduce yourself to the user.

      Information at your disposal (reference if needed:)
    
      The Task Input form looks like this:
      1.) Type of action being performed (Push or Pull)
      2.) Force needed to start moving the object (in kg-force)
      3.) Vertical height of the hands above the floor (in meters)
      4.) Horizontal distance that the object is moved (in meters)
      5.) Frequency (number of times the task is performed per minute)

      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "INTAKE") {
      const systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 

      Your job is to receive workplace task inputs from a user, perform a calculation using those values, 
      retrieve data from a database regarding relevant solutions based on the metrics resulting from those 
      calculations, and then suggest relevant solutions based on that data.
      The user has begun to provide their task inputs, but you are missing one or more values. Please prompt the user 
      to provide the missing values.
      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "CONFIRM_CALC") {
      const systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 
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

      result = determine_most_impactful_input(
        handHeight,
        distance,
        frequency,
        initialForce,
        // sustainedForce,
        action,
      );

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant. 

      A metric analysis has been run on a set on data that the user has provided which describes a workplace task. 

      Generate a response to the user based on the current chat history and the result of the analysis. 

      If the task is deemed acceptable, then tell that to the user.
      If the task is deemed not acceptable, then compare the needed percent of workers fatigued to the actual percent and 
      tell the user what the most impactful input variable is.

      Next, ask the user if they would like more information about the analysis.

      Do not do anything else beyond what has just been listed.

      ---

      Below is the full result of the metric analysis. Use information from this sparingly, 
      but whenever needed to generate the appropriate response.

      A description of the results of that analysis:
      ${result.description}

      If the result of the analysis is negative, then here is the actual percent workers fatigued (blank if task is acceptable):
      ${result.percentWorkersFatigued ? `${result.percentWorkersFatigued}% of female workers cannot perform the task` : "\n"}

      Additionally, here is a list of the metric contribution percentages for each task input:
      ${result.mcpValues.map((input) => `${input.name}: ${input.value}`).join("\n")}

      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "CALC_DETAILS") {
      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      You are being tasked with giving a detailed breakdown of the metric contribution analysis performed on the user's task.
      Be sure to lsit each input variable and provide the metric contribution percentage for that variable.

      Please generate the best response to the user's message based on the given chat history.

      Ask the user if they would like to generate some solutions to this specific task.

      Keep the response friendly and concise! Do not provide any solutions to the user.

      ---

      Below is the relevant analysis results. Use only the information needed for the appropriate reply.

      A description of the results of that analysis:
      ${result.description}

      If the result of the analysis is negative, then here is the actual percent workers fatigued (blank if task is acceptable):
      ${result.percentWorkersFatigued ? `${result.percentWorkersFatigued}% of female workers cannot perform the task` : "\n"}

      Additionally, here is a list of the metric contribution percentages for each task input:
      ${result.mcpValues.map((input) => `${input.name}: ${input.value}`).join("\n")}
      `;

      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "SUMMARY_PROMPT") {
      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      The user has just completed a metric analysis of their workplace task.

      Your job is to ask the user to provide a brief description of the task in their own words.
      This will help contextualize the solution suggestions that will follow.

      Please prompt the user to describe what the task involves — for example, what object is being moved, 
      where it is being moved to/from, and any other relevant context.

      Keep your message friendly and concise.
      `;

      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "SUMMARY_CAPTURE") {
      nextState = { ...nextState, taskDescription: message };

      const systemPrompt = `
      You are ergo, a helpful ergonomics AI assistant.

      The user has just provided a description of their task to you.

      Confirm that you have an accurate description of the task.

      Ask the user if they are ready to move on to solution development?

      Do not do anything besides 1. confirm the task description, and 
      2. ask the user if they want to begin solution development.

      Do not generate any solutions for the user.
      `;

      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "SOLVE") {
      const {
        handHeight,
        distance,
        frequency,
        initialForce,
        // sustainedForce,
        action,
      } = state.intake;

      const query = `
      Task description:
      ${state.taskDescription}

      Task inputs:
      Action -- ${action}
      Initial Force -- ${initialForce}
      Hand height -- ${handHeight}
      Distance moved -- ${distance}
      Frequency -- ${frequency}

      Metric contribution:
      ${result.mcpValues.map((input) => `${input.name}: ${input.value}`).join("\n")}
      `;

      const sources = await retrieve({
        query,
        topK: 15,
      });

      const context = sources
        .map((s, i) => {
          const title = s?.metadata?.title
            ? ` | title=${s.metadata.title}`
            : "";
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

      console.log(context);

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      You will be given a chat history and a message containing contextual information about the user's task and 
      some relevant solutions.

      Please write a list of 3 solutions that come straight from the context provided in the message 
      and cite your sources for each solution.
      `;
      const ragMessage = `
      TASK INFORMATION:
      ${query}
      
      SOLUTION DATA:
      ${context}
      `;

      assistantMessage = await chat(
        ragMessage,
        history,
        chatModel,
        systemPrompt,
      );
    }

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
