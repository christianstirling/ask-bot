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

// Sets server listening port
const PORT = env.SERVER_PORT;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
