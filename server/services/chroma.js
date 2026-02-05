// server > services > chroma.js

// ------------ PART 0: Imports and set up ------------

import env from "../config/env.js";
const API_PREFIX = env.CHROMA_API_PREFIX || "/api/v2";

let collectionIdCache = new Map();

// ------------ PART 1: Internal functions ------------

function buildUrl(path) {
  const base = env.CHROMA_URL;
  const prefix = API_PREFIX;
  return `${base}${prefix}${path}`;
}

function getScope() {
  const tenant = env.CHROMA_TENANT;
  const database = env.CHROMA_DATABASE;
  const collection = env.CHROMA_COLLECTION;

  if (!tenant) throw new Error("Missing env var: CHROMA_TENANT.");
  if (!database) throw new Error("Missing env var: CHROMA_DATABASE.");
  if (!collection) throw new Error("Missing env var: CHROMA_COLLECTION.");

  return { tenant, database, collection };
}

/**
 * =====
 * Helper function - called by main functions to 'fetch'
 * responses from the given Chroma db path
 * =====
 */

async function chromaFetch(path, { method = "GET", body } = {}) {
  const url = buildUrl(path);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Chroma ${method} ${url} -> ${res.status}, ${res.statusText}: ${text}`,
    );
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  return res.text();
}

// ------------ PART 2: External Functions. ------------

export async function heartbeat() {
  return chromaFetch("/heartbeat", { method: "GET" });
}

/**
 * =====
 * Finds the collection id at the collection referenced in
 * the .env file
 * =====
 */

export async function getOrCreateCollectionId() {
  const { tenant, database, collection } = getScope();

  const cacheKey = `${tenant}::${database}::${collection}`;
  const cached = collectionIdCache.get(cacheKey);
  if (cached) return cached;

  const basePath = `/tenants/${tenant}/databases/${database}/collections`;

  const raw = await chromaFetch(basePath, { method: "GET" });

  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.collections)
        ? raw.collections
        : [];

  const existing = list.find((c) => c?.name === collection);

  if (existing?.id) {
    collectionIdCache.set(cacheKey, existing.id);
    return existing.id;
  }

  const created = await chromaFetch(basePath, {
    method: "POST",
    body: { name: collection },
  });

  const id = created?.id ?? created?.collection?.id;
  if (!id) {
    throw new Error(
      `Chroma create collection did not return an id: ${JSON.stringify(created)}`,
    );
  }

  collectionIdCache.set(cacheKey, id);
  return id;
}

/**
 * =====
 * Function used to upsert an array of chunks into the chroma
 * database
 * =====
 */

export async function upsertToCollection({
  ids,
  embeddings,
  documents,
  metadatas,
  collectionId,
} = {}) {
  const { tenant, database } = getScope();

  const collection_id = await getOrCreateCollectionId();

  if (!Array.isArray(ids) || ids.length === 0)
    throw new Error("upsertToCollection: ids required");
  if (!Array.isArray(embeddings) || embeddings.length !== ids.length)
    throw new Error("upsertToCollection: embeddings must match ids length");
  if (!Array.isArray(documents) || documents.length !== ids.length)
    throw new Error("upsertToCollection: documents must match ids length");
  if (
    metadatas &&
    (!Array.isArray(metadatas) || metadatas.length !== ids.length)
  )
    throw new Error(
      "upsertToCollection: metadatas must match ids length IF PROVIDED",
    );

  const path = `/tenants/${tenant}/databases/${database}/collections/${collection_id}/upsert`;

  return chromaFetch(path, {
    method: "POST",
    body: { ids, embeddings, documents, metadatas },
  });
}

/**
 * =====
 * Function used for listing the chunks in a collection
 * =====
 */

export async function listChunks({ limit = 25, offset = 0 } = {}) {
  const collectionId = await getOrCreateCollectionId();
  const { tenant, database } = getScope();

  const path = `/tenants/${tenant}/databases/${database}/collections/${collectionId}/get`;

  const res = await chromaFetch(path, {
    method: "POST",
    body: {
      limit,
      offset,
      include: ["documents", "metadatas"],
    },
  });

  const ids = res?.ids ?? [];
  const documents = res?.documents ?? [];
  const metadatas = res?.metadatas ?? [];

  const items = ids.map((id, i) => ({
    id,
    document: documents[i] ?? "",
    metadata: metadatas[i] ?? "",
  }));

  return { items, limit, offset };
}

/**
 * =====
 * Function used for deleting a given chunk from the collection
 * =====
 */

export async function deleteChunk({ id }) {
  if (!id || typeof id !== "string") {
    throw new Error("deleteChunkById: id (string) is required");
  }

  const collectionId = await getOrCreateCollectionId();
  const { tenant, database } = getScope();
  const path = `/tenants/${tenant}/databases/${database}/collections/${collectionId}/delete`;

  await chromaFetch(path, {
    method: "POST",
    body: { ids: [id] },
  });

  return { id };
}
