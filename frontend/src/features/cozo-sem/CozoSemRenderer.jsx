import {
  ENTITY_KIND_COZO_DOC_REF,
  ENTITY_KIND_COZO_HINT,
  ENTITY_KIND_COZO_QUERY_SUGGESTION,
} from "../../sem/semProjection";
import { DocRefCard } from "./widgets/DocRefCard";
import { HintCard } from "./widgets/HintCard";
import { QuerySuggestionCard } from "./widgets/QuerySuggestionCard";
import { toDocRefViewModel } from "./view-models/toDocRefViewModel";
import { toHintViewModel } from "./view-models/toHintViewModel";
import { toQuerySuggestionViewModel } from "./view-models/toQuerySuggestionViewModel";

function renderEntity(entity, onAskQuestion, onInsertCode) {
  if (!entity) {
    return null;
  }

  switch (entity.kind) {
    case ENTITY_KIND_COZO_HINT:
      return (
        <HintCard
          entity={entity}
          onAskQuestion={onAskQuestion}
          onInsertCode={onInsertCode}
          viewModel={toHintViewModel(entity)}
        />
      );
    case ENTITY_KIND_COZO_QUERY_SUGGESTION:
      return (
        <QuerySuggestionCard
          entity={entity}
          onInsertCode={onInsertCode}
          viewModel={toQuerySuggestionViewModel(entity)}
        />
      );
    case ENTITY_KIND_COZO_DOC_REF:
      return <DocRefCard entity={entity} viewModel={toDocRefViewModel(entity)} />;
    default:
      return null;
  }
}

function summarizeThread(thread) {
  if (thread?.hint?.data?.text) {
    return thread.hint.data.text;
  }

  if (thread?.children?.[0]?.data?.label) {
    return thread.children[0].data.label;
  }

  if (thread?.children?.[0]?.data?.title) {
    return thread.children[0].data.title;
  }

  return "Structured inference result";
}

export function CozoSemRenderer({
  onAskQuestion,
  onDismiss,
  onInsertCode,
  onToggleCollapse,
  thread,
  collapsed = false,
}) {
  if (!thread || (!thread.hint && thread.children.length === 0)) {
    return null;
  }

  const hasHint = Boolean(thread.hint);
  const hasChildren = thread.children.length > 0;
  const itemLabel = hasHint ? "SEM THREAD" : "SEM ITEM";
  const itemCount = Number(hasHint) + thread.children.length;
  const lineLabel = Number.isInteger(thread.anchorLine) ? `Line ${thread.anchorLine + 1}` : "Global";
  const summary = summarizeThread(thread);

  return (
    <section
      className="cozo-ai-card"
      style={{
        borderLeftColor: hasHint ? "var(--accent-dim)" : "rgba(94, 180, 140, 0.2)",
        paddingTop: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: collapsed ? 0 : 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--accent)" }}>
              {itemLabel}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {lineLabel} · {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {collapsed ? summary : hasHint ? "Hint with structured follow-up items." : "Structured follow-up item."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {(hasHint || hasChildren) ? (
            <button
              onClick={onToggleCollapse}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                borderRadius: 999,
                border: "1px solid var(--border-chip)",
                background: "var(--bg-chip)",
                color: "var(--text-chip)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {collapsed ? "Expand" : "Fold"}
            </button>
          ) : null}

          <button
            onClick={onDismiss}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              borderRadius: 999,
              border: "1px solid rgba(210, 90, 90, 0.3)",
              background: "rgba(210, 90, 90, 0.08)",
              color: "rgba(220, 150, 150, 0.95)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <div style={{ display: "grid", gap: 12 }}>
          {thread.hint ? renderEntity(thread.hint, onAskQuestion, onInsertCode) : null}

          {hasChildren ? (
            <div style={{ display: "grid", gap: 12 }}>
              {thread.children.map((entity) => (
                <div key={entity.id} style={{ marginLeft: thread.hint ? 16 : 0 }}>
                  {renderEntity(entity, onAskQuestion, onInsertCode)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
