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

export function getScope() {
  const tenant = env.CHROMA_TENANT;
  const database = env.CHROMA_DATABASE;
  const collection = env.CHROMA_COLLECTION;

  if (!tenant) throw new Error("Missing env var: CHROMA_TENANT.");
  if (!database) throw new Error("Missing env var: CHROMA_DATABASE.");
  if (!collection) throw new Error("Missing env var: CHROMA_COLLECTION.");

  return { tenant, database, collection };
}

export async function chromaFetch(path, { method = "GET", body } = {}) {
  console.log("START chromaFetch");
  console.log("PARAMETERS INCLUDE:");
  console.log(`path -> ${path}`);
  console.log(`method -> ${method}, body:`);
  console.log(body);

  const url = buildUrl(path);

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log(res);
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

export async function getOrCreateCollectionId() {
  // upload the tenant, db, and collection name from env
  const { tenant, database, collection } = getScope();

  // if we've already found it then return what we already have cached
  const cacheKey = `${tenant}::${database}::${collection}`;
  const cached = collectionIdCache.get(cacheKey);
  if (cached) return cached;

  // build the base of the 'path'
  const basePath = `/tenants/${tenant}/databases/${database}/collections`;

  // run chromaFetch to list all collections
  const raw = await chromaFetch(basePath, { method: "GET" });

  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.collections)
        ? raw.collections
        : [];

  // search the list of collections to find one with the name we are looking for
  const existing = list.find((c) => c?.name === collection);

  // if we found it (as an already existing collection), return what we found
  if (existing?.id) {
    collectionIdCache.set(cacheKey, existing.id);
    return existing.id;
  }

  // assuming that the collection does not already exist:

  // create a new collection with that name
  // should return object with the collection's id
  const created = await chromaFetch(basePath, {
    method: "POST",
    body: { name: collection },
  });

  // store the created id in the cache -- return cache
  const id = created?.id ?? created?.collection?.id;
  if (!id) {
    throw new Error(
      `Chroma create collection did not return an id: ${JSON.stringify(created)}`,
    );
  }

  collectionIdCache.set(cacheKey, id);
  return id;
}

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
 * =========
 * Function used for listing the chunks in a collection
 * =========
 */

export async function listCollectionChunks({ limit = 25, offset = 0 } = {}) {
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
 * =========
 * Function used for deleting a given chunk from the collection
 * =========
 */

export async function deleteChunkById({ id }) {
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
