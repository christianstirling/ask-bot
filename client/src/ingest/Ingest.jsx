import { useMemo, useState } from "react";
import "./Ingest.css";

export default function Ingest() {
  const API_BASE_URL = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",
    [],
  );

  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const trimmed = text.trim();
  const canSubmit = trimmed.length > 0 && !isSubmitting;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResponse(null);

    if (!trimmed) {
      setError("Text is required.");
      return;
    }

    // docId intentionally omitted so server generates it
    const payload = {
      text: trimmed,
      metadata: {
        source: "react_client",
        title: `Ingest ${new Date().toISOString()}`,
        charCount: trimmed.length,
        createdAt: new Date().toISOString(),
      },
    };

    setIsSubmitting(true);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          `Request failed with status ${resp.status}`;
        throw new Error(msg);
      }

      setResponse({ request: payload, response: data });
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const serverDocId = response?.response?.docId;
  const serverChunkCount = response?.response?.chunkCount;

  return (
    <div className="Ingest">
      <div className="ingest-form-container">
        <form onSubmit={handleSubmit} className="ingest-form">
          <label htmlFor="text" className="ingest-label">
            Ingest
          </label>

          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste raw text here... Any text that you enter here will be chunked, embedded, and then stored in the app's vector database"
            rows={16}
            spellCheck={false}
            className="ingest-textarea"
          />

          <div className="ingest-button-container">
            <div className="ingest-info">
              {/* <div>
                Endpoint: <code>{API_BASE_URL}/api/ingest</code>
              </div> */}
              <div>
                Characters: <code>{trimmed.length}</code>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="ingest-button"
            >
              {isSubmitting ? "submitting..." : "submit"}
            </button>
          </div>
        </form>

        {error && (
          <div>
            <strong>Error:</strong> {error}
          </div>
        )}

        {response && (
          <div>
            <div>
              <div>
                <strong>Success</strong>
                {typeof serverDocId === "string" && (
                  <div>
                    <span>docId</span>
                    <code>{serverDocId}</code>
                  </div>
                )}
                {typeof serverChunkCount === "number" && (
                  <div>
                    <span>chunkCount</span>
                    <code>{serverChunkCount}</code>
                  </div>
                )}
              </div>

              <button
                type="button"
                style={styles.copyButton}
                onClick={() =>
                  navigator.clipboard.writeText(
                    JSON.stringify(response, null, 2),
                  )
                }
              >
                Copy JSON
              </button>
            </div>

            <pre>{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// const styles = {
//   page: {
//     minHeight: "100vh",
//     background: "#0b0f14",
//     color: "#e8eef6",
//     fontFamily:
//       'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
//     padding: 24,
//   },
//   container: {
//     maxWidth: 900,
//     margin: "0 auto",
//     background: "#111826",
//     border: "1px solid #223047",
//     borderRadius: 16,
//     padding: 20,
//     boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
//   },
//   h1: { margin: 0, marginBottom: 16, fontSize: 22, fontWeight: 650 },
//   form: { display: "grid", gap: 10 },
//   label: { fontSize: 14, opacity: 0.9 },
//   textarea: {
//     width: "100%",
//     background: "#0b1220",
//     color: "#e8eef6",
//     border: "1px solid #223047",
//     borderRadius: 12,
//     padding: 12,
//     fontSize: 14,
//     lineHeight: 1.4,
//     resize: "vertical",
//     outline: "none",
//   },
//   row: {
//     display: "flex",
//     gap: 12,
//     alignItems: "center",
//     justifyContent: "space-between",
//     flexWrap: "wrap",
//   },
//   button: {
//     background: "#2d6cdf",
//     color: "white",
//     border: "none",
//     borderRadius: 12,
//     padding: "10px 14px",
//     fontSize: 14,
//     fontWeight: 600,
//     cursor: "pointer",
//     opacity: 1,
//   },
//   hint: { fontSize: 12, opacity: 0.8, display: "grid", gap: 4 },
//   errorBox: {
//     marginTop: 14,
//     padding: 12,
//     background: "#2a0f14",
//     border: "1px solid #6a1b24",
//     borderRadius: 12,
//     color: "#ffd7db",
//   },
//   resultBox: {
//     marginTop: 14,
//     padding: 12,
//     background: "#0b1220",
//     border: "1px solid #223047",
//     borderRadius: 12,
//   },
//   resultHeader: {
//     display: "flex",
//     alignItems: "flex-start",
//     justifyContent: "space-between",
//     gap: 12,
//     marginBottom: 10,
//   },
//   kv: { display: "flex", gap: 8, marginTop: 8, alignItems: "center" },
//   k: { opacity: 0.8, fontSize: 12, minWidth: 80 },
//   v: { fontSize: 12 },
//   copyButton: {
//     background: "transparent",
//     color: "#a9c3ff",
//     border: "1px solid #223047",
//     borderRadius: 10,
//     padding: "6px 10px",
//     cursor: "pointer",
//     fontSize: 12,
//     whiteSpace: "nowrap",
//   },
//   pre: {
//     margin: 0,
//     whiteSpace: "pre-wrap",
//     wordBreak: "break-word",
//     fontSize: 12,
//     lineHeight: 1.4,
//     color: "#d7e5ff",
//   },
// };
