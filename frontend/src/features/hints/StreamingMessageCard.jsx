export function StreamingMessageCard({ text }) {
  return (
    <div style={{
      margin: "4px 0 4px 28px",
      padding: "14px 16px 12px",
      background: "var(--bg-ai)",
      borderLeft: "2px solid var(--accent)",
      borderRadius: "0 8px 8px 0",
      fontSize: 13,
      lineHeight: 1.7,
      color: "var(--text-primary)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}>
        <span style={{ fontSize: 14 }}>✦</span> AI ASSISTANT
        <span style={{ animation: "pulse 1.5s ease-in-out infinite", opacity: 0.6 }}>...</span>
      </div>
      <div style={{ whiteSpace: "pre-wrap" }}>{text}</div>
    </div>
  );
}
