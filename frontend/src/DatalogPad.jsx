import { useState, useRef, useEffect, useCallback } from "react";
import { executeQuery } from "./transport/httpClient";
import { useHintsSocket } from "./transport/hintsSocket";

// --- CozoScript Mock Responses (fallback when backend unavailable) ---
const MOCK_RESPONSES = {
  "basic query": {
    text: "A basic CozoScript query binds variables and returns them. Use **?[vars] :=** to define what to return and **\\*relation{cols}** to match stored data.",
    code: `?[name, age] := *users{name, age}`,
    chips: ["add a filter", "return all relations", "what are stored relations?"],
    docs: [
      { title: "inline rules", section: "§2.1", body: "The ?[vars] := body pattern defines an inline rule. Variables in the head are returned. The body can reference stored relations with *name{cols}." },
      { title: "stored relations", section: "§3.1", body: "Stored relations are created with :create and queried with *name{cols}. Keys are specified before =>, values after." },
    ],
  },
  "older than 30": {
    text: "Add a filter condition directly in the rule body. CozoScript supports comparison operators like **>**, **<**, **>=**, **<=**.",
    code: `?[name, age] := *users{name, age}, age > 30`,
    chips: ["+ with sorting", "+ count results", "+ filter by name pattern"],
    docs: [
      { title: "filters", section: "§3.4", body: "Filter expressions like age > 30 can appear directly in rule bodies, separated by commas." },
    ],
  },
  "sorting": {
    text: "Use **:order** to sort results and **:limit** to cap the number of rows returned.",
    code: `?[name, age] := *users{name, age}, age > 30\n:order -age\n:limit 10`,
    chips: ["+ aggregation", "+ distinct", "all query modifiers"],
    docs: [
      { title: ":order", section: "§5.1", body: "Use :order col for ascending, :order -col for descending. Multiple columns: :order col1 -col2" },
    ],
  },
  "create relation": {
    text: "Use **:create** to define a stored relation. Keys go before **=>**, values after. Keys form the primary key.",
    code: `:create users {name: String => age: Int, email: String}`,
    chips: ["insert data", "query the relation", "list all relations"],
    docs: [
      { title: ":create", section: "§6.1", body: "Creates a new stored relation. Format: :create name {key_col: Type => val_col: Type}. Types: String, Int, Float, Bool, Null, Bytes, Uuid." },
    ],
  },
  fallback: {
    text: "Here's a general CozoScript pattern. Queries use **?[vars] :=** with **\\*relation{cols}** to match stored data.",
    code: `?[name, age] := *users{name, age}`,
    chips: ["how do I create a relation?", "show me sorting", "how is this different from SQL?"],
    docs: [
      { title: "query anatomy", section: "§2.0", body: "CozoScript queries: ?[returned_vars] := *stored_relation{bound_vars}, conditions. Use :create/:put/:rm for mutations." },
    ],
  },
};

function matchResponse(question) {
  const q = question.toLowerCase();
  if (q.includes("basic") || q.includes("look like") || q.includes("simple query")) return MOCK_RESPONSES["basic query"];
  if (q.includes("older") || q.includes("age") || q.includes("greater") || q.includes("filter")) return MOCK_RESPONSES["older than 30"];
  if (q.includes("sort") || q.includes("order") || q.includes("limit")) return MOCK_RESPONSES["sorting"];
  if (q.includes("create") || q.includes("schema") || q.includes("define") || q.includes("relation")) return MOCK_RESPONSES["create relation"];
  return MOCK_RESPONSES["fallback"];
}

// --- UI Helpers ---

function formatText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={i} style={{ color: "var(--accent)", fontWeight: 600 }}>{part.slice(2, -2)}</span>;
    }
    return part;
  });
}

function stripAnsiCodes(text) {
  let result = "";
  let idx = 0;

  while (idx < text.length) {
    if (text.charCodeAt(idx) === 27 && text[idx + 1] === "[") {
      let cursor = idx + 2;

      while (cursor < text.length && /[0-9;]/.test(text[cursor])) {
        cursor += 1;
      }

      if (text[cursor] === "m") {
        idx = cursor + 1;
        continue;
      }
    }

    result += text[idx];
    idx += 1;
  }

  return result;
}

// --- Sub-components ---

function DocPreview({ doc, isOpen, onToggle }) {
  return (
    <span style={{ display: "inline-block", marginRight: 8, marginBottom: 4 }}>
      <button
        onClick={onToggle}
        style={{
          background: "none",
          border: "1px solid var(--border-subtle)",
          borderRadius: 4,
          padding: "2px 8px",
          fontSize: 12,
          color: "var(--doc-link)",
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s ease",
          ...(isOpen ? { background: "var(--doc-link)", color: "var(--bg-main)", borderColor: "var(--doc-link)" } : {}),
        }}
        onMouseEnter={e => { if (!isOpen) e.target.style.borderColor = "var(--doc-link)"; }}
        onMouseLeave={e => { if (!isOpen) e.target.style.borderColor = "var(--border-subtle)"; }}
      >
        {isOpen ? "▾" : "▸"} {doc.title}
      </button>
      {isOpen && (
        <div style={{
          marginTop: 6,
          padding: "10px 14px",
          background: "var(--bg-doc)",
          border: "1px solid var(--border-doc)",
          borderRadius: 6,
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          maxWidth: 440,
        }}>
          <div style={{ fontSize: 11, color: "var(--doc-link)", marginBottom: 6, fontWeight: 600, letterSpacing: "0.03em" }}>
            {doc.title.toUpperCase()} — {doc.section}
          </div>
          {doc.body}
        </div>
      )}
    </span>
  );
}

function StreamingText({ text }) {
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

function AIBlock({ response, onChipClick, onInsert, collapsed, onToggleCollapse }) {
  const [openDocs, setOpenDocs] = useState({});
  const [copied, setCopied] = useState(false);

  const toggleDoc = (i) => setOpenDocs(prev => ({ ...prev, [i]: !prev[i] }));

  const handleCopy = () => {
    if (response.code) {
      navigator.clipboard.writeText(response.code).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  if (collapsed) {
    return (
      <div
        onClick={onToggleCollapse}
        style={{
          margin: "2px 0 2px 28px",
          padding: "4px 12px",
          background: "var(--bg-ai-collapsed)",
          borderRadius: 4,
          fontSize: 12,
          color: "var(--text-muted)",
          cursor: "pointer",
          borderLeft: "2px solid var(--accent-dim)",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={e => e.currentTarget.style.borderLeftColor = "var(--accent)"}
        onMouseLeave={e => e.currentTarget.style.borderLeftColor = "var(--accent-dim)"}
      >
        ✦ <span style={{ opacity: 0.6 }}>AI response</span> — <span style={{ opacity: 0.8 }}>{response.text.slice(0, 60).replace(/\*\*/g, "")}…</span> <span style={{ float: "right", opacity: 0.4 }}>click to expand</span>
      </div>
    );
  }

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
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 8, right: 10 }}>
        <button onClick={onToggleCollapse} style={{
          background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "2px 6px",
          borderRadius: 3, fontFamily: "inherit",
        }}
        onMouseEnter={e => e.target.style.color = "var(--text-primary)"}
        onMouseLeave={e => e.target.style.color = "var(--text-muted)"}
        >
          ▲ collapse
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 11, color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}>
        <span style={{ fontSize: 14 }}>✦</span> AI ASSISTANT
      </div>

      <div style={{ marginBottom: response.code ? 12 : 6 }}>
        {formatText(response.text)}
      </div>

      {response.warning && (
        <div style={{
          padding: "6px 10px",
          background: "var(--bg-warning)",
          borderRadius: 4,
          fontSize: 12,
          color: "var(--text-warning)",
          marginBottom: 12,
          borderLeft: "2px solid var(--text-warning)",
        }}>
          ⚠ {response.warning}
        </div>
      )}

      {response.code && (
        <div style={{
          background: "var(--bg-code)",
          borderRadius: 6,
          padding: "12px 14px",
          fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace",
          fontSize: 12.5,
          lineHeight: 1.6,
          color: "var(--text-code)",
          marginBottom: 12,
          whiteSpace: "pre",
          overflowX: "auto",
          border: "1px solid var(--border-code)",
        }}>
          {response.code}
        </div>
      )}

      {response.code && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button onClick={() => onInsert(response.code)} style={{
            padding: "5px 12px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
            background: "var(--accent)", color: "var(--bg-main)", border: "none",
            borderRadius: 4, cursor: "pointer", fontWeight: 600, transition: "all 0.12s ease",
          }}
          onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.target.style.transform = "none"}
          >
            Insert ↵
          </button>
          <button onClick={handleCopy} style={{
            padding: "5px 12px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
            background: "none", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)",
            borderRadius: 4, cursor: "pointer", transition: "all 0.12s ease",
          }}
          onMouseEnter={e => e.target.style.borderColor = "var(--text-secondary)"}
          onMouseLeave={e => e.target.style.borderColor = "var(--border-subtle)"}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}

      {response.chips && response.chips.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.02em" }}>Try also:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {response.chips.map((chip, i) => (
              <button key={i} onClick={() => onChipClick(chip)} style={{
                padding: "4px 10px",
                fontSize: 12,
                background: "var(--bg-chip)",
                color: "var(--text-chip)",
                border: "1px solid var(--border-chip)",
                borderRadius: 20,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.12s ease",
              }}
              onMouseEnter={e => { e.target.style.background = "var(--accent)"; e.target.style.color = "var(--bg-main)"; e.target.style.borderColor = "var(--accent)"; }}
              onMouseLeave={e => { e.target.style.background = "var(--bg-chip)"; e.target.style.color = "var(--text-chip)"; e.target.style.borderColor = "var(--border-chip)"; }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {response.docs && response.docs.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.02em" }}>Docs:</div>
          <div>
            {response.docs.map((doc, i) => (
              <DocPreview key={i} doc={doc} isOpen={!!openDocs[i]} onToggle={() => toggleDoc(i)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorBlock({ error, fix, onApplyFix, onDiagnose, diagnosing }) {
  return (
    <div style={{
      margin: "8px 0",
      borderRadius: 8,
      overflow: "hidden",
      border: "1px solid var(--border-error)",
    }}>
      <div style={{
        padding: "8px 14px",
        background: "var(--bg-error-header)",
        fontSize: 12,
        color: "var(--text-error)",
        fontFamily: "'IBM Plex Mono', monospace",
        fontWeight: 600,
      }}>
        ✗ ERROR — {error}
      </div>
      {fix ? (
        <div style={{
          padding: "12px 14px",
          background: "var(--bg-ai)",
          borderTop: "1px solid var(--border-error-dim)",
        }}>
          <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600, marginBottom: 6, letterSpacing: "0.04em" }}>
            ✦ AI DIAGNOSIS
          </div>
          <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, marginBottom: 10 }}>
            {formatText(fix.text)}
          </div>
          {fix.code && (
            <div style={{
              background: "var(--bg-code)", borderRadius: 6, padding: "10px 14px",
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, lineHeight: 1.6,
              color: "var(--text-code)", marginBottom: 10, whiteSpace: "pre",
              border: "1px solid var(--border-code)",
            }}>
              {fix.code}
            </div>
          )}
          {fix.code && (
            <button onClick={onApplyFix} style={{
              padding: "5px 12px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
              background: "var(--accent)", color: "var(--bg-main)", border: "none",
              borderRadius: 4, cursor: "pointer", fontWeight: 600,
            }}>
              Apply fix ↵
            </button>
          )}
        </div>
      ) : onDiagnose ? (
        <div style={{
          padding: "12px 14px",
          background: "var(--bg-ai)",
          borderTop: "1px solid var(--border-error-dim)",
        }}>
          <button onClick={onDiagnose} disabled={diagnosing} style={{
            padding: "5px 12px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
            background: diagnosing ? "var(--border-subtle)" : "var(--accent)", color: "var(--bg-main)", border: "none",
            borderRadius: 4, cursor: diagnosing ? "wait" : "pointer", fontWeight: 600,
          }}>
            {diagnosing ? "Diagnosing..." : "✦ Ask AI to diagnose"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// --- Main Component ---

export default function DatalogPad() {
  const [lines, setLines] = useState([""]);
  const [aiBlocks, setAiBlocks] = useState({});
  const [streamingBlocks, setStreamingBlocks] = useState({});
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [errorBlock, setErrorBlock] = useState(null);
  const [cursorLine, setCursorLine] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const textareaRef = useRef(null);
  const editorRef = useRef(null);

  const ws = useHintsSocket();

  // Track streaming text for each hint request
  const streamingTextRef = useRef({});

  // Set up WebSocket event handlers
  useEffect(() => {
    const unsubStart = ws.on("llm.start", (event) => {
      streamingTextRef.current[event.id] = "";
      setStreamingBlocks(prev => ({ ...prev, [event.id]: "" }));
    });

    const unsubDelta = ws.on("llm.delta", (event) => {
      const text = (streamingTextRef.current[event.id] || "") + event.data;
      streamingTextRef.current[event.id] = text;
      setStreamingBlocks(prev => ({ ...prev, [event.id]: text }));
    });

    const unsubResult = ws.on("hint.result", (event) => {
      const _lineIdx = parseInt(event.id.split("-").pop());
      // Remove streaming block and set final response
      setStreamingBlocks(prev => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
      delete streamingTextRef.current[event.id];

      const response = event.data;
      if (event.id.startsWith("diag-")) {
        // Diagnosis result — update error block
        setErrorBlock(prev => prev ? {
          ...prev,
          fix: {
            text: response.text || "See the suggested fix.",
            code: response.code || null,
          },
        } : null);
        setDiagnosing(false);
      } else {
        // Hint result
        setAiBlocks(prev => ({ ...prev, [event.id]: response }));
      }
    });

    const unsubError = ws.on("llm.error", (event) => {
      setStreamingBlocks(prev => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
      delete streamingTextRef.current[event.id];
      setDiagnosing(false);
    });

    return () => {
      unsubStart();
      unsubDelta();
      unsubResult();
      unsubError();
    };
  }, [ws]);

  const focusTextarea = () => {
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const requestHint = useCallback((question, lineIdx) => {
    // Try WebSocket first
    const sent = ws.send("hint.request", { question, history: [] });
    if (!sent) {
      // Fallback to mock
      const response = matchResponse(question);
      setAiBlocks(prev => ({ ...prev, [`mock-${lineIdx}`]: response }));
    }
  }, [ws]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const currentLine = lines[cursorLine] || "";
      const match = currentLine.match(/^#\?\?\s+(.+)/);

      const newLines = [...lines];
      newLines.splice(cursorLine + 1, 0, "");
      setLines(newLines);

      if (match) {
        const question = match[1].trim();
        requestHint(question, cursorLine);
        setShowOnboarding(false);
      }

      setCursorLine(cursorLine + 1);
      focusTextarea();
    }
  };

  const handleLineChange = (e) => {
    const val = e.target.value;
    const newLines = [...lines];
    newLines[cursorLine] = val;
    setLines(newLines);
    if (val.length > 0) setShowOnboarding(false);
  };

  const handleChipClick = (chip) => {
    const newQuestion = `#?? ${chip}`;
    const insertAt = cursorLine + 1;
    const newLines = [...lines];
    newLines.splice(insertAt, 0, newQuestion, "");
    setLines(newLines);

    requestHint(chip, insertAt);
    setCursorLine(insertAt + 1);
    focusTextarea();
  };

  const handleInsert = (code) => {
    const codeLines = code.split("\n");
    const insertAt = cursorLine + 1;
    const newLines = [...lines];
    newLines.splice(insertAt, 0, ...codeLines);
    setLines(newLines);
    setCursorLine(insertAt + codeLines.length - 1);
    focusTextarea();
  };

  const handleLineClick = (idx) => {
    setCursorLine(idx);
    focusTextarea();
  };

  const toggleCollapse = (lineIdx) => {
    setCollapsedBlocks(prev => ({ ...prev, [lineIdx]: !prev[lineIdx] }));
  };

  const handleRun = async () => {
    const code = lines.filter(l => !l.startsWith("#")).join("\n").trim();
    if (!code || running) return;

    setRunning(true);
    setErrorBlock(null);
    setRunResult(null);

    const result = await executeQuery(code);

    setRunning(false);

    if (result.ok) {
      setRunResult({
        columns: result.headers || [],
        rows: result.rows || [],
        took: result.took,
      });
    } else {
      // Strip ANSI codes from display message
      const errorMsg = stripAnsiCodes(result.display || result.message || "Unknown error");
      setErrorBlock({
        error: errorMsg,
        script: code,
        fix: null,
      });
    }
  };

  const handleDiagnose = () => {
    if (!errorBlock || diagnosing) return;
    setDiagnosing(true);

    const sent = ws.send("diagnosis.request", {
      error: errorBlock.error,
      script: errorBlock.script || "",
    });

    if (!sent) {
      // Fallback
      setErrorBlock(prev => prev ? {
        ...prev,
        fix: {
          text: "Could not connect to AI. Check that the backend is running and ANTHROPIC_API_KEY is set.",
          code: null,
        },
      } : null);
      setDiagnosing(false);
    }
  };

  const handleExampleClick = (text) => {
    const newLines = [`#?? ${text}`, ""];
    setLines(newLines);
    requestHint(text, 0);
    setCursorLine(1);
    setShowOnboarding(false);
    focusTextarea();
  };

  // Collect all streaming blocks for display
  const activeStreams = Object.entries(streamingBlocks);

  return (
    <div style={{
      "--bg-main": "#0f1117",
      "--bg-editor": "#13151d",
      "--bg-ai": "rgba(212, 175, 55, 0.04)",
      "--bg-ai-collapsed": "rgba(212, 175, 55, 0.02)",
      "--bg-code": "rgba(0,0,0,0.35)",
      "--bg-chip": "rgba(212, 175, 55, 0.06)",
      "--bg-doc": "rgba(100, 160, 255, 0.04)",
      "--bg-warning": "rgba(255, 180, 50, 0.06)",
      "--bg-error-header": "rgba(255, 80, 80, 0.08)",
      "--bg-onboard": "rgba(255,255,255,0.02)",
      "--bg-result": "rgba(80, 200, 120, 0.04)",
      "--accent": "#d4af37",
      "--accent-dim": "rgba(212, 175, 55, 0.25)",
      "--text-primary": "#c8cad0",
      "--text-secondary": "#8b8d97",
      "--text-muted": "#5c5e68",
      "--text-code": "#a8dadc",
      "--text-chip": "#d4af37",
      "--text-warning": "#e0a040",
      "--text-error": "#e06060",
      "--text-line-num": "#3a3c48",
      "--text-line-active": "#5c5e68",
      "--text-comment": "#6a6e4e",
      "--doc-link": "#6ca4e8",
      "--border-subtle": "rgba(255,255,255,0.06)",
      "--border-chip": "rgba(212, 175, 55, 0.2)",
      "--border-code": "rgba(255,255,255,0.04)",
      "--border-doc": "rgba(100, 160, 255, 0.12)",
      "--border-error": "rgba(255, 80, 80, 0.2)",
      "--border-error-dim": "rgba(255, 80, 80, 0.08)",
      "--border-result": "rgba(80, 200, 120, 0.15)",
      minHeight: "100vh",
      background: "var(--bg-main)",
      color: "var(--text-primary)",
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace",
      display: "flex",
      flexDirection: "column",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--accent)", fontSize: 18 }}>⚡</span>
          <span style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
          }}>
            CozoScript Pad
          </span>
          <span style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 3,
            background: ws.connected ? "rgba(80, 200, 120, 0.15)" : "var(--accent-dim)",
            color: ws.connected ? "rgba(80, 200, 120, 0.8)" : "var(--accent)",
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}>
            {ws.connected ? "CONNECTED" : "OFFLINE"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Type <code style={{ color: "var(--accent)", background: "var(--bg-chip)", padding: "1px 5px", borderRadius: 3 }}>#??</code> to ask AI
          </span>
          <button onClick={handleRun} disabled={running} style={{
            padding: "6px 16px",
            background: running ? "var(--border-subtle)" : "var(--accent)",
            color: "var(--bg-main)",
            border: "none",
            borderRadius: 5,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: running ? "wait" : "pointer",
            letterSpacing: "0.02em",
            transition: "all 0.12s ease",
          }}
          onMouseEnter={e => { if (!running) e.target.style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => e.target.style.transform = "none"}
          >
            {running ? "Running..." : "Run ▶"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div ref={editorRef} style={{ flex: 1, padding: "16px 0", overflowY: "auto" }} onClick={focusTextarea}>
        {showOnboarding && lines.length === 1 && lines[0] === "" ? (
          <div style={{ padding: "40px 50px" }}>
            <div style={{
              padding: "28px 32px",
              background: "var(--bg-onboard)",
              borderRadius: 10,
              border: "1px dashed var(--border-subtle)",
              maxWidth: 500,
              margin: "0 auto",
            }}>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.6 }}>
                Start writing CozoScript, or type <code style={{
                  color: "var(--accent)", background: "var(--bg-chip)", padding: "2px 6px", borderRadius: 3,
                }}>#??</code> to ask anything.
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, fontFamily: "'IBM Plex Sans', sans-serif" }}>Examples:</div>
              {[
                "what does a basic query look like?",
                "how do I create a relation?",
                "show me sorting and limits",
              ].map((ex, i) => (
                <div
                  key={i}
                  onClick={(e) => { e.stopPropagation(); handleExampleClick(ex); }}
                  style={{
                    padding: "8px 12px",
                    marginBottom: 6,
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "var(--text-comment)",
                    fontSize: 13,
                    transition: "all 0.12s ease",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-chip)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--border-chip)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-comment)"; e.currentTarget.style.borderColor = "transparent"; }}
                >
                  #?? {ex}
                </div>
              ))}

              <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Quickstart", "Syntax ref", "CozoScript →"].map((label, i) => (
                  <button key={i} style={{
                    padding: "5px 12px",
                    fontSize: 12,
                    background: "none",
                    color: "var(--doc-link)",
                    border: "1px solid var(--border-doc)",
                    borderRadius: 5,
                    cursor: "pointer",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                  }}
                  onMouseEnter={e => { e.target.style.background = "var(--bg-doc)"; }}
                  onMouseLeave={e => { e.target.style.background = "none"; }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ minHeight: 300 }}>
            {lines.map((line, idx) => (
              <div key={idx}>
                <div
                  onClick={() => handleLineClick(idx)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    minHeight: 28,
                    cursor: "text",
                    background: cursorLine === idx ? "rgba(255,255,255,0.015)" : "transparent",
                  }}
                >
                  {/* Line number */}
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

                  {/* Line content */}
                  <div style={{ flex: 1, paddingRight: 20 }}>
                    {cursorLine === idx ? (
                      <input
                        ref={textareaRef}
                        value={line}
                        onChange={handleLineChange}
                        onKeyDown={handleKeyDown}
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
                        color: line.startsWith("#??") ? "var(--text-comment)" : line.startsWith("//") || line.startsWith(";") ? "var(--text-muted)" : "var(--text-primary)",
                        fontStyle: line.startsWith("#??") || line.startsWith("//") || line.startsWith(";") ? "italic" : "normal",
                        minHeight: 28,
                        whiteSpace: "pre",
                      }}>
                        {line || " "}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI response block (mock fallback) */}
                {aiBlocks[`mock-${idx}`] && (
                  <AIBlock
                    response={aiBlocks[`mock-${idx}`]}
                    collapsed={!!collapsedBlocks[idx]}
                    onToggleCollapse={() => toggleCollapse(idx)}
                    onChipClick={handleChipClick}
                    onInsert={handleInsert}
                  />
                )}
              </div>
            ))}

            {/* Streaming AI blocks (from WebSocket) */}
            {activeStreams.map(([id, text]) => (
              <StreamingText key={id} text={text} />
            ))}

            {/* Completed AI blocks from WebSocket (shown after editor lines) */}
            {Object.entries(aiBlocks).filter(([key]) => key.startsWith("hint-")).map(([key, response]) => (
              <AIBlock
                key={key}
                response={response}
                collapsed={!!collapsedBlocks[key]}
                onToggleCollapse={() => toggleCollapse(key)}
                onChipClick={handleChipClick}
                onInsert={handleInsert}
              />
            ))}
          </div>
        )}

        {/* Error block */}
        {errorBlock && (
          <div style={{ padding: "0 60px" }}>
            <ErrorBlock
              error={errorBlock.error}
              fix={errorBlock.fix}
              diagnosing={diagnosing}
              onDiagnose={ws.connected ? handleDiagnose : null}
              onApplyFix={() => {
                if (errorBlock.fix?.code) handleInsert(errorBlock.fix.code);
                setErrorBlock(null);
              }}
            />
          </div>
        )}

        {/* Run result */}
        {runResult && (
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
              <span>✓ {runResult.rows.length} RESULTS</span>
              {runResult.took != null && <span>{(runResult.took * 1000).toFixed(1)}ms</span>}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {runResult.columns.map((col, i) => (
                      <th key={i} style={{
                        textAlign: "left",
                        padding: "8px 14px",
                        borderBottom: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        fontSize: 12,
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runResult.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{
                          padding: "6px 14px",
                          borderBottom: "1px solid rgba(255,255,255,0.02)",
                          color: "var(--text-primary)",
                        }}>{typeof cell === "object" ? JSON.stringify(cell) : String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div style={{
        padding: "6px 20px",
        display: "flex",
        justifyContent: "space-between",
        borderTop: "1px solid var(--border-subtle)",
        fontSize: 11,
        color: "var(--text-muted)",
        background: "rgba(0,0,0,0.2)",
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}>
        <span>Ln {cursorLine + 1}, Col {(lines[cursorLine] || "").length + 1}</span>
        <span>{Object.keys(aiBlocks).length} AI responses · {lines.filter(l => !l.startsWith("#")).filter(l => l.trim()).length} code lines</span>
        <span>CozoScript · {ws.connected ? "Connected" : "Offline"}</span>
      </div>
    </div>
  );
}
