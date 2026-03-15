import type { SemEntity } from "../../../sem/semProjection";
import type { DocRefViewModel } from "../view-models/toDocRefViewModel";

interface Props {
  entity: SemEntity;
  viewModel: DocRefViewModel;
}

export function DocRefCard({ entity, viewModel }: Props) {
  const isErrored = entity?.status === "error";

  return (
    <div className="cozo-ai-card" style={{ borderLeftColor: isErrored ? "rgba(210, 90, 90, 0.75)" : "rgba(80, 140, 210, 0.35)" }}>
      <div style={{ fontSize: 11, color: "rgba(80, 140, 210, 0.95)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 10 }}>
        DOC REF
      </div>

      {isErrored ? (
        <div style={{ color: "rgba(220, 120, 120, 0.95)", fontSize: 13 }}>
          Structured documentation extraction failed.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            {viewModel.title} {viewModel.section ? <span style={{ color: "var(--text-muted)" }}>{viewModel.section}</span> : null}
          </div>
          <div style={{ lineHeight: 1.6, color: "var(--text-secondary)" }}>{viewModel.body}</div>
          {viewModel.url ? (
            <div style={{ marginTop: 10 }}>
              <a href={viewModel.url} target="_blank" rel="noreferrer" style={{ color: "var(--doc-link)" }}>
                Open reference
              </a>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
