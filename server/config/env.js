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

  CHROMA_URL: must("CHROMA_URL"),
  CHROMA_API_PREFIX: must("CHROMA_API_PREFIX"),
  CHROMA_COLLECTION: process.env.CHROMA_COLLECTION || "test_docs",
  CHROMA_TENANT: must("CHROMA_TENANT"),
  CHROMA_DATABASE: must("CHROMA_DATABASE"),

  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  SERVER_PORT: process.env.SERVER_PORT || 3001,
};

export default env;
