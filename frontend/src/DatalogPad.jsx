import { useState, useEffect, useCallback } from "react";
import { PadEditor } from "./editor/PadEditor";
import { usePadDocument } from "./editor/usePadDocument";
import { DiagnosisCard } from "./features/diagnosis/DiagnosisCard";
import { HintResponseCard } from "./features/hints/HintResponseCard";
import { StreamingMessageCard } from "./features/hints/StreamingMessageCard";
import { QueryResultsTable } from "./features/query-results/QueryResultsTable";
import {
  HINT_RESULT_EVENT,
  LLM_DELTA_EVENT,
  LLM_ERROR_EVENT,
  LLM_START_EVENT,
} from "./sem/semEventTypes";
import {
  applySemEvent,
  createSemProjectionState,
  getCompletedHintEntries,
  getStreamingEntries,
} from "./sem/semProjection";
import "./theme/cards.css";
import "./theme/layout.css";
import "./theme/tokens.css";
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

// --- Main Component ---

export default function DatalogPad() {
  const [mockAiBlocks, setMockAiBlocks] = useState({});
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [errorBlock, setErrorBlock] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [runResult, setRunResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [semProjection, setSemProjection] = useState(() => createSemProjectionState());

  const ws = useHintsSocket();

  // Set up WebSocket event handlers
  useEffect(() => {
    const unsubStart = ws.on(LLM_START_EVENT, (event) => {
      setSemProjection((current) => applySemEvent(current, event));
    });

    const unsubDelta = ws.on(LLM_DELTA_EVENT, (event) => {
      setSemProjection((current) => applySemEvent(current, event));
    });

    const unsubResult = ws.on(HINT_RESULT_EVENT, (event) => {
      setSemProjection((current) => applySemEvent(current, event));

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
      }
    });

    const unsubError = ws.on(LLM_ERROR_EVENT, (event) => {
      setSemProjection((current) => applySemEvent(current, event));
      setDiagnosing(false);
    });

    return () => {
      unsubStart();
      unsubDelta();
      unsubResult();
      unsubError();
    };
  }, [ws]);

  const requestHint = useCallback((question, lineIdx) => {
    // Try WebSocket first
    const sent = ws.send("hint.request", { question, history: [] });
    if (!sent) {
      // Fallback to mock
      const response = matchResponse(question);
      setMockAiBlocks(prev => ({ ...prev, [`mock-${lineIdx}`]: response }));
    }
  }, [ws]);

  const {
    cursorLine,
    editorRef,
    focusInput,
    handleKeyDown,
    handleLineChange,
    inputRef,
    insertCodeBelowCursor,
    insertQuestionBelowCursor,
    lines,
    loadExampleQuestion,
    selectLine,
  } = usePadDocument({
    onInteract: () => setShowOnboarding(false),
    onQuestion: requestHint,
  });

  const handleChipClick = useCallback((chip) => {
    insertQuestionBelowCursor(chip);
  }, [insertQuestionBelowCursor]);

  const handleInsert = useCallback((code) => {
    insertCodeBelowCursor(code);
  }, [insertCodeBelowCursor]);

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
    loadExampleQuestion(text);
  };

  // Collect all streaming blocks for display
  const activeStreams = getStreamingEntries(semProjection);
  const completedHints = getCompletedHintEntries(semProjection);
  const aiResponseCount = Object.keys(mockAiBlocks).length + completedHints.length;

  return (
    <div className="cozo-pad-root">
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="cozo-shell-bar cozo-shell-bar--header">
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
      <PadEditor
        cursorLine={cursorLine}
        editorRef={editorRef}
        emptyState={showOnboarding ? (
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
        ) : null}
        inputRef={inputRef}
        lines={lines}
        onBackgroundClick={focusInput}
        onKeyDown={handleKeyDown}
        onLineChange={handleLineChange}
        onLineClick={selectLine}
        renderAfterLine={(idx) => (
          mockAiBlocks[`mock-${idx}`] ? (
            <HintResponseCard
              response={mockAiBlocks[`mock-${idx}`]}
              collapsed={!!collapsedBlocks[idx]}
              onToggleCollapse={() => toggleCollapse(idx)}
              onChipClick={handleChipClick}
              onInsert={handleInsert}
            />
          ) : null
        )}
      >
        {activeStreams.map(([id, text]) => (
          <StreamingMessageCard key={id} text={text} />
        ))}

        {completedHints.map(([key, response]) => (
          <HintResponseCard
            key={key}
            response={response}
            collapsed={!!collapsedBlocks[key]}
            onToggleCollapse={() => toggleCollapse(key)}
            onChipClick={handleChipClick}
            onInsert={handleInsert}
          />
        ))}
      </PadEditor>

        {/* Error block */}
        {errorBlock && (
          <div style={{ padding: "0 60px" }}>
            <DiagnosisCard
              error={errorBlock.error}
              fix={errorBlock.fix}
              diagnosing={diagnosing}
              onDiagnose={ws.connected ? handleDiagnose : null}
              onApplyFix={() => {
                if (errorBlock.fix?.code) insertCodeBelowCursor(errorBlock.fix.code);
                setErrorBlock(null);
              }}
            />
          </div>
        )}

        {/* Run result */}
        {runResult && <QueryResultsTable result={runResult} />}
      {/* Status bar */}
      <div className="cozo-shell-bar cozo-shell-bar--status">
        <span>Ln {cursorLine + 1}, Col {(lines[cursorLine] || "").length + 1}</span>
        <span>{aiResponseCount} AI responses · {lines.filter(l => !l.startsWith("#")).filter(l => l.trim()).length} code lines</span>
        <span>CozoScript · {ws.connected ? "Connected" : "Offline"}</span>
      </div>
    </div>
  );
}
