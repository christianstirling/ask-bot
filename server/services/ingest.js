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
  console.log("STARTING ingestText");
  console.log("PARAMETERS INCLUDE:");
  console.log(`text -> ${text}`);
  console.log(`docID -> ${docId}`);
  console.log(`metadata -> ${metadata}`);

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("ingestText: text must be a non-empty string");
  }

  const finalDocId = docId || crypto.randomUUID();

  console.log("CALLING chunkText IN services/chunking FROM services/ingest");
  const chunks = await chunkText(text);
  console.log("RETURNED chunks FROM chunkText:");
  console.log(chunks);

  console.log("CALLING embedDocuments IN services/llm FROM services/ingest");
  const embeddings = await embedDocuments(chunks.map((c) => c.content));
  console.log("RETURNED embeddings FROM embedDocuments:");
  console.log(embeddings);

  const ids = chunks.map((c) => `${finalDocId}:${c.index}`);

  const metadatas = chunks.map((c) => ({
    docId: finalDocId,
    chunkIndex: c.index,
    ...metadata,
  }));

  console.log(
    "CALLING upsertToCollection IN services/chroma FROM services/ingest",
  );
  await upsertToCollection({
    ids,
    embeddings,
    documents: chunks.map((c) => c.content),
    metadatas,
  });

  console.log("FINISH ingestText: great success");
  return {
    docId: finalDocId,
    chunkCount: chunks.length,
  };
}
