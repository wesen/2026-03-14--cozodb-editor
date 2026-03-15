export function QueryResultsTable({ result }) {
  return (
    <div style={{
      margin: "12px 60px",
      borderRadius: 8,
      overflow: "hidden",
      border: "1px solid var(--border-result)",
    }}>
      <div style={{
        padding: "6px 14px",
        background: "var(--bg-result)",
        fontSize: 11,
        color: "rgba(80, 200, 120, 0.8)",
        fontWeight: 600,
        letterSpacing: "0.04em",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span>✓ {result.rows.length} RESULTS</span>
        {result.took != null && <span>{(result.took * 1000).toFixed(1)}ms</span>}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {result.columns.map((col, idx) => (
                <th key={idx} style={{
                  textAlign: "left",
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                  fontSize: 12,
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} style={{
                    padding: "6px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.02)",
                    color: "var(--text-primary)",
                  }}>
                    {typeof cell === "object" ? JSON.stringify(cell) : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
