// server > services > chroma.js

//**
// This is the Chroma HTTP client wrapper
//  */

import { env } from "../config/env.js";

// Define a helper function that makes HTTP requests to the Chroma server
async function chromaFetch(path, options = {}) {
  // Build the full url by combining the base url with the API path passed into the function.
  const url = `${env.CHROMA_URL}${path}`;

  // Here we perform the fetch request to the url
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...arguments(options.headers || {}),
    },
  });

  // Checks to see if the response status is in the VALID range..
  // If not, throw an error, including the response body as text to help debugging.
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Chroma error ${res.status} -- ${res.statusText} -- ${res.text}`,
    );
  }

  // Check the content type (JSON? plain text?) to determine how to parse the response.
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json(); // if JSON - return JSON
  return res.text(); // else - return plain text
}

// Convenience function for verifying if the Chroma service is still alive and running.
async function heartbeat() {
  // depending on the Chroma version, this end point may not be correct
  // might need to be /api/v2/..]
  return chromaFetch("/api/v1/heartbeat");
}

export default { heartbeat, chromaFetch };
