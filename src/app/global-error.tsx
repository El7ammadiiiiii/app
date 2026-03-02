"use client";

/**
 * Global Error Boundary — catches unhandled errors across the entire app.
 * Shows the actual error message and stack trace for debugging.
 * In Next.js 15+/16, this replaces the default "Application error" page.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0a0a0a",
          color: "#e0e0e0",
          padding: "40px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1 style={{ color: "#ff4444", marginBottom: "16px" }}>
          Application Error
        </h1>
        <p style={{ color: "#999", marginBottom: "24px" }}>
          An unhandled error occurred. Details below:
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
              fontSize: "14px",
            }}
          >
            {error.message}
          </pre>
        </div>

        {error.digest && (
          <p style={{ color: "#666", fontSize: "12px", marginBottom: "16px" }}>
            Digest: {error.digest}
          </p>
        )}

        {error.stack && (
          <details style={{ marginBottom: "24px" }}>
            <summary
              style={{ cursor: "pointer", color: "#888", marginBottom: "8px" }}
            >
              Stack Trace
            </summary>
            <pre
              style={{
                background: "#111",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "11px",
                color: "#aaa",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "400px",
                overflow: "auto",
              }}
            >
              {error.stack}
            </pre>
          </details>
        )}

        <button
          onClick={reset}
          style={{
            background: "#597ef7",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 24px",
            fontSize: "14px",
            cursor: "pointer",
            marginRight: "12px",
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          style={{
            background: "#333",
            color: "#ccc",
            border: "1px solid #555",
            borderRadius: "8px",
            padding: "10px 24px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Go Home
        </button>
      </body>
    </html>
  );
}
