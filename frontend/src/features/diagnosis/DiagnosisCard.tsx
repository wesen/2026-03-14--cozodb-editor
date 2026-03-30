import { ActionRow, CodePanel, MacButton, SectionLabel } from "../../components/primitives";
import { buildDiagnosisMarkdownNote } from "../../notebook/aiNoteMarkdown";
import { useNotebookExperience } from "../../notebook/experienceConfig";

interface DiagnosisFix {
  text: string;
  code?: string;
}

interface Props {
  diagnosing: boolean;
  error: string;
  fix: DiagnosisFix | null;
  onAddToNotebook?: (markdown: string) => void;
  onApplyFix?: () => void;
  onDiagnose?: () => void;
}

export function DiagnosisCard({ diagnosing, error, fix, onAddToNotebook, onApplyFix, onDiagnose }: Props) {
  const { codeFenceLanguage } = useNotebookExperience();

  return (
    <div className="cozo-diagnosis-card">
      <div style={{
        padding: "10px 14px",
        background: "var(--bg-error-header)",
        borderBottom: "1px solid var(--border-error-dim)",
        color: "var(--text-error)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
      }}>
        QUERY ERROR
      </div>
      <div style={{
        padding: "14px 16px",
        fontSize: 13,
        lineHeight: 1.7,
        color: "var(--text-primary)",
      }}>
        <div style={{ marginBottom: fix ? 12 : 0, whiteSpace: "pre-wrap" }}>
          {error}
        </div>
      </div>

      {fix ? (
        <div style={{
          padding: "14px 16px",
          background: "var(--bg-ai)",
          borderTop: "1px solid var(--border-error-dim)",
        }}>
          <SectionLabel style={{ marginBottom: 10 }}>
            AI SUGGESTED FIX
          </SectionLabel>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)", marginBottom: 12 }}>
            {fix.text}
          </div>
          {fix.code && (
            <CodePanel preserveWhitespace={false} style={{ marginBottom: 10, whiteSpace: "pre" }}>
              {fix.code}
            </CodePanel>
          )}
          {fix.code ? (
            <ActionRow>
              <MacButton onClick={onApplyFix}>
                Apply fix
              </MacButton>
              <MacButton
                onClick={() => onAddToNotebook?.(buildDiagnosisMarkdownNote({
                  codeFenceLanguage,
                  error,
                  fixCode: fix.code,
                  fixText: fix.text,
                }))}
              >
                Add to notebook
              </MacButton>
            </ActionRow>
          ) : null}
        </div>
      ) : onDiagnose ? (
        <div style={{
          padding: "12px 14px",
          background: "var(--bg-ai)",
          borderTop: "1px solid var(--border-error-dim)",
        }}>
          <MacButton onClick={onDiagnose} disabled={diagnosing}>
            {diagnosing ? "Diagnosing..." : "Ask AI to diagnose"}
          </MacButton>
        </div>
      ) : null}
    </div>
  );
}
