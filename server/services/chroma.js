// server > services > chroma.js

// ------------ PART 0: Imports and set up ------------

import env from "../config/env.js";
const API_PREFIX = env.CHROMA_API_PREFIX || "/api/v2";
let cachedCollectionId = null;

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

async function chromaFetch(path, { method = "GET", body } = {}) {
  console.log("START chromaFetch");
  console.log("PARAMETERS INCLUDE:");
  console.log(`path -> ${path}`);
  console.log(`method info -> method: ${method}, body: ${body}`);

  console.log(
    "CALLING buildUrl IN services/chroma FROM chromaFetch IN services/chroma",
  );
  const url = buildUrl(path);
  console.log("RETURN url FROM. buildUrl");

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

export async function getOrCreateCollectionId() {
  console.log("START getOrCreateCollectionId");
  console.log("WILL EITHER FIND COLLECTION ID OR MAKE ONE");
  // if we've already found it then return what we already have cached
  if (cachedCollectionId) return cachedCollectionId;

  // upload the tenant, db, and collection name from env
  const { tenant, database, collection } = getScope();

  // build the base of the 'path'
  const basePath = `/tenants/${tenant}/databases/${database}/collections`;

  // run chromaFetch to list all collections
  const collections = await chromaFetch(basePath, { method: "GET" });

  // search the list of collections to find one with the name we are looking for
  const existing = Array.isArray(collections)
    ? collections.find((c) => c?.name === collectionName)
    : null;

  // if we found it (as an already existing collection), return what we found
  if (existing?.id) {
    cachedCollectionId = existing.id;
    return cachedCollectionId;
  }

  // assuming that the collection does not already exist:

  // create a new collection with that name
  // should return object with the collection's id
  const created = await chromaFetch(basePath, {
    method: "POST",
    body: { name: collection },
  });

  // store the created id in the cache -- return cache
  cachedCollectionId = created.id;
  return cachedCollectionId;
}

export async function upsertToCollection({
  ids,
  embeddings,
  documents,
  metadatas,
  collectionId,
} = {}) {
  console.log("START upsertToCollection");
  console.log("PARAMETERS INCLUDED:");
  console.log(`ids -> ${ids}`);
  console.log(`embeddings, documents, metadata`);

  console.log("PULLING tenant, database names FROM env");
  const { tenant, database } = getScope();

  console.log(
    "CALLING getOrCreateCollectionId IN services/chroma FROM upsertToCollection IN services/chroma",
  );

  const collection_id = await getOrCreateCollectionId();
  console.log("RETURN collection_id:");
  console.log(collection_id);

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
      "upsertToColletion: metadatas must match ids length IF PROVIDED",
    );

  console.log("BUILD path USING tenant, database, collection_id");
  const path = `/tenants/${tenant}/databases/${database}/collections/${collection_id}/upsert`;

  console.log(
    "CALLING chromaFetch IN services/chroma FROM upsertToCollection IN services/chroma",
  );
  console.log("WILL FINISH upsertToCollection WHEN chromaFetch RETURNS");
  return chromaFetch(path, {
    method: "POST",
    body: { ids, embeddings, documents, metadatas },
  });
}
