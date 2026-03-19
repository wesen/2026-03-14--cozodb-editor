import { buildQuerySuggestionMarkdownNote } from "../../../notebook/aiNoteMarkdown";
import type { SemEntity } from "../../../sem/semProjection";
import type { QuerySuggestionViewModel } from "../view-models/toQuerySuggestionViewModel";

interface Props {
  onAddToNotebook?: (markdown: string) => void;
  entity: SemEntity;
  onInsertCode?: (code: string) => void;
  viewModel: QuerySuggestionViewModel;
}

export function QuerySuggestionCard({ entity, onAddToNotebook, onInsertCode, viewModel }: Props) {
  const isErrored = entity?.status === "error";

  return (
    <div className="cozo-ai-card" style={{ borderLeftColor: isErrored ? "rgba(210, 90, 90, 0.75)" : "rgba(94, 180, 140, 0.35)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>
        QUERY SUGGESTION
      </div>

      {isErrored ? (
        <div style={{ color: "rgba(220, 120, 120, 0.95)", fontSize: 13 }}>
          Structured suggestion extraction failed.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{viewModel.label}</div>
          {viewModel.reason ? (
            <div style={{ marginBottom: 10, color: "var(--text-secondary)", lineHeight: 1.6 }}>{viewModel.reason}</div>
          ) : null}
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="mac-btn" onClick={() => onInsertCode?.(viewModel.code)}>
              Insert suggestion
            </button>
            <button
              className="mac-btn"
              onClick={() => onAddToNotebook?.(buildQuerySuggestionMarkdownNote({
                code: viewModel.code,
                label: viewModel.label,
                reason: viewModel.reason,
              }))}
            >
              Add to notebook
            </button>
          </div>
        </>
      )}
    </div>
  );
}
