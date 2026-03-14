import { useState, useRef, useEffect, useCallback } from "react";

const MOCK_RESPONSES = {
  "basic query": {
    text: "A basic Datalog query has three parts: **:find** (what to return), **:where** (the pattern to match), and data clauses (triples of entity-attribute-value).",
    code: `[:find ?name\n :where\n [?e :user/name ?name]]`,
    chips: ["add a filter", "return multiple fields", "what are data clauses?"],
    docs: [
      { title: ":find clause", section: "§2.1", body: "The :find clause specifies which variables to return. Supports ?var for scalars, (pull ?e [*]) for entities, and aggregates like (count ?x)." },
      { title: ":where clause", section: "§2.3", body: "The :where clause contains data patterns, predicates, and function expressions that constrain the query." },
    ],
  },
  "older than 30": {
    text: "Use **:where** clauses with a predicate function. Predicates are written as lists with the comparison operator first.",
    code: `[:find ?name\n :where\n [?e :user/name ?name]\n [?e :user/age ?age]\n [(> ?age 30)]]`,
    chips: ["+ with sorting", "+ count results", "+ filter by name pattern"],
    docs: [
      { title: "predicates", section: "§3.4", body: "Predicate expressions like [(> ?age 30)] filter results. Any Clojure function that returns a boolean can be used as a predicate." },
      { title: ":where clause", section: "§2.3", body: "The :where clause contains data patterns, predicates, and function expressions that constrain the query." },
    ],
  },
  "sorting": {
    text: "Core Datalog has no ordering. But **Datomic** and **DataScript** support **:order-by** as an extension.",
    code: `[:find ?name ?age\n :order-by [?age :desc]\n :where\n [?e :user/name ?name]\n [?e :user/age ?age]\n [(> ?age 30)]]`,
    chips: ["+ with limit", "+ aggregate :sum :avg", "difference from SQL ORDER BY"],
    docs: [
      { title: ":order-by", section: "§5.1", body: "Extension clause. Takes a vector of [variable direction] pairs. Direction is :asc (default) or :desc. Not part of core Datalog." },
    ],
    warning: ":order-by is not part of core Datalog — it varies by engine.",
  },
  "joins": {
    text: "Shared variables = implicit joins. When two clauses mention the same **?variable**, Datalog unifies them — like an INNER JOIN in SQL.",
    code: `[:find ?name ?email\n :where\n [?e :user/name ?name]\n [?e :user/email ?email]]`,
    chips: ["explicit or-join", "not-join (anti-join)", "SQL joins vs Datalog"],
    docs: [
      { title: "unification", section: "§4.2", body: "When Datalog encounters the same variable in multiple clauses, it constrains results to only those tuples where the variable binds to the same value across all clauses." },
      { title: "implicit joins", section: "§4.1", body: "Unlike SQL, Datalog does not require explicit JOIN keywords. Shared variables across clauses automatically create join conditions." },
    ],
  },
  "different from sql": {
    text: "Datalog uses **pattern matching** instead of table scans. There are no tables — just triples of [entity attribute value]. Variables unify across clauses instead of explicit JOINs.",
    code: `; SQL:  SELECT name FROM users WHERE age > 30\n; Datalog:\n[:find ?name\n :where\n [?e :user/name ?name]\n [?e :user/age ?age]\n [(> ?age 30)]]`,
    chips: ["what are triples?", "how do joins work?", "what about GROUP BY?"],
    docs: [
      { title: "EAV model", section: "§1.2", body: "Datalog stores facts as entity-attribute-value triples. This is fundamentally different from SQL's row-column model." },
    ],
  },
  "?e": {
    text: "**?e** is a logic variable — a placeholder that Datalog binds to entity IDs. Think of it as a row pointer. Any symbol starting with **?** is a variable. **?e** is conventional for \"entity.\"",
    code: null,
    chips: ["what are logic variables?", "can I name them anything?", "what is an entity?"],
    docs: [
      { title: "logic variables", section: "§1.4", body: "Variables in Datalog start with ?. They are placeholders that the query engine binds to values. Unlike SQL columns, they can appear anywhere and unification happens automatically." },
    ],
  },
  "schema": {
    text: "In Datomic, schema is defined as transactions. Each attribute has a **:db/ident**, **:db/valueType**, and **:db/cardinality**.",
    code: `[{:db/ident       :user/name\n  :db/valueType   :db.type/string\n  :db/cardinality  :db.cardinality/one}\n {:db/ident       :user/age\n  :db/valueType   :db.type/long\n  :db/cardinality  :db.cardinality/one}]`,
    chips: ["cardinality many", "unique identities", "component entities"],
    docs: [
      { title: "schema definition", section: "§6.1", body: "Schema attributes define the shape of your data. :db/valueType sets the type, :db/cardinality sets one-or-many, and :db/unique can enforce uniqueness." },
    ],
  },
  fallback: {
    text: "Here's a general pattern to get you started. Datalog queries are built from **:find** (return values), **:where** (constraints), and data clauses.",
    code: `[:find ?result\n :where\n [?e :some/attr ?result]]`,
    chips: ["find all users older than 30", "how do joins work?", "how is this different from SQL?"],
    docs: [
      { title: "query anatomy", section: "§2.0", body: "Every Datalog query has a :find clause and a :where clause. The :find clause declares which bound variables to return. The :where clause contains patterns to match against the database." },
    ],
  },
};

function matchResponse(question) {
  const q = question.toLowerCase();
  if (q.includes("basic") || q.includes("look like") || q.includes("simple query")) return MOCK_RESPONSES["basic query"];
  if (q.includes("older") || q.includes("age") || q.includes("greater") || q.includes("filter")) return MOCK_RESPONSES["older than 30"];
  if (q.includes("sort") || q.includes("order")) return MOCK_RESPONSES["sorting"];
  if (q.includes("join")) return MOCK_RESPONSES["joins"];
  if (q.includes("sql") || q.includes("different")) return MOCK_RESPONSES["different from sql"];
  if (q.includes("?e") || q.includes("variable") || q.includes("logic")) return MOCK_RESPONSES["?e"];
  if (q.includes("schema") || q.includes("define") || q.includes("attribute")) return MOCK_RESPONSES["schema"];
  return MOCK_RESPONSES["fallback"];
}

function formatText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <span key={i} style={{ color: "var(--accent)", fontWeight: 600 }}>{part.slice(2, -2)}</span>;
    }
    return part;
  });
}

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
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.02em" }}>📖 Docs:</div>
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

function ErrorBlock({ error, fix, onApplyFix }) {
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
        <button onClick={onApplyFix} style={{
          padding: "5px 12px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace",
          background: "var(--accent)", color: "var(--bg-main)", border: "none",
          borderRadius: 4, cursor: "pointer", fontWeight: 600,
        }}>
          Apply fix ↵
        </button>
      </div>
    </div>
  );
}

export default function DatalogPad() {
  const [lines, setLines] = useState([""]);
  const [aiBlocks, setAiBlocks] = useState({});
  const [collapsedBlocks, setCollapsedBlocks] = useState({});
  const [errorBlock, setErrorBlock] = useState(null);
  const [cursorLine, setCursorLine] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [runResult, setRunResult] = useState(null);
  const textareaRef = useRef(null);
  const editorRef = useRef(null);

  const focusTextarea = () => {
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

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
        const response = matchResponse(question);
        setAiBlocks(prev => ({ ...prev, [cursorLine]: response }));
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

    const response = matchResponse(chip);
    setAiBlocks(prev => ({ ...prev, [insertAt]: response }));
    setCursorLine(insertAt + 1);
    focusTextarea();
  };

  const handleInsert = (code) => {
    const codeLines = code.split("\n");
    const insertAt = cursorLine + 1;
    const newLines = [...lines];
    newLines.splice(insertAt, 0, ...codeLines);
    setLines(newLines);

    // Shift AI block keys
    const newAiBlocks = {};
    for (const [k, v] of Object.entries(aiBlocks)) {
      const ki = parseInt(k);
      newAiBlocks[ki >= insertAt ? ki + codeLines.length : ki] = v;
    }
    setAiBlocks(newAiBlocks);
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

  const handleRun = () => {
    const code = lines.filter(l => !l.startsWith("#")).join("\n").trim();
    if (!code) return;

    // Simulate checking for common errors
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;

    if (openBrackets !== closeBrackets) {
      setErrorBlock({
        error: `Mismatched brackets: ${openBrackets} opening, ${closeBrackets} closing`,
        fix: {
          text: "Check your bracket nesting. Every **[** needs a matching **]**. Data clauses are wrapped in square brackets.",
          code: null,
        },
      });
      setRunResult(null);
      return;
    }

    if (code.includes(":find") && code.includes(":where")) {
      setErrorBlock(null);
      setRunResult({
        columns: code.match(/\?(\w+)/g)?.filter((v, i, a) => a.indexOf(v) === i).slice(0, 3) || ["?result"],
        rows: [
          ["Alice", "34", "alice@example.com"],
          ["Carlos", "41", "carlos@example.com"],
          ["Diana", "37", "diana@example.com"],
        ].map(r => r.slice(0, (code.match(/\?(\w+)/g)?.filter((v, i, a) => a.indexOf(v) === i) || []).length || 1)),
      });
    } else {
      setErrorBlock({
        error: "Query must contain :find and :where clauses",
        fix: {
          text: "A Datalog query requires at minimum a **:find** clause and a **:where** clause.",
          code: `[:find ?result\n :where\n [?e :some/attr ?result]]`,
        },
      });
      setRunResult(null);
    }
  };

  const handleExampleClick = (text) => {
    const newLines = [`#?? ${text}`, ""];
    setLines(newLines);
    const response = matchResponse(text);
    setAiBlocks({ 0: response });
    setCursorLine(1);
    setShowOnboarding(false);
    focusTextarea();
  };

  const lineCount = lines.length;

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
            Datalog Pad
          </span>
          <span style={{
            fontSize: 10,
            padding: "2px 6px",
            borderRadius: 3,
            background: "var(--accent-dim)",
            color: "var(--accent)",
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}>
            PROTOTYPE
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
            Type <code style={{ color: "var(--accent)", background: "var(--bg-chip)", padding: "1px 5px", borderRadius: 3 }}>#??</code> to ask AI
          </span>
          <button onClick={handleRun} style={{
            padding: "6px 16px",
            background: "var(--accent)",
            color: "var(--bg-main)",
            border: "none",
            borderRadius: 5,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: "pointer",
            letterSpacing: "0.02em",
            transition: "all 0.12s ease",
          }}
          onMouseEnter={e => e.target.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.target.style.transform = "none"}
          >
            Run ▶
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
                Start writing Datalog, or type <code style={{
                  color: "var(--accent)", background: "var(--bg-chip)", padding: "2px 6px", borderRadius: 3,
                }}>#??</code> to ask anything.
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, fontFamily: "'IBM Plex Sans', sans-serif" }}>Examples:</div>
              {[
                "what does a basic query look like?",
                "how is this different from SQL?",
                "show me the schema syntax",
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
                {["Quickstart", "Syntax ref", "SQL → Datalog"].map((label, i) => (
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
                    📖 {label}
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
                        color: line.startsWith("#??") ? "var(--text-comment)" : line.startsWith(";") ? "var(--text-muted)" : "var(--text-primary)",
                        fontStyle: line.startsWith("#??") || line.startsWith(";") ? "italic" : "normal",
                        minHeight: 28,
                        whiteSpace: "pre",
                      }}>
                        {line || " "}
                      </div>
                    )}
                  </div>
                </div>

                {/* AI response block */}
                {aiBlocks[idx] && (
                  <AIBlock
                    response={aiBlocks[idx]}
                    collapsed={!!collapsedBlocks[idx]}
                    onToggleCollapse={() => toggleCollapse(idx)}
                    onChipClick={handleChipClick}
                    onInsert={handleInsert}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error block */}
        {errorBlock && (
          <div style={{ padding: "0 60px" }}>
            <ErrorBlock
              error={errorBlock.error}
              fix={errorBlock.fix}
              onApplyFix={() => {
                if (errorBlock.fix.code) handleInsert(errorBlock.fix.code);
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
            }}>
              ✓ {runResult.rows.length} RESULTS
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
                        }}>{cell}</td>
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
        <span>Datalog · UTF-8</span>
      </div>
    </div>
  );
}
