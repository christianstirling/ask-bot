// server/services/ingest.js

/**
 * The purpose of this service is to export a single function which performs
 * the entire ingest pipeline.
 *
 * Text -> chunks -> embeddings -> upsert into Chroma.
 */

// ------------ Imports and Configuration ------------

import crypto from "crypto";
import env from "../config/env.js";
import chunkText from "./chunking.js";
import { embedDocuments } from "./llm.js";
import { upsertToCollection } from "./chroma.js";

// ------------ External Function ------------

export default async function ingestText({ text, docId, metadata = {} }) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("ingestText: text must be a non-empty string");
  }

  const finalDocId = docId || crypto.randomUUID();

  const chunks = await chunkText(text);

  const embeddings = await embedDocuments(chunks.map((c) => c.content));

  const ids = chunks.map((c) => `${finalDocId}:${c.index}`);

  const metadatas = chunks.map((c) => ({
    docId: finalDocId,
    chunkIndex: c.index,
    ...metadata,
  }));

  await upsertToCollection({
    ids,
    embeddings,
    documents: chunks.map((c) => c.content),
    metadatas,
  });

  return {
    docId: finalDocId,
    chunkCount: chunks.length,
  };
}
