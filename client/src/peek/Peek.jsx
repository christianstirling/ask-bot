import React, { useEffect, useMemo, useState } from "react";

/**
 * ChromaChunkList
 * - Fetches chunked documents from your server and lists them.
 * - Pagination via limit + offset.
 * - Adds delete support.
 */
export default function ChromaChunkList() {
  const API_BASE_URL = useMemo(
    () => import.meta?.env?.VITE_API_BASE_URL || "http://localhost:3001",
    [],
  );

  // [STATE] Data returned from the server: [{ id, document, metadata }, ...]
  const [items, setItems] = useState([]);

  // [STATE] Pagination controls
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  // [STATE] Request status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // [STATE] Delete status
  const [deletingId, setDeletingId] = useState(null);

  async function loadPage(nextOffset, nextLimit = limit) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/peek?limit=${nextLimit}&offset=${nextOffset}`,
      );

      if (!res.ok) {
        throw new Error(`Request failed: HTTP ${res.status}`);
      }

      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setOffset(nextOffset);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteChunk(id) {
    const ok = window.confirm("Delete this chunk? This cannot be undone.");
    if (!ok) return;

    setDeletingId(id);
    setError("");

    try {
      // Adjust this route if your server differs:
      const res = await fetch(
        `${API_BASE_URL}/api/peek/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          (data && (data.error || data.message)) ||
          `Delete failed: HTTP ${res.status}`;
        throw new Error(msg);
      }

      // If we deleted the last item on this page, step back a page if possible.
      const remainingAfterDelete = items.length - 1;
      const nextOffset =
        remainingAfterDelete <= 0 && offset > 0
          ? Math.max(offset - limit, 0)
          : offset;

      await loadPage(nextOffset);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadPage(0, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function prev() {
    const nextOffset = Math.max(offset - limit, 0);
    loadPage(nextOffset);
  }

  function next() {
    const nextOffset = offset + limit;
    loadPage(nextOffset);
  }

  function onChangeLimit(e) {
    const newLimit = Number(e.target.value);
    setLimit(newLimit);
    setOffset(0);
    loadPage(0, newLimit);
  }

  return (
    <div className="Peek">
      <div style={s.headerRow}>
        <div>
          <h3 style={s.h3}>Chroma chunks</h3>
          <div style={s.subtle}>
            Endpoint: <code>{API_BASE_URL}/api/peek</code>
          </div>
        </div>

        <div style={s.controls}>
          <label style={s.label}>
            page size{" "}
            <select value={limit} onChange={onChangeLimit} style={s.select}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>

          <button
            onClick={() => loadPage(offset)}
            disabled={loading}
            style={s.ghostBtn}
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && <div style={s.status}>loading…</div>}
      {error && (
        <div style={s.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={s.pager}>
        <button onClick={prev} disabled={loading || offset === 0} style={s.btn}>
          Prev
        </button>
        <button
          onClick={next}
          disabled={loading || items.length < limit}
          style={s.btn}
        >
          Next
        </button>
        <span style={s.subtle}>
          offset: <code>{offset}</code> · showing: <code>{items.length}</code>
        </span>
      </div>

      <div style={s.list}>
        {items.map((it) => (
          <div key={it.id} style={s.card}>
            {/* Only show chunk text until expanded */}
            <details style={s.details}>
              <summary style={s.summary}>
                <span style={s.previewText} title={it.document}>
                  {it.document}
                </span>
              </summary>

              <div style={s.expanded}>
                <div style={s.metaRow}>
                  <div style={s.metaBlock}>
                    <div style={s.metaLabel}>Chunk ID</div>
                    <code style={s.mono}>{it.id}</code>
                  </div>

                  <button
                    onClick={() => deleteChunk(it.id)}
                    disabled={loading || deletingId === it.id}
                    style={s.dangerBtn}
                    title="Delete this chunk"
                  >
                    {deletingId === it.id ? "Deleting…" : "Delete"}
                  </button>
                </div>

                <div style={s.metaBlock}>
                  <div style={s.metaLabel}>Full text</div>
                  <div style={s.fullText}>{it.document}</div>
                </div>

                <div style={s.metaBlock}>
                  <div style={s.metaLabel}>Metadata</div>
                  <pre style={s.pre}>
                    {JSON.stringify(it.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </details>
          </div>
        ))}

        {!loading && items.length === 0 && (
          <div style={s.empty}>No chunks returned for this page.</div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    maxWidth: 980,
    margin: "0 auto",
    padding: 16,
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  h3: { margin: 0, fontSize: 18, fontWeight: 650 },
  controls: { display: "flex", alignItems: "center", gap: 10 },
  label: { fontSize: 13 },
  select: { marginLeft: 6, padding: "6px 8px" },
  pager: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "10px 0 14px",
    flexWrap: "wrap",
  },
  btn: { padding: "8px 10px", cursor: "pointer" },
  ghostBtn: { padding: "8px 10px", cursor: "pointer" },
  status: { fontSize: 13, opacity: 0.8, marginTop: 8 },
  subtle: { fontSize: 12, opacity: 0.75 },
  errorBox: {
    marginTop: 10,
    padding: 10,
    border: "1px solid #d33",
    background: "#ffecec",
    color: "#520000",
    borderRadius: 10,
  },
  list: { display: "grid", gap: 10 },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 10,
    background: "#272727ff",
  },
  details: { width: "100%" },
  summary: {
    cursor: "pointer",
    listStyle: "none",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 2px",
  },
  previewText: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    width: "100%",
    fontSize: 14,
    lineHeight: 1.35,
  },
  expanded: {
    marginTop: 10,
    borderTop: "1px solid #f0f0f0",
    paddingTop: 10,
    display: "grid",
    gap: 10,
  },
  metaRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  metaBlock: { display: "grid", gap: 6 },
  metaLabel: { fontSize: 12, opacity: 0.7 },
  mono: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 12,
  },
  fullText: {
    fontSize: 13,
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  pre: {
    margin: 0,
    padding: 10,
    background: "#272727ff",
    borderRadius: 10,
    overflowX: "auto",
    fontSize: 12,
  },
  dangerBtn: {
    padding: "8px 10px",
    cursor: "pointer",
    border: "1px solid #c33",
    background: "#ffecec",
    color: "#520000",
    borderRadius: 10,
    height: "fit-content",
  },
  empty: {
    padding: 14,
    border: "1px dashed #cbd5e1",
    borderRadius: 12,
    fontSize: 13,
    opacity: 0.8,
  },
};
