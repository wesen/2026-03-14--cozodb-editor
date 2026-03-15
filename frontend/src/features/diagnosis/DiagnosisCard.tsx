interface DiagnosisFix {
  text: string;
  code?: string;
}

interface Props {
  diagnosing: boolean;
  error: string;
  fix: DiagnosisFix | null;
  onApplyFix?: () => void;
  onDiagnose?: () => void;
}

export function DiagnosisCard({ diagnosing, error, fix, onApplyFix, onDiagnose }: Props) {
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
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 10, letterSpacing: "0.04em" }}>
            AI SUGGESTED FIX
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)", marginBottom: 12 }}>
            {fix.text}
          </div>
          {fix.code && (
            <div className="cozo-code-panel" style={{
              padding: "10px 14px",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, lineHeight: 1.6,
              color: "var(--text-code)", marginBottom: 10, whiteSpace: "pre",
            }}>
              {fix.code}
            </div>
          )}
          {fix.code && (
            <button className="mac-btn" onClick={onApplyFix}>
              Apply fix
            </button>
          )}
        </div>
      ) : onDiagnose ? (
        <div style={{
          padding: "12px 14px",
          background: "var(--bg-ai)",
          borderTop: "1px solid var(--border-error-dim)",
        }}>
          <button className="mac-btn" onClick={onDiagnose} disabled={diagnosing}>
            {diagnosing ? "Diagnosing..." : "Ask AI to diagnose"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
