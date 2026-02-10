// server/services/chunking.js

/**
 * This service is called for the purpose of 'chunking', or
 * converting a large text into a series of smaller pieces
 * of text (chunks) that are:
 *      a. sized appropriately for embedding
 *      b. sized appropriately for retrieval later.
 */

// ------------ PART 0: Imports and configuration. ------------

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const DEFAULT_CHUNK_SIZE = 200;
const DEFAULT_CHUNK_OVERLAP = 50;

// ------------ PART 1: Internal Functions. ------------

// ------------ PART 2: External Functions. ------------

/**
 * chunkText(string text, object chunk settings)
 */

export default async function chunkText(
  text,
  { chunkSize, chunkOverlap } = {},
) {
  console.log("START chunkText");
  console.log("PARAMETERS INCLUDE:");
  console.log(`text -> ${text}`);
  console.log(`chunkSize -> ${chunkSize} || ${DEFAULT_CHUNK_SIZE}`);
  console.log(`chunkOverlap -> ${chunkOverlap} || ${DEFAULT_CHUNK_OVERLAP}`);

  if (typeof text !== "string" || !text.trim()) return [];

  console.log("Splitting chunks using RecursiveCharacterTextSplitter...");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize ?? DEFAULT_CHUNK_SIZE,
    chunkOverlap: chunkOverlap ?? DEFAULT_CHUNK_OVERLAP,
  });

  const docs = await splitter.createDocuments([text]);

  console.log("FINISH chunkText: great success");
  return docs.map((d, idx) => ({
    index: idx,
    content: d.pageContent,
  }));
}
