import type { ReactNode } from "react";
import { PillButton, SectionLabel } from "../../components/primitives";
import {
  ENTITY_KIND_COZO_DOC_REF,
  ENTITY_KIND_COZO_HINT,
  ENTITY_KIND_COZO_QUERY_SUGGESTION,
} from "../../sem/semProjection";
import type { SemEntity, SemThread } from "../../sem/semProjection";
import { DocRefCard } from "./widgets/DocRefCard";
import { HintCard } from "./widgets/HintCard";
import { QuerySuggestionCard } from "./widgets/QuerySuggestionCard";
import { toDocRefViewModel } from "./view-models/toDocRefViewModel";
import { toHintViewModel } from "./view-models/toHintViewModel";
import { toQuerySuggestionViewModel } from "./view-models/toQuerySuggestionViewModel";

function renderEntity(
  entity: SemEntity,
  onAskQuestion?: (q: string) => void,
  onInsertCode?: (code: string) => void,
  onAddToNotebook?: (markdown: string) => void,
): ReactNode {
  if (!entity) {
    return null;
  }

  switch (entity.kind) {
    case ENTITY_KIND_COZO_HINT:
      return (
        <HintCard
          entity={entity}
          onAddToNotebook={onAddToNotebook}
          onAskQuestion={onAskQuestion}
          onInsertCode={onInsertCode}
          viewModel={toHintViewModel(entity)}
        />
      );
    case ENTITY_KIND_COZO_QUERY_SUGGESTION:
      return (
        <QuerySuggestionCard
          entity={entity}
          onAddToNotebook={onAddToNotebook}
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

function summarizeThread(thread: SemThread): string {
  if (thread?.hint?.data?.text) {
    return thread.hint.data.text as string;
  }

  if (thread?.children?.[0]?.data?.label) {
    return thread.children[0].data.label as string;
  }

  if (thread?.children?.[0]?.data?.title) {
    return thread.children[0].data.title as string;
  }

  return "Structured inference result";
}

interface Props {
  onAddToNotebook?: (markdown: string) => void;
  collapsed?: boolean;
  onAskQuestion?: (question: string) => void;
  onDismiss: () => void;
  onInsertCode?: (code: string) => void;
  onToggleCollapse: () => void;
  thread: SemThread;
}

export function CozoSemRenderer({
  onAddToNotebook,
  onAskQuestion,
  onDismiss,
  onInsertCode,
  onToggleCollapse,
  thread,
  collapsed = false,
}: Props) {
  if (!thread || (!thread.hint && thread.children.length === 0)) {
    return null;
  }

  const hasHint = Boolean(thread.hint);
  const hasChildren = thread.children.length > 0;
  const itemLabel = hasHint ? "SEM THREAD" : "SEM ITEM";
  const itemCount = Number(hasHint) + thread.children.length;
  const locationLabel = thread.ownerCellId
    ? "Attached to cell"
    : Number.isInteger(thread.anchorLine)
      ? `Line ${(thread.anchorLine as number) + 1}`
      : "Global";
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
            <SectionLabel style={{ color: "var(--accent)", letterSpacing: "0.08em" }}>
              {itemLabel}
            </SectionLabel>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {locationLabel} - {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {collapsed ? summary : hasHint ? "Hint with structured follow-up items." : "Structured follow-up item."}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {(hasHint || hasChildren) ? (
            <PillButton
              onClick={onToggleCollapse}
            >
              {collapsed ? "Expand" : "Fold"}
            </PillButton>
          ) : null}

          <PillButton
            onClick={onDismiss}
            tone="danger"
          >
            Dismiss
          </PillButton>
        </div>
      </div>

      {collapsed ? null : (
        <div style={{ display: "grid", gap: 12 }}>
          {thread.hint ? renderEntity(thread.hint, onAskQuestion, onInsertCode, onAddToNotebook) : null}

          {hasChildren ? (
            <div style={{ display: "grid", gap: 12 }}>
              {thread.children.map((entity) => (
                <div key={entity.id} style={{ marginLeft: thread.hint ? 16 : 0 }}>
                  {renderEntity(entity, onAskQuestion, onInsertCode, onAddToNotebook)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
