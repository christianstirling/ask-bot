// server > services > openai.js

// IMPORTS AND CONFIGURATION:

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import env from "../config/env.js";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// MODELS
/**
 * Notes: I built two models here: one for chatting, one for embedding.
 *    Each model is accessible by other services or routes for use in
 *    any of the app's pipelines.
 */

export const chatModel = new ChatOpenAI({
  apiKey: env.OPENAI_API_KEY,
  model: env.CHAT_MODEL,
  temperature: 0.2,
});

export const embeddingsModel = new OpenAIEmbeddings({
  apiKey: env.OPENAI_API_KEY,
  model: env.EMBEDDING_MODEL,
});

// EMBEDDING FUNCTIONS:

// 1. Used for embedding an array of strings
// Returns an array of vectors (each vector looks like 'number[]')

export async function embedDocuments(documents) {
  console.log("START embedDocuments");
  console.log("PARAMETERS INCLUDE:");
  console.log(`documents -> ${documents}`);
  if (
    !Array.isArray(documents) ||
    documents.some((d) => typeof d !== "string")
  ) {
    throw new Error(
      "embedDocuments(documents): documents must be an array of strings",
    );
  }

  console.log("FINISH embedDocuments: great success");
  // Returns: number[][]
  return embeddingsModel.embedDocuments(documents);
}

// 2. Used for embedding a single string from a query
// Returns a single vector (single vector looks like 'number[]')

export async function embedQuery(query) {
  if (typeof query !== "string") {
    throw new Error("embedQuery(query): query must be a string");
  }
  // Returns: number[]
  return embeddingsModel.embedQuery(query);
}
