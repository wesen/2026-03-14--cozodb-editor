interface Props {
  text: string;
}

export function StreamingMessageCard({ text }: Props) {
  return (
    <div className="cozo-ai-card" style={{ whiteSpace: "normal" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}>
        AI ASSISTANT
        <span style={{ animation: "pulse 1.5s ease-in-out infinite", opacity: 0.6 }}>...</span>
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
    </div>
  );
}
