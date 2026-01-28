// Express set up
import express from "express";
const app = express();

import env from "./config/env.js";
// Set up cors
import cors from "cors";
app.use(
  cors({
    origin: env.CLIENT_URL,
  }),
);

// Other express set up stuff
app.use(express.json());

// Attach the router to the /api/chat route
import openaiRouter from "./routes/openai.js";
app.use("/api/chat", openaiRouter);

import ingestRouter from "./routes/ingest.js";
app.use("/api/ingest", ingestRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

// Sets server listening port
const PORT = env.SERVER_PORT;
app.listen(PORT, () => {
  console.log(`Client: ${env.CLIENT_URL}`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Chroma: ${env.CHROMA_URL}`);
});
