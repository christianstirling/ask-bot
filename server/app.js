// server/app.js

import express from "express";
const app = express();

import env from "./config/env.js";

import cors from "cors";
app.use(
  cors({
    origin: env.CLIENT_URL,
  }),
);

app.use(express.json());

import openaiRouter from "./routes/openai.js";
app.use("/api/chat", openaiRouter);

import ingestRouter from "./routes/ingest.js";
app.use("/api/ingest", ingestRouter);

import peekRouter from "./routes/peek.js";
app.use("/api/peek", peekRouter);

import queryRouter from "./routes/query.js";
app.use("/api/query", queryRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = env.SERVER_PORT;
app.listen(PORT, () => {
  console.log(`Client: ${env.CLIENT_URL}`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Chroma: ${env.CHROMA_URL}`);
});

/**
 * ===========
 * NOT IN USE - this was for testing the POST request to chroma/get API
 * ===========
 */

// import { chromaFetch, getScope } from "./services/chroma.js";
// const { tenant, database } = getScope();
// import dotenv from "dotenv";
// const path = `/tenants/${tenant}/databases/${database}/collections/${process.env.CHROMA_COLLECTION_ID}/get`;

// const res = await chromaFetch(path, {
//   method: "POST",
//   body: {
//     limit: 5,
//     offset: 0,
//     include: ["documents", "metadatas"],
//   },
// });

// console.log("RAW CHROMA GET RESPONSE:");
// console.log(JSON.stringify(res, null, 2));
