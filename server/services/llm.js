// server > services > openai.js

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import env from "../config/env.js";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// Build my two models here: one for chat and one for embedding
export const chatModel = new ChatOpenAI({
  apiKey: env.OPENAI_API_KEY,
  model: env.CHAT_MODEL,
  temperature: 0.2,
});

export const embeddingsModel = new OpenAIEmbeddings({
  apiKey: env.OPENAI_API_KEY,
  model: env.EMBEDDING_MODEL,
});

// Embedding functions:

// 1. Used for embedding an array of strings
// Returns an array of vectors (each vector looks like 'number[]')
export async function embedDocuments(documents) {
  if (
    !Array.isArray(documents) ||
    documents.some((d) => typeof t != "string")
  ) {
    throw new Error(
      "embedDocuments(documents): documents must be an array of strings",
    );
  }
  // Returns: number[][]
  return embeddingsModel.embedDocuments(texts);
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
