import { useState } from "react";
import { DocPreviewChip } from "./DocPreviewChip";
import { toHintCardViewModel } from "./hintViewModel";

function formatHintText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={idx} style={{ color: "var(--accent)", fontWeight: 600 }}>{part.slice(2, -2)}</span>;
    }

    return part;
  });
}

export function HintResponseCard({ collapsed, onChipClick, onInsert, onToggleCollapse, response }) {
  const [openDocs, setOpenDocs] = useState({});
  const [copied, setCopied] = useState(false);
  const viewModel = toHintCardViewModel(response);

  const toggleDoc = (docIdx) => setOpenDocs((prev) => ({ ...prev, [docIdx]: !prev[docIdx] }));

  const handleCopy = () => {
    if (!viewModel.code) return;

    navigator.clipboard.writeText(viewModel.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        style={{
          margin: "2px 0 2px 28px",
          padding: "4px 12px",
          background: "var(--bg-ai-collapsed)",
          borderRadius: 4,
          fontSize: 12,
          color: "var(--text-muted)",
          cursor: "pointer",
          borderLeft: "2px solid var(--accent-dim)",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(event) => { event.currentTarget.style.borderLeftColor = "var(--accent)"; }}
        onMouseLeave={(event) => { event.currentTarget.style.borderLeftColor = "var(--accent-dim)"; }}
      >
        ✦ <span style={{ opacity: 0.6 }}>AI response</span> — <span style={{ opacity: 0.8 }}>{viewModel.previewText}…</span> <span style={{ float: "right", opacity: 0.4 }}>click to expand</span>
      </div>
    );
  }

  return (
    <div style={{
      margin: "4px 0 4px 28px",
      padding: "14px 16px 12px",
      background: "var(--bg-ai)",
      borderLeft: "2px solid var(--accent)",
      borderRadius: "0 8px 8px 0",
      fontSize: 13,
      lineHeight: 1.7,
      color: "var(--text-primary)",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 8, right: 10 }}>
        <button
          onClick={onToggleCollapse}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 11,
            padding: "2px 6px",
            borderRadius: 3,
            fontFamily: "inherit",
          }}
          onMouseEnter={(event) => { event.target.style.color = "var(--text-primary)"; }}
          onMouseLeave={(event) => { event.target.style.color = "var(--text-muted)"; }}
        >
          collapse
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontSize: 11, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}>
        <span style={{ fontSize: 14 }}>✦</span> AI ASSISTANT
      </div>

      <div style={{ marginBottom: 12 }}>
        {formatHintText(viewModel.text)}
      </div>

      {viewModel.code && (
        <div style={{
          background: "var(--bg-code)",
          borderRadius: 6,
          padding: "10px 14px",
          marginBottom: 12,
          position: "relative",
          border: "1px solid var(--border-code)",
        }}>
          <button
            onClick={handleCopy}
            style={{
              position: "absolute", top: 8, right: 8,
              background: "none", border: "1px solid var(--border-subtle)", borderRadius: 4,
              color: copied ? "var(--accent)" : "var(--text-muted)", fontSize: 11, padding: "2px 8px",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {copied ? "copied" : "copy"}
          </button>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12.5,
            lineHeight: 1.6,
            color: "var(--text-code)",
            whiteSpace: "pre-wrap",
          }}>
            {viewModel.code}
          </div>
        </div>
      )}

      {viewModel.docs.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {viewModel.docs.map((doc, idx) => (
            <DocPreviewChip
              key={idx}
              doc={doc}
              isOpen={!!openDocs[idx]}
              onToggle={() => toggleDoc(idx)}
            />
          ))}
        </div>
      )}

      {viewModel.chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {viewModel.chips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => onChipClick(chip)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid var(--border-chip)",
                background: "var(--bg-chip)",
                color: "var(--text-chip)",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(event) => { event.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(event) => { event.currentTarget.style.transform = "translateY(0)"; }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {viewModel.code && (
        <div style={{ marginTop: 12 }}>
          <button onClick={() => onInsert(viewModel.code)} style={{
            padding: "5px 12px",
            fontSize: 12,
            fontFamily: "'IBM Plex Mono', monospace",
            background: "var(--accent)",
            color: "var(--bg-main)",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}>
            Insert code ↵
          </button>
        </div>
      )}
    </div>
  );
}
