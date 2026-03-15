function renderLineText(line) {
  if (line.startsWith("#??")) {
    return {
      color: "var(--text-comment)",
      fontStyle: "italic",
    };
  }

  if (line.startsWith("//") || line.startsWith(";")) {
    return {
      color: "var(--text-muted)",
      fontStyle: "italic",
    };
  }

  return {
    color: "var(--text-primary)",
    fontStyle: "normal",
  };
}

export function PadEditor({
  children,
  cursorLine,
  editorRef,
  emptyState,
  inputRef,
  lines,
  onBackgroundClick,
  onKeyDown,
  onLineChange,
  onLineClick,
  renderAfterLine,
}) {
  const showEmptyState = emptyState && lines.length === 1 && lines[0] === "";

  return (
    <div
      ref={editorRef}
      style={{ flex: 1, padding: "16px 0", overflowY: "auto" }}
      onClick={onBackgroundClick}
    >
      {showEmptyState ? (
        emptyState
      ) : (
        <div style={{ minHeight: 300 }}>
          {lines.map((line, idx) => {
            const lineTextStyle = renderLineText(line);

            return (
              <div key={idx}>
                <div
                  onClick={() => onLineClick(idx)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    minHeight: 28,
                    cursor: "text",
                    background: cursorLine === idx ? "rgba(255,255,255,0.015)" : "transparent",
                  }}
                >
                  <div style={{
                    width: 44,
                    textAlign: "right",
                    paddingRight: 16,
                    paddingTop: 4,
                    fontSize: 12,
                    color: cursorLine === idx ? "var(--text-line-active)" : "var(--text-line-num)",
                    userSelect: "none",
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1, paddingRight: 20 }}>
                    {cursorLine === idx ? (
                      <input
                        ref={inputRef}
                        value={line}
                        onChange={(event) => onLineChange(event.target.value)}
                        onKeyDown={onKeyDown}
                        spellCheck={false}
                        autoFocus
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: line.startsWith("#??") ? "var(--text-comment)" : "var(--text-primary)",
                          fontFamily: "inherit",
                          fontSize: 14,
                          lineHeight: "28px",
                          padding: 0,
                          caretColor: "var(--accent)",
                        }}
                      />
                    ) : (
                      <div style={{
                        fontSize: 14,
                        lineHeight: "28px",
                        minHeight: 28,
                        whiteSpace: "pre",
                        ...lineTextStyle,
                      }}>
                        {line || " "}
                      </div>
                    )}
                  </div>
                </div>

                {renderAfterLine?.(idx, line)}
              </div>
            );
          })}

          {children}
        </div>
      )}
    </div>
  );
}
