import { type ReactNode, useState } from "react";
import { ActionRow, CodePanel, MacButton, PillButton, SectionLabel } from "../../components/primitives";
import { buildHintMarkdownNote } from "../../notebook/aiNoteMarkdown";
import { DocPreviewChip } from "./DocPreviewChip";
import { toHintCardViewModel } from "./hintViewModel";

interface HintResponse {
  text?: string;
  code?: string;
  chips?: string[];
  docs?: { title: string; section?: string; body: string }[];
}

interface Props {
  onAddToNotebook: (markdown: string) => void;
  collapsed: boolean;
  onChipClick: (chip: string) => void;
  onInsert: (code: string) => void;
  onToggleCollapse: () => void;
  response: HintResponse;
}

function formatHintText(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={idx} style={{ color: "var(--accent)", fontWeight: 600 }}>{part.slice(2, -2)}</span>;
    }

    return part;
  });
}

export function HintResponseCard({ collapsed, onAddToNotebook, onChipClick, onInsert, onToggleCollapse, response }: Props) {
  const [openDocs, setOpenDocs] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const viewModel = toHintCardViewModel(response);

  const toggleDoc = (docIdx: number) => setOpenDocs((prev) => ({ ...prev, [docIdx]: !prev[docIdx] }));

  const handleCopy = () => {
    if (!viewModel.code) return;

    navigator.clipboard.writeText(viewModel.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (collapsed) {
    return (
        <div
          className="cozo-ai-card--collapsed"
          onClick={onToggleCollapse}
        style={{
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(event) => { event.currentTarget.style.borderLeftColor = "var(--accent)"; }}
        onMouseLeave={(event) => { event.currentTarget.style.borderLeftColor = "var(--accent-dim)"; }}
      >
        <span style={{ opacity: 0.6 }}>AI response</span> — <span style={{ opacity: 0.8 }}>{viewModel.previewText}...</span> <span style={{ float: "right", opacity: 0.4 }}>click to expand</span>
      </div>
    );
  }

  return (
    <div className="cozo-ai-card" style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 8, right: 10 }}>
        <PillButton
          onClick={onToggleCollapse}
          style={{ padding: "2px 8px" }}
        >
          collapse
        </PillButton>
      </div>

      <SectionLabel style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "var(--accent)" }}>
        AI ASSISTANT
      </SectionLabel>

      <div style={{ marginBottom: 12 }}>
        {formatHintText(viewModel.text)}
      </div>

      {viewModel.code && (
        <CodePanel
          action={(
            <PillButton onClick={handleCopy} tone={copied ? "accent" : "neutral"} style={{ padding: "2px 8px" }}>
              {copied ? "copied" : "copy"}
            </PillButton>
          )}
          style={{ marginBottom: 12 }}
        >
          {viewModel.code}
        </CodePanel>
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
            <PillButton
              key={idx}
              onClick={() => onChipClick(chip)}
            >
              {chip}
            </PillButton>
          ))}
        </div>
      )}

      {viewModel.code && (
        <ActionRow style={{ marginTop: 12 }}>
          <MacButton onClick={() => onInsert(viewModel.code)}>
            Insert code
          </MacButton>
          <MacButton
            onClick={() => onAddToNotebook(buildHintMarkdownNote({
              chips: viewModel.chips,
              code: viewModel.code,
              docs: viewModel.docs,
              heading: "AI Assistant Suggestion",
              text: viewModel.text,
            }))}
          >
            Add to notebook
          </MacButton>
        </ActionRow>
      )}
    </div>
  );
}
