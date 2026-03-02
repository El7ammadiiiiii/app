"use client";

/**
 * Error boundary for /chat/* routes.
 * Catches unhandled errors and shows the actual error details for debugging.
 */

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#0a0a0a",
        color: "#e0e0e0",
        padding: "40px",
        maxWidth: "700px",
        margin: "80px auto",
      }}
    >
      <h2 style={{ color: "#ff4444", marginBottom: "12px" }}>
        Page Error
      </h2>
      <p style={{ color: "#999", marginBottom: "20px", fontSize: "14px" }}>
        An error occurred while rendering this page.
      </p>

      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <strong style={{ color: "#ff6b6b" }}>Error:</strong>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "#ffcc00",
            margin: "8px 0",
            fontSize: "13px",
          }}
        >
          {error.message}
        </pre>
      </div>

      {error.digest && (
        <p style={{ color: "#666", fontSize: "11px", marginBottom: "12px" }}>
          Digest: {error.digest}
        </p>
      )}

      {error.stack && (
        <details style={{ marginBottom: "20px" }}>
          <summary style={{ cursor: "pointer", color: "#888", fontSize: "13px" }}>
            Stack Trace
          </summary>
          <pre
            style={{
              background: "#111",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "10px",
              color: "#aaa",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: "300px",
              overflow: "auto",
              marginTop: "8px",
            }}
          >
            {error.stack}
          </pre>
        </details>
      )}

      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={reset}
          style={{
            background: "#597ef7",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 20px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/chat")}
          style={{
            background: "#333",
            color: "#ccc",
            border: "1px solid #555",
            borderRadius: "8px",
            padding: "8px 20px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Back to Chat
        </button>
      </div>
    </div>
  );
}
