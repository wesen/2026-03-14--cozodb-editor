---
Title: Frontend Architecture Guide
Ticket: COZODB-001
Status: active
Topics:
    - frontend
    - websocket
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - "/home/manuel/code/wesen/2026-03-14--cozodb-editor/imports/query2.jsx:Monolithic prototype — needs to be split into modular components"
ExternalSources: []
Summary: "Frontend architecture for the Datalog Pad — modular React component breakdown, WebSocket integration, state management, and theming"
LastUpdated: 2026-03-14T15:45:00.000000000-04:00
WhatFor: "Guide for implementing the React frontend"
WhenToUse: "When implementing the frontend, splitting the prototype, or adding WebSocket integration"
---

# Frontend Architecture Guide

## Executive Summary

Split the monolithic `query2.jsx` prototype (825 lines, single file) into a modular
React component architecture with:

1. **Component library** — reusable, themed UI components
2. **WebSocket layer** — real-time SEM frame processing
3. **State management** — React context/hooks for editor state, AI blocks, streaming
4. **Theme system** — CSS custom properties (already prototyped inline)

## Current Prototype Analysis

`imports/query2.jsx` contains everything in one file:

| Component | Lines | Responsibility |
|-----------|-------|---------------|
| `MOCK_RESPONSES` | 1-72 | Mock AI response data |
| `matchResponse()` | 74-84 | Keyword-based response matching |
| `formatText()` | 86-94 | Bold markdown rendering |
| `DocPreview` | 96-138 | Expandable documentation preview |
| `AIBlock` | 140-303 | AI response block (text, code, chips, docs) |
| `ErrorBlock` | 306-355 | Query error with AI diagnosis |
| `DatalogPad` | 357-824 | Main editor component (everything) |

**Problems with the monolith:**
- All styles are inline (not reusable)
- State management is ad-hoc (many `useState` calls)
- Mock responses are hardcoded
- No WebSocket integration
- No separation between editor logic and AI logic
- Line indexing for AI blocks uses fragile `aiBlocks[idx]` map

## Proposed Component Structure

```
src/
├── components/
│   ├── DatalogPad/
│   │   ├── DatalogPad.tsx          # Main orchestrator
│   │   ├── DatalogPad.css          # Component styles
│   │   ├── EditorHeader.tsx        # Title bar + Run button
│   │   ├── EditorLine.tsx          # Single line with line number
│   │   ├── EditorBody.tsx          # Line list + onboarding state
│   │   ├── StatusBar.tsx           # Bottom status bar
│   │   └── index.ts                # Public exports
│   ├── AIBlock/
│   │   ├── AIBlock.tsx             # AI response container
│   │   ├── AIBlock.css
│   │   ├── AIBlockCollapsed.tsx    # Collapsed state
│   │   ├── CodeBlock.tsx           # Syntax-highlighted code display
│   │   ├── ChipBar.tsx             # "Try also" suggestion chips
│   │   ├── DocBar.tsx              # Documentation link row
│   │   ├── ActionBar.tsx           # Insert/Copy buttons
│   │   ├── WarningBanner.tsx       # Warning display
│   │   └── index.ts
│   ├── DocPreview/
│   │   ├── DocPreview.tsx          # Expandable doc preview
│   │   ├── DocPreview.css
│   │   └── index.ts
│   ├── ErrorBlock/
│   │   ├── ErrorBlock.tsx          # Error display with AI diagnosis
│   │   ├── ErrorBlock.css
│   │   └── index.ts
│   ├── QueryResult/
│   │   ├── QueryResult.tsx         # Query result table
│   │   ├── QueryResult.css
│   │   └── index.ts
│   └── Onboarding/
│       ├── Onboarding.tsx          # Empty state with examples
│       ├── Onboarding.css
│       └── index.ts
├── hooks/
│   ├── useWebSocket.ts             # WebSocket connection + SEM frame handling
│   ├── useHintStream.ts            # Hint request/response streaming
│   ├── useEditorState.ts           # Editor lines, cursor, AI blocks
│   ├── useQueryExecution.ts        # CozoDB query execution via REST
│   └── useSEMFrameProcessor.ts     # Process SEM frames into UI state
├── services/
│   ├── api.ts                      # REST API client
│   ├── websocket.ts                # WebSocket connection manager
│   └── semProtocol.ts              # SEM frame parsing/construction
├── types/
│   ├── hint.ts                     # HintResponse, DocPreview, etc.
│   ├── editor.ts                   # EditorLine, AIBlockState, etc.
│   ├── query.ts                    # QueryResult, QueryError
│   └── sem.ts                      # SEM frame types
├── theme/
│   ├── variables.css               # CSS custom properties
│   └── fonts.css                   # Font imports
└── App.tsx                         # Root component
```

## Component Breakdown

### DatalogPad (orchestrator)

The main component becomes thin — it just wires sub-components and hooks:

```tsx
export function DatalogPad() {
    const editor = useEditorState();
    const ws = useWebSocket('/ws/hints');
    const hints = useHintStream(ws);
    const query = useQueryExecution();

    return (
        <div className="datalog-pad">
            <EditorHeader onRun={() => query.execute(editor.codeLines)} />
            <EditorBody
                lines={editor.lines}
                cursorLine={editor.cursorLine}
                aiBlocks={hints.blocks}
                onLineClick={editor.setCursorLine}
                onLineChange={editor.updateLine}
                onEnter={editor.handleEnter}
                onChipClick={hints.handleChipClick}
                onInsertCode={editor.insertCode}
            />
            {query.error && (
                <ErrorBlock
                    error={query.error}
                    onApplyFix={(code) => editor.insertCode(code)}
                />
            )}
            {query.result && <QueryResult result={query.result} />}
            <StatusBar
                line={editor.cursorLine + 1}
                col={(editor.lines[editor.cursorLine] || '').length + 1}
                aiCount={Object.keys(hints.blocks).length}
                codeLineCount={editor.codeLines.length}
            />
        </div>
    );
}
```

### AIBlock (split into sub-components)

```tsx
// AIBlock.tsx — container that switches between collapsed and expanded
export function AIBlock({ response, collapsed, onToggle, onChipClick, onInsert }) {
    if (collapsed) {
        return <AIBlockCollapsed response={response} onToggle={onToggle} />;
    }
    return (
        <div className="ai-block">
            <div className="ai-block__header">
                <span className="ai-block__icon">✦</span>
                <span className="ai-block__label">AI ASSISTANT</span>
                <button className="ai-block__collapse" onClick={onToggle}>
                    ▲ collapse
                </button>
            </div>

            <div className="ai-block__text">
                <FormattedText text={response.text} />
            </div>

            {response.warning && <WarningBanner text={response.warning} />}
            {response.code && <CodeBlock code={response.code} />}
            {response.code && (
                <ActionBar
                    onInsert={() => onInsert(response.code)}
                    onCopy={() => navigator.clipboard.writeText(response.code)}
                />
            )}
            {response.chips?.length > 0 && (
                <ChipBar chips={response.chips} onChipClick={onChipClick} />
            )}
            {response.docs?.length > 0 && <DocBar docs={response.docs} />}
        </div>
    );
}

// AIBlockCollapsed.tsx
export function AIBlockCollapsed({ response, onToggle }) {
    return (
        <div className="ai-block ai-block--collapsed" onClick={onToggle}>
            ✦ <span className="ai-block__preview">
                {response.text.slice(0, 60).replace(/\*\*/g, '')}...
            </span>
            <span className="ai-block__expand-hint">click to expand</span>
        </div>
    );
}

// ChipBar.tsx
export function ChipBar({ chips, onChipClick }) {
    return (
        <div className="chip-bar">
            <div className="chip-bar__label">Try also:</div>
            <div className="chip-bar__chips">
                {chips.map((chip, i) => (
                    <button key={i} className="chip" onClick={() => onChipClick(chip)}>
                        {chip}
                    </button>
                ))}
            </div>
        </div>
    );
}

// DocBar.tsx
export function DocBar({ docs }) {
    return (
        <div className="doc-bar">
            <div className="doc-bar__label">Docs:</div>
            <div className="doc-bar__items">
                {docs.map((doc, i) => (
                    <DocPreview key={i} doc={doc} />
                ))}
            </div>
        </div>
    );
}
```

### Streaming AIBlock

For streaming responses, the AIBlock needs a `streaming` state:

```tsx
// AIBlock with streaming support
export function AIBlock({ response, streaming, streamingText, ...props }) {
    if (streaming) {
        return (
            <div className="ai-block ai-block--streaming">
                <div className="ai-block__header">
                    <span className="ai-block__icon ai-block__icon--pulse">✦</span>
                    <span className="ai-block__label">AI ASSISTANT</span>
                    <span className="ai-block__streaming-indicator" />
                </div>
                <div className="ai-block__text">
                    <FormattedText text={streamingText} />
                    <span className="ai-block__cursor" />
                </div>
            </div>
        );
    }
    // ... full response rendering
}
```

## Custom Hooks

### useWebSocket

```tsx
type SEMFrame = {
    sem: true;
    event: {
        type: string;
        id: string;
        seq?: number;
        data: any;
    };
};

export function useWebSocket(url: string) {
    const [connected, setConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const listenersRef = useRef<Map<string, Set<(frame: SEMFrame) => void>>>();

    useEffect(() => {
        const ws = new WebSocket(url);
        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
            setConnected(false);
            // Reconnect with backoff
        };
        ws.onmessage = (e) => {
            const frame = JSON.parse(e.data) as SEMFrame;
            if (!frame.sem) return;
            const type = frame.event.type;
            listenersRef.current?.get(type)?.forEach(fn => fn(frame));
            listenersRef.current?.get('*')?.forEach(fn => fn(frame));
        };
        wsRef.current = ws;
        return () => ws.close();
    }, [url]);

    const send = useCallback((msg: any) => {
        wsRef.current?.send(JSON.stringify(msg));
    }, []);

    const on = useCallback((type: string, handler: (frame: SEMFrame) => void) => {
        if (!listenersRef.current) listenersRef.current = new Map();
        if (!listenersRef.current.has(type)) listenersRef.current.set(type, new Set());
        listenersRef.current.get(type)!.add(handler);
        return () => listenersRef.current?.get(type)?.delete(handler);
    }, []);

    return { connected, send, on };
}
```

### useHintStream

```tsx
type HintBlock = {
    response?: HintResponse;
    streaming: boolean;
    streamingText: string;
    error?: string;
};

export function useHintStream(ws: ReturnType<typeof useWebSocket>) {
    const [blocks, setBlocks] = useState<Record<number, HintBlock>>({});
    const pendingRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        const unsub1 = ws.on('llm.start', (frame) => {
            const lineIdx = pendingRef.current.get(frame.event.id);
            if (lineIdx === undefined) return;
            setBlocks(prev => ({
                ...prev,
                [lineIdx]: { streaming: true, streamingText: '' }
            }));
        });

        const unsub2 = ws.on('llm.delta', (frame) => {
            const lineIdx = pendingRef.current.get(frame.event.id);
            if (lineIdx === undefined) return;
            setBlocks(prev => ({
                ...prev,
                [lineIdx]: {
                    ...prev[lineIdx],
                    streamingText: frame.event.data.cumulative || ''
                }
            }));
        });

        const unsub3 = ws.on('hint.result', (frame) => {
            const lineIdx = pendingRef.current.get(frame.event.data.request_id);
            if (lineIdx === undefined) return;
            setBlocks(prev => ({
                ...prev,
                [lineIdx]: {
                    response: frame.event.data,
                    streaming: false,
                    streamingText: ''
                }
            }));
            pendingRef.current.delete(frame.event.data.request_id);
        });

        return () => { unsub1(); unsub2(); unsub3(); };
    }, [ws]);

    const requestHint = useCallback((lineIdx: number, question: string, history: any[]) => {
        const requestId = `hint-${Date.now()}-${lineIdx}`;
        pendingRef.current.set(requestId, lineIdx);
        ws.send({
            type: 'hint.request',
            request_id: requestId,
            question,
            history
        });
    }, [ws]);

    const handleChipClick = useCallback((chip: string, insertAtLine: number) => {
        requestHint(insertAtLine, chip, []);
    }, [requestHint]);

    return { blocks, requestHint, handleChipClick };
}
```

### useEditorState

```tsx
export function useEditorState() {
    const [lines, setLines] = useState<string[]>(['']);
    const [cursorLine, setCursorLine] = useState(0);

    const updateLine = useCallback((value: string) => {
        setLines(prev => {
            const next = [...prev];
            next[cursorLine] = value;
            return next;
        });
    }, [cursorLine]);

    const handleEnter = useCallback(() => {
        const currentLine = lines[cursorLine] || '';
        const match = currentLine.match(/^#\?\?\s+(.+)/);

        setLines(prev => {
            const next = [...prev];
            next.splice(cursorLine + 1, 0, '');
            return next;
        });
        setCursorLine(prev => prev + 1);

        return match ? match[1].trim() : null;
    }, [lines, cursorLine]);

    const insertCode = useCallback((code: string) => {
        const codeLines = code.split('\n');
        const insertAt = cursorLine + 1;
        setLines(prev => {
            const next = [...prev];
            next.splice(insertAt, 0, ...codeLines);
            return next;
        });
        setCursorLine(insertAt + codeLines.length - 1);
    }, [cursorLine]);

    const codeLines = useMemo(
        () => lines.filter(l => !l.startsWith('#') && l.trim()),
        [lines]
    );

    return {
        lines, cursorLine, setCursorLine,
        updateLine, handleEnter, insertCode, codeLines
    };
}
```

## Theme System

Extract the inline CSS variables from the prototype into a proper theme file:

```css
/* theme/variables.css */
:root {
    --bg-main: #0f1117;
    --bg-editor: #13151d;
    --bg-ai: rgba(212, 175, 55, 0.04);
    --bg-ai-collapsed: rgba(212, 175, 55, 0.02);
    --bg-code: rgba(0, 0, 0, 0.35);
    --bg-chip: rgba(212, 175, 55, 0.06);
    --bg-doc: rgba(100, 160, 255, 0.04);
    --bg-warning: rgba(255, 180, 50, 0.06);
    --bg-error-header: rgba(255, 80, 80, 0.08);
    --bg-onboard: rgba(255, 255, 255, 0.02);
    --bg-result: rgba(80, 200, 120, 0.04);
    --accent: #d4af37;
    --accent-dim: rgba(212, 175, 55, 0.25);
    --text-primary: #c8cad0;
    --text-secondary: #8b8d97;
    --text-muted: #5c5e68;
    --text-code: #a8dadc;
    --text-chip: #d4af37;
    --text-warning: #e0a040;
    --text-error: #e06060;
    --text-line-num: #3a3c48;
    --text-line-active: #5c5e68;
    --text-comment: #6a6e4e;
    --doc-link: #6ca4e8;
    --border-subtle: rgba(255, 255, 255, 0.06);
    --border-chip: rgba(212, 175, 55, 0.2);
    --border-code: rgba(255, 255, 255, 0.04);
    --border-doc: rgba(100, 160, 255, 0.12);
    --border-error: rgba(255, 80, 80, 0.2);
    --border-result: rgba(80, 200, 120, 0.15);
    --font-mono: 'IBM Plex Mono', 'JetBrains Mono', 'Fira Code', monospace;
    --font-sans: 'IBM Plex Sans', sans-serif;
}
```

## REST API Integration

```tsx
// services/api.ts
const API_BASE = '/api';

export async function executeQuery(script: string, params?: Record<string, any>) {
    const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, params: params || {} }),
    });
    return res.json();
}

export async function listRelations() {
    return executeQuery('::relations');
}

export async function describeRelation(name: string) {
    return executeQuery(`::columns ${name}`);
}
```

## Implementation Plan

1. **Set up Vite + React + TypeScript project** (or add to existing)
2. **Extract theme** — move inline CSS variables to `theme/variables.css`
3. **Split components** — break `query2.jsx` into the component tree above
4. **Create type definitions** — `types/hint.ts`, `types/editor.ts`, etc.
5. **Implement hooks** — `useEditorState`, `useWebSocket`, `useHintStream`
6. **Wire WebSocket** — connect to `/ws/hints`, process SEM frames
7. **Add REST API client** — for query execution
8. **Remove mock responses** — replace `MOCK_RESPONSES` with real WebSocket
9. **Add streaming UI** — pulsing indicator, progressive text rendering
10. **Embed in Go** — use `go:embed` to serve from the Go backend

## Design Decisions

### 1. CSS Custom Properties over CSS-in-JS

**Decision:** Extract inline styles to CSS files with custom properties.

**Why:** The prototype uses inline styles extensively. CSS custom properties give us
theming without the runtime overhead of CSS-in-JS. Components use BEM-like class names.

### 2. Custom hooks over Redux/Zustand

**Decision:** Use React hooks + context for state management.

**Why:** The state is relatively simple. Custom hooks keep the state close to where
it's used.

### 3. SEM frame protocol

**Decision:** Use the same SEM frame protocol as pinocchio/webchat.

**Why:** Reuses pinocchio's battle-tested streaming protocol. The protocol supports
all the event types we need (llm.start/delta/final, plus custom hint.result).

### 4. go:embed for production builds

**Decision:** Build frontend with Vite, embed dist/ in the Go binary.

**Why:** Single binary deployment. Development uses Vite dev server with proxy.

## Open Questions

1. **CodeMirror vs textarea** — Should we use CodeMirror 6 for proper syntax
   highlighting and bracket matching?
2. **Keyboard shortcuts** — Ctrl+Enter to run, Esc to dismiss AI block, etc.
3. **History persistence** — Persist editor state in localStorage?
4. **Multi-tab support** — Multiple editor tabs/sessions?

## References

- [imports/query2.jsx](../../../../../../imports/query2.jsx) — Original prototype
- [Pinocchio webchat](~/code/wesen/corporate-headquarters/pinocchio/pkg/webchat/)
- [SEM protobuf definitions](~/code/wesen/corporate-headquarters/pinocchio/pkg/sem/pb/proto/sem/base/)
