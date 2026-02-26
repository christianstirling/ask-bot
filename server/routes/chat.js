// server/routes/chat.js
import express from "express";
const router = express.Router();
import { chat } from "../services/chat.js";
import { chatModel } from "../services/llm.js";
import { determine_most_impactful_input } from "../services/compute.js";
import { retrieve } from "../services/retrieve.js";

// const TOP_K = 10;
let result;
let context;

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

  if (state.phase === "SOLVE") {
    return "SOLUTION_DETAILS";
  }

  return state.phase;
}

async function decideNextPhase(state, message, history) {
  const intakeStatus = state.intake
    ? getMissingIntakeFields(state.intake)
    : ["all fields missing"];

  const systemPrompt = `
    You are a routing agent for an ergonomics assistant app.
    Your ONLY job is to decide which phase the conversation should be in next.
    Respond with ONLY a single JSON object and nothing else.

    ## Phases and their purposes:
    - INTRO: User hasn't started a task analyis yet, or is asking general questions
    - INTAKE: Task form data has been submitted but required fields are missing: ${intakeStatus.join(",")}
    - CONFIRM_CALC: All intake fields are present, waiting for user to confirm they want analysis
    - EXECUTE_CALC: User has confirmed they want the calculation run - select this phase once the user has assented to performing the calculations
    - EXPLAIN_CALC: Calculation is done, user asked for more details about results - ONLY for when questions are asked about ANALYSIS RESULTS
    - ASK_DESCRIPTION: User wants to proceed to solutions - prompt them for a task description. Do NOT skip this step!
    - CONFIRM_SOLVE: User has provided their task description - need user to confirm that they would like to generate solutions. Do NOT go to this step if the user has not provided a task description!
    - SOLVE: User confirmed they're ready to generate solutions
    - EXPLAIN_SOLN: Solutions have been shown, user is asking follow-up questions - ONLY when questions are asked about SOLUTIONS

    ## Current state:
    - Current phase: ${state.phase ?? none}
    - Intake fields present: ${JSON.stringify(state.intake ?? {})}
    - Missing intake fields: ${JSON.stringify(intakeStatus)}
    - Task description capture: ${state.taskDescription ? "yes" : "no"}
    - Calculation run: ${state.calcRun ? "yes" : "no"}
    - Salutions shown: ${state.solutionsShown ? "yes" : "no"}

    ## Rules:
    1. Never skip phases - respect the flow
    2. INTAKE can only advance to CONFIRM_CALC if ALL intake fields are present
    3. Only move to CONFIRM_SOLVE if a task description has been captured
    4. If user seems confused or off-topic, stay in the current phase
    5. EXPLAIN_SOLN is a terminal loop - stay there unless a new task is started

    Respond with ONLY this JSON:
    { "phase": "PHASE_NAME", "reasoning": "one sentence explanation" }
    `;

  const response = await chat(message, history, chatModel, systemPrompt);

  try {
    const parsed = JSON.parse(response);
    console.log(
      `decideNextPhase: agent decision: ${parsed.phase} - ${parsed.reasoning}`,
    );
    return parsed.phase;
  } catch {
    console.warn(
      "decideNextPhase: agent returned invalid JSON, falling back to current phase",
    );
    return state.phase ?? "INTRO";
  }
}

router.post("/", async (req, res, next) => {
  try {
    const { message, history = [], state = {} } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message (string) is required" });
    }

    // console.log("USER: ", message);

    // console.log("Phase in: ", state.phase);

    // const phase = moveToNextPhase(state, message);

    const VALID_PHASES = [
      "INTRO",
      "INTAKE",
      "CONFIRM_CALC",
      "EXECUTE_CALC",
      "EXPLAIN_CALC",
      "ASK_DESCRIPTION",
      "CONFIRM_SOLVE",
      "SOLVE",
      "EXPLAIN_SOLN",
    ];

    const agentPhase = await decideNextPhase(state, message, history);
    const phase = VALID_PHASES.includes(agentPhase)
      ? agentPhase
      : (state.phase ?? "INTRO");

    // console.log("Phase out: ", phase);

    let assistantMessage;

    let nextState = { ...state, phase };

    if (phase === "INTRO") {
      console.log(`Router: executing phase "INTRO"`);

      const systemPrompt = `Assistant directions:
      
      You are Ergo, a helpful AI ergonomics assistant. 

      Your job is to greet the user and explain what types of functions you can perform for the user.

      ## An example of a message that you would send:
      "Hello! I'm Ergo, your AI ergonomics assistant. I'm here to help you analyze jobs and develop effective solutions. What can I help you with today?"

      ## If the user asks questions, give clear and concise answers to their specific questions.
      Do NOT try to perform any analysis or suggest any solutions.

      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "INTAKE") {
      console.log(`Router: executing phase "INTAKE"`);

      const systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 

      Your job is to receive workplace task inputs from a user.

      If you are missing any of the required intake variables, prompt the user to provide the missing values.

      ## Example response message:
      "To help evaluate your workplace task, please enter the following values in the Task Input form:
      1. Action
      2. Initial force to initiate movement
      3. Vertical height of the hands above the floor (in meters)
      4. Horizontal distance the object is moved (in meters)
      5. Frequency (how many times the task is performed per minute)
      Once you provide these inputs, I can analyze the task."

      ## If the user asks any questions about the input form or the requested values, please
       give clear and concise answers to their questions.
       Do NOT try to perform any analysis or suggest any solutions.
      
      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);

      nextState = {
        ...nextState,
        calcRun: false,
        solutionsShown: false,
        taskDescription: null, // worth resetting this too
      };
    }

    if (phase === "CONFIRM_CALC") {
      console.log(`Router: executing phase "CONFIRM_CALC"`);

      const systemPrompt = `You are Ergo, a helpful ergonomics AI assistant. 

      You have just received all of the necessary input variables to be able to perform an ergonomic analysis on 
      the user's workplace task. Please confirm that the user is ready to begin the analysis.

      ## Example message:
      "Thank you for providing the inputs for this push task. Before I begin the analysis, please confirm that the inputs are correct:
      1. Action: [value]
      2. Initial Force: [value] kg-force
      3. Hand Height: [value] meters
      4. Horizontal Distance Traveled: [value] meters
      5. Frequency: [value] per minute
      Shall I go start the analysis?"

      ## If a user asks any questions, you may give a clear and concise answer. Do NOT perform any analysis or suggest 
      any solutions to the user.
      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "EXECUTE_CALC") {
      console.log(`Router: executing phase "EXECUTE_CALC"`);

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
      console.log("Router: result --", result.description);

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant. 

      Your job is to do two things: a.) summarize the results of an analysis that was just run, 
      b.) as the user if they would like a more detailed breakdown of the analysis data.

      ## An example of a good response (If the task is deemed unacceptable):
      This task is unacceptable. To be acceptable, >= 75% of female workers must be able to perform the task without unacceptable fatigue. 
      This limit protects both male and female workers. Only 1% of female workers can currently perform this task without fatigue. 
      The most impactful task input is [Task Input name], responsible for [metric contribution percentage]% of the overall metric contribution.

      Would you be interested in a detailed breakdown of this analysis?

      ## An example of a good response (if the task is deemed acceptable):
      This task can be performed safely by ≥ 75% of female workers without unacceptable fatigue; therefore, this task is deemed acceptable. 

      No further action is needed.

      ## An example of a good response if the task is deemed unacceptable:
      "This task is unacceptable. An acceptable task is defined as one where ≥ 75% of female workers can perform the task without unacceptable fatigue. 
      This limit protects both male and female workers.

      Your task can only be performed by [inverse of the percent workers fatigued returned from the results]% of female workers. The most impactful 
      task input was [Task Input name], responsible for [Task Input metric contribution]% of the overall metric contribution.
      
      Would you like a detailed breakdown of this analysis?"

      ## Below is the full result of the metric analysis. Use information from this sparingly, 
      but whenever needed to generate the appropriate response.

      A description of the results of that analysis:
      ${result.description}

      If the result of the analysis is negative, then here is the actual percent workers fatigued (blank if task is acceptable):
      ${result.percentWorkersFatigued ? `${result.percentWorkersFatigued}% of female workers cannot perform the task` : "\n"}

      Additionally, here is a list of the metric contribution percentages for each task input:
      ${result.mcpValues.map((input) => `${input.name}: ${input.value}`).join("\n")}

      ## Do NOT improvise or provide any analysis of the task besides what is contained in the result of the metric analysis above.
      Do NOT try to suggest any solutions to the workplace task.

      `;
      assistantMessage = await chat(message, history, chatModel, systemPrompt);

      nextState = { ...nextState, phase, calcRun: true };
    }

    if (phase === "EXPLAIN_CALC") {
      console.log(`Router: executing phase "EXPLAIN_CALC"`);

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      Your job is to provide a detailed breakdown of the results of an analysis that was just run.
      Then, ask if the user would like to begin developing solutions for this task.

      ## An example of a good response:
      Here is a detailed breakdown of the metric contribution by task input:
      - [Task Input name 1]: [corresponding Task Input value 1]%
      - **do this for each name: value pair in descending order**

      As you can see, [Task Input name 1] was the most significant input, responsible for [value 1]% of the metric contribution. 
      [Task Input name 2] and [Task Input name 3] were next, at [value 2]% and [value 3]%, followed by [Task Input name 4] at [value 4]%.

      Would you like me to help develop solutions for this task?

      ---

      ## Below is the relevant analysis results. Use only the information needed for the appropriate reply.

      A description of the results of that analysis:
      ${result.description}

      If the result of the analysis is negative, then here is the actual percent workers fatigued (blank if task is acceptable):
      ${result.percentWorkersFatigued ? `${result.percentWorkersFatigued}% of female workers cannot perform the task` : "\n"}

      Additionally, here is a list of the metric contribution percentages for each task input:
      ${result.mcpValues.map((input) => `${input.name}: ${input.value}`).join("\n")}

      ## If the user asks any questions about the analysis results, please use the information above to answer them in a clear
       and concise manner.

      ## Do NOT provide any additional analysis outside of what is displayed in the current analysis results.
      Do NOT try to suggest any solutions to this task.
      `;

      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "ASK_DESCRIPTION") {
      console.log(`Router: executing phase "ASK_DESCRIPTION"`);

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      Your job is to ask the user for a written description of the task that they are trying to generate a 
      solution for.

      The user has already entered all of the other necessary information about the task.

      ## You should only prompt the user to provide the information.
      You should NOT give any feedback or analysis related to the task.
      You should NOT suggest any solutions for the task.

      ## Keep your response friendly and concise.
      `;

      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "CONFIRM_SOLVE") {
      console.log(`Router: executing phase "CONFIRM_SOLVE"`);

      nextState = { ...nextState, taskDescription: message };

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      Your job is to confirm that the user would like to begin having solutions generated.

      ## An example of a good response:
      "Thank you for providing a contextual description of your task.

      Now that I have a better understanding of your task, would you like to begin generating solutions?"

      ## Do NOT provide any feedback or analysis for this task.
      Do NOT generate any solutions for the user at this time.
      `;

      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    if (phase === "SOLVE") {
      console.log(`Router: executing phase "SOLVE"`);

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

      context = sources
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

      // console.log(context);

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      You will be given a chat history and a message containing contextual information about the user's task and 
      some relevant solutions.

      Your job is to write a list of 3 solutions that come straight from the context provided in the message 
      and cite your sources for each solution.

      ## An example of a good response:
      "Here is a list of potential solutions to your task:

      1. [Solution Name]
      [Solution description in 1-2 sentences - make sure to mention how this solution aligns with the task input variables]
      [Citation for the solution from within the solution database]

      2.

      3.

      These solutions were developed by matching task information with an extensive ergonomics solutions dataset. Let me know if you would 
      like more information about any of these solutions."
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

      nextState = { ...nextState, phase, solutionsShown: true };
    }

    if (phase === "EXPLAIN_SOLN") {
      console.log(`Router: executing phase "EXPLAIN_SOLN"`);

      const systemPrompt = `
      You are Ergo, a helpful ergonomics AI assistant.

      Your job is to answer questions about any of the targeted solutions that were recently generated.

      Here is the context data from the database where the solutions were found:
      ${context}

      In the latest user message, the user is going to ask a question about one or more of those solutions.

      Please answer the user's question and do nothing else.

      Keep your response concise and helpful.
      `;

      assistantMessage = await chat(message, history, chatModel, systemPrompt);
    }

    // console.log("AI: ", assistantMessage);

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
