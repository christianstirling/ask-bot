/**
 * 1. validate query request
 * 2. embed query
 * 3. run similarity search in chroma
 * 4. normalize results into sources list
 */

import { embedQuery } from "./llm.js";
import { queryCollection } from "./chroma.js";

/**
 * =====
 * Purpose: flattens the nested result arrays from Chroma into a list of sources.
 * =====
 */

function normalizeChromaResult(raw) {
  const ids = raw?.ids?.[0] ?? [];
  const documents = raw?.documents?.[0] ?? [];
  const metadatas = raw?.metadatas?.[0] ?? [];
  const distances = raw?.distances?.[0] ?? [];

  const n = Math.max(
    ids.length,
    documents.length,
    metadatas.length,
    distances.length,
  );

  return Array.from({ length: n }).map((_, i) => ({
    id: ids[i] ?? `result:${i}`,
    content: documents[i] ?? "",
    metadata: metadatas[i] ?? {},
    distance: distances[i],
  }));
}

/**
 * =====
 * Main RETRIEVE function: retrieve relevant chunks for a question
 * =====
 */

export async function retrieve({
  question,
  topK = 5,
  where,
  minSimilarity,
  includeEmbeddings = false, // Do we need to return the embeddings from the vdb? Probably no.
} = {}) {
  if (typeof question !== "string" || !question.trim()) {
    throw new Error("retrieve: question must be a non-empty string");
  }

  const vector = await embedQuery(question);

  const raw = await queryCollection({
    queryEmbeddings: [vector],
    topK,
    where,
    include: includeEmbeddings
      ? ["documents", "metadatas", "distances", "embeddings"]
      : ["documents", "metadatas", "distances"],
  });

  let sources = normalizeChromaResult(raw);

  if (Number.isFinite(minSimilarity)) {
    sources = sources.filter(
      (s) => typeof s.distance === "number" && s.distance <= minSimilarity,
    );
  }

  return sources;
}
