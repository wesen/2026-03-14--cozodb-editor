import type { HintCardDoc } from "./hintViewModel";

interface Props {
  doc: HintCardDoc;
  isOpen: boolean;
  onToggle: () => void;
}

export function DocPreviewChip({ doc, isOpen, onToggle }: Props) {
  return (
    <span style={{ display: "inline-block", marginRight: 8, marginBottom: 4 }}>
      <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "1px solid var(--border-subtle)",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 12,
          color: "var(--doc-link)",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s ease",
          ...(isOpen ? { background: "var(--doc-link)", color: "var(--bg-main)", borderColor: "var(--doc-link)" } : {}),
        }}
        onMouseEnter={(event) => { if (!isOpen) (event.target as HTMLElement).style.borderColor = "var(--doc-link)"; }}
        onMouseLeave={(event) => { if (!isOpen) (event.target as HTMLElement).style.borderColor = "var(--border-subtle)"; }}
      >
        {isOpen ? "▾" : "▸"} {doc.title}
      </button>
      {isOpen && (
        <div style={{
          marginTop: 6,
          padding: "10px 14px",
          background: "var(--bg-doc)",
          border: "1px solid var(--border-doc)",
          borderRadius: 6,
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          maxWidth: 440,
        }}>
          <div style={{ fontSize: 11, color: "var(--doc-link)", marginBottom: 6, fontWeight: 600, letterSpacing: "0.03em" }}>
            {doc.title.toUpperCase()}{doc.section ? ` — ${doc.section}` : ""}
          </div>
          {doc.body}
        </div>
      )}
    </span>
  );
}
