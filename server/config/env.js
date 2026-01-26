import dotenv from "dotenv";
dotenv.config();

function must(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

const env = {
  OPENAI_API_KEY: must("OPENAI_API_KEY"),

  CHAT_MODEL: process.env.CHAT_MODEL || "gpt-4.1-mini",
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "text-embedding-3-small",

  CHROMA_URL: process.env.CHROMA_URL || "http://localhost:8000",
};

export default env;
