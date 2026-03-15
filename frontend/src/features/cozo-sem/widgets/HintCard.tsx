import type { SemEntity } from "../../../sem/semProjection";
import type { HintViewModel } from "../view-models/toHintViewModel";

interface Props {
  entity: SemEntity;
  onAskQuestion?: (question: string) => void;
  onInsertCode?: (code: string) => void;
  viewModel: HintViewModel;
}

export function HintCard({ entity, onAskQuestion, onInsertCode, viewModel }: Props) {
  const tone = entity?.status === "preview" ? "rgba(198, 176, 52, 0.2)" : "var(--accent-dim)";
  const isErrored = entity?.status === "error";

  return (
    <div className="cozo-ai-card" style={{ borderLeftColor: isErrored ? "rgba(210, 90, 90, 0.75)" : tone }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ color: "var(--accent)", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>
          {entity?.status === "preview" ? "SEM PREVIEW" : "SEM HINT"}
        </span>
        {viewModel.warning ? (
          <span style={{ fontSize: 11, color: "rgba(210, 180, 80, 0.9)" }}>{viewModel.warning}</span>
        ) : null}
      </div>

      {isErrored ? (
        <div style={{ color: "rgba(220, 120, 120, 0.95)", fontSize: 13 }}>
          Structured hint extraction failed.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: viewModel.code ? 12 : 0, lineHeight: 1.6 }}>{viewModel.text}</div>

          {viewModel.code ? (
            <div className="cozo-code-panel" style={{ padding: "10px 14px", marginBottom: 12 }}>
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
          ) : null}

          {viewModel.chips.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {viewModel.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => onAskQuestion?.(chip)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--border-chip)",
                    background: "var(--bg-chip)",
                    color: "var(--text-chip)",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}

          {viewModel.code ? (
            <div style={{ marginTop: 12 }}>
              <button className="mac-btn" onClick={() => onInsertCode?.(viewModel.code)}>
                Insert code
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
