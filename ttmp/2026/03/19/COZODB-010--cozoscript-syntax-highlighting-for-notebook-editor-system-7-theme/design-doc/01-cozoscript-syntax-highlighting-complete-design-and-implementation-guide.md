---
Title: "CozoScript Syntax Highlighting — Complete Design and Implementation Guide"
Ticket: COZODB-010
Status: active
Topics:
    - syntax-highlighting
    - codemirror
    - frontend
    - cozodb
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - "2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/cozoscript.grammar:Lezer grammar defining CozoScript syntax"
    - "2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/highlight.js:styleTags mapping parse nodes to highlight tags"
    - "2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/complete.js:Context-aware autocomplete engine"
    - "2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/theme.js:Catppuccin Mocha theme (reference for new System 7 theme)"
    - "2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/src/index.js:Language package entry point"
    - "2026-03-14--cozodb-editor/frontend/src/notebook/NotebookCellCard.tsx:Cell component with textarea to replace"
    - "2026-03-14--cozodb-editor/frontend/src/editor/PadEditor.jsx:Existing line-by-line editor (reference)"
    - "2026-03-14--cozodb-editor/frontend/src/theme/tokens.css:System 7 design tokens"
    - "2026-03-14--cozodb-editor/frontend/src/theme/layout.css:System 7 window chrome CSS"
    - "2026-03-14--cozodb-editor/frontend/package.json:Dependencies to modify"
ExternalSources: []
Summary: "Complete guide for integrating the existing lang-cozoscript Lezer/CodeMirror 6 language package into the CozoDB Notebook React editor, with a new System 7 light theme replacing the Catppuccin dark theme."
LastUpdated: 2026-03-19T22:40:31.177195883-04:00
WhatFor: ""
WhenToUse: ""
---

# CozoScript Syntax Highlighting — Complete Design and Implementation Guide

> **Audience:** An intern new to this codebase. This guide explains every moving
> part of the system so you can understand what exists, what needs to change, and
> how to wire it all together.

---

## 1. Executive Summary

The CozoDB Notebook editor currently uses a plain `<textarea>` for editing
CozoScript queries. It has no syntax highlighting, no autocomplete, no bracket
matching — just monochrome text with rudimentary comment coloring.

Meanwhile, a separate project (`2026-02-24--cozoscript-treesitter-autocomplete/`)
already contains a **complete, working** CodeMirror 6 language package for
CozoScript. It includes a Lezer grammar, syntax highlighting with 73 tag
mappings, context-aware autocomplete with 200+ completions, and a Catppuccin
Mocha dark theme.

**The goal of this ticket** is to integrate that language package into the
notebook's React editor, replacing the `<textarea>` with a proper CodeMirror 6
editor instance — but themed to match the notebook's System 7 / Classic Mac OS
visual design, not the dark Catppuccin theme from the standalone editor.

This is a "bridge two existing systems" task, not a "build from scratch" task.

---

## 2. The Two Systems You Need to Understand

### 2.1 System A: The Notebook Frontend (React + Redux)

**Location:** `2026-03-14--cozodb-editor/frontend/`

This is a React 19 application using Redux Toolkit for state management. It
implements a notebook interface (think Jupyter) where users create cells, write
CozoScript queries, run them against a Go backend, and see results rendered as
tables. The UI is styled to look like Classic Mac OS / System 7.

#### Key files

| File | Purpose |
|------|---------|
| `src/notebook/NotebookCellCard.tsx` | The main cell component. Contains the `<textarea>` we need to replace. |
| `src/editor/PadEditor.jsx` | A line-by-line editor component (used elsewhere, not in notebook cells). |
| `src/notebook/state/notebookSlice.ts` | Redux slice managing cell state: `source`, `kind`, run status, etc. |
| `src/theme/tokens.css` | System 7 design tokens: colors, shadows, borders, fonts. |
| `src/theme/layout.css` | Window chrome: `.mac-window`, `.mac-btn`, titlebars. |
| `src/theme/cards.css` | AI/SEM card styling. |
| `src/notebook/notebook.css` | Notebook-specific styles: `.mac-cell-editor`, `.mac-cell-body`. |
| `package.json` | Dependencies — currently has NO CodeMirror packages. |

#### How the textarea currently works

In `NotebookCellCard.tsx` (line 228–239), code cells render a `<textarea>`:

```tsx
<textarea
  ref={editorRef}
  className="mac-cell-editor"
  value={resolvedCell.source}
  onChange={(event) => dispatch(setCellSource({
    cellId: resolvedCell.id,
    source: event.target.value
  }))}
  onBlur={handleEditorBlur}
  onFocus={() => dispatch(setActiveCellId(resolvedCell.id))}
  onKeyDown={handleKeyDown}
  placeholder="-- Enter Datalog query..."
  rows={1}
  spellCheck={false}
/>
```

The key integration points are:

- **State flows in** via `resolvedCell.source` (Redux store)
- **State flows out** via `dispatch(setCellSource(...))` on every change
- **Keyboard shortcuts:** `Shift+Enter` runs the cell, `Alt/Ctrl+Enter` runs and
  inserts a new cell below, `Escape` exits markdown editing
- **Auto-resize:** A `useEffect` sets `textarea.style.height` based on
  `scrollHeight`
- **Blur handling:** Persists the cell to the backend on blur

#### The System 7 design language

The notebook uses a deliberate retro aesthetic. Every UI element looks like it
came from a 1991 Macintosh:

```
Design Token Examples (from tokens.css):
─────────────────────────────────────────
--bg-desktop:    #a8a8a8     (gray, with dither pattern)
--bg-window:     #ffffff     (white window body)
--bg-code:       #f5f5f0     (warm off-white for code areas)
--bg-field:      #ffffff     (input field background)
--text-primary:  #000000     (black text)
--text-muted:    #666666     (secondary text)
--accent:        #000000     (black accents)
--shadow-window: 2px 2px 0px #000  (hard pixel shadow)
--shadow-btn:    1px 1px 0px #000  (button shadow)
--border-window: #000000     (2px solid black borders)

Font Stack:
  UI:    "IBM Plex Sans", "Geneva", "Helvetica", sans-serif
  Code:  "IBM Plex Mono", monospace
```

The editor must use this palette. The Catppuccin dark theme from the standalone
editor will NOT be used — we need a new light theme that fits the System 7
aesthetic.

---

### 2.2 System B: The lang-cozoscript Package (Lezer + CodeMirror 6)

**Location:** `2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/`

This is a self-contained npm package that provides CozoScript language support
for CodeMirror 6. It was built and tested as part of the standalone `cozo-webui`
editor.

#### What is Lezer?

Lezer is CodeMirror 6's parser system. Unlike tree-sitter (which compiles to
WASM), Lezer generates a pure JavaScript LR parser from a `.grammar` file. The
parser runs in the browser with zero native dependencies.

The pipeline looks like this:

```
┌───────────────────┐     lezer-generator     ┌──────────────┐
│ cozoscript.grammar│ ──────────────────────▸  │  parser.js   │
│   (396 lines)     │      (build step)       │  (generated) │
└───────────────────┘                          └──────┬───────┘
                                                      │
                                                      ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐
│ highlight.js │    │  complete.js │    │      index.js        │
│ (styleTags)  │    │ (autocomplete│    │  LRLanguage.define() │
│              │    │   source)    │    │  LanguageSupport()   │
└──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘
       │                   │                       │
       └───────────────────┴───────────────────────┘
                           │
                    ┌──────▼───────┐
                    │   theme.js   │
                    │ (colors for  │
                    │  each tag)   │
                    └──────────────┘
```

#### The grammar file (`src/cozoscript.grammar`)

This 396-line file defines the complete syntax of CozoScript in Lezer's grammar
DSL. Here is a simplified mental model of the parse tree:

```
SourceFile
 ├── SystemOp          ::relations, ::columns, ::remove, ...
 ├── BracedQuery       { ... }
 └── BareQuery
      ├── RuleDef+
      │    ├── InlineRule     head := body
      │    ├── FixedRule      head <~ Algorithm(...)
      │    └── ConstRule      head <- [[...]]
      └── QueryOption*
           ├── :limit N
           ├── :sort +col, -col
           ├── :create name { key => val }
           └── ... (14 total)
```

The grammar handles:

- **22 aggregation operators** (count, sum, min, max, collect, union, ...)
- **21 graph algorithms** (PageRank, BFS, DFS, Dijkstra, ...)
- **Full expression grammar** with operator precedence (or > and > comparison >
  modulo > equality > add > multiply > power > coalesce > unary)
- **String literals** (double-quoted, single-quoted, with escape sequences)
- **Numeric literals** (decimal, hex 0x, octal 0o, binary 0b, floats with
  exponents)
- **Comments** (both `#` and `//` styles)
- **Special forms** (`try`, `if`, `cond`)
- **Stored relations** (`*relation[bindings]`, `*relation{named: bindings}`)
- **Relation specs** for schema definitions (`{key: Type => val: Type}`)

#### How the parser is generated

```bash
# This command turns the grammar into a JavaScript LR parser:
npx lezer-generator src/cozoscript.grammar -o src/parser.js

# It produces two files:
#   src/parser.js       – The LR parse tables (~24 KB)
#   src/parser.terms.js – Token ID constants (~4 KB)
```

You **never edit** `parser.js` or `parser.terms.js` by hand. They are generated
artifacts. If you change the grammar, you re-run `lezer-generator`.

#### Syntax highlighting (`src/highlight.js`)

This file maps parse tree node types to **Lezer highlight tags**. Tags are an
abstraction layer — they say "this node is a keyword" or "this node is a
function name" without specifying colors. Colors come later, in the theme.

```javascript
import { styleTags, tags as t } from "@lezer/highlight";

export const cozoHighlighting = styleTags({
  // Comments
  Comment: t.lineComment,

  // Literals
  NullLiteral: t.null,
  BoolLiteral: t.bool,
  Integer: t.integer,
  Float: t.float,
  "DoubleQuotedString SingleQuotedString": t.string,
  EscapeSequence: t.escape,

  // Keywords
  "not or and in default on none some": t.keyword,
  "_new _old": t.keyword,
  "try if cond": t.controlKeyword,

  // Operators
  "Assign FixedArrow ConstArrow FatArrow Arrow": t.definitionOperator,
  "ComparisonOp EqualityOp": t.compareOperator,
  "AddOp MulOp Concat": t.arithmeticOperator,

  // Rule structure
  EntryMarker: t.special(t.variableName),                    // the ? marker
  "RuleName/Identifier": t.definition(t.variableName),       // rule definitions
  "StoredRelationApplication/Identifier": t.special(t.variableName),

  // Aggregation operators (22 total)
  "min max union intersection choice ...": t.standard(t.function(t.variableName)),

  // Algorithm names
  AlgorithmName: t.standard(t.className),

  // Function calls
  "FunctionName/Identifier": t.function(t.variableName),

  // System operations (::relations, etc.)
  ColonColon: t.special(t.keyword),
  "SysRelations/...": t.special(t.keyword),
  // ... all 11 system ops

  // Query options (:limit, :sort, etc.)
  "QueryOptionLimit QueryOptionOffset ...": t.keyword,

  // Column types
  "Int Float String Bool Bytes Uuid List Validity": t.typeName,

  // Identifiers (fallback)
  Identifier: t.variableName,

  // Brackets
  '"(" ")"': t.paren,
  '"[" "]"': t.squareBracket,
  '"{" "}"': t.brace,
});
```

**The key insight:** `highlight.js` is theme-independent. It says "a rule name
is a definition of a variable name" — it does NOT say "make it blue." The
theme file is what assigns colors to tags. This means we can reuse `highlight.js`
as-is and only write a new theme.

#### The existing dark theme (`src/theme.js`)

This file does two things:

1. **`cozoEditorTheme`** — An `EditorView.theme()` that styles the CodeMirror
   chrome (gutters, cursor, selection, tooltips, etc.) using Catppuccin Mocha
   colors.

2. **`cozoHighlightStyle`** — A `HighlightStyle.define()` that maps highlight
   tags to actual colors:

```javascript
// Example mappings (Catppuccin Mocha):
{ tag: t.keyword,                           color: "#cba6f7" },  // mauve
{ tag: t.integer,                           color: "#a6e3a1" },  // green
{ tag: t.string,                            color: "#a6e3a1" },  // green
{ tag: t.definition(t.variableName),        color: "#89b4fa" },  // blue, bold
{ tag: t.function(t.variableName),          color: "#89dceb" },  // sky
{ tag: t.special(t.keyword),                color: "#f38ba8" },  // red, bold
{ tag: t.lineComment,                       color: "#585b70" },  // surface2, italic
```

**We will NOT use this theme in the notebook.** We need a new System 7 light
theme. But the tag-to-color mapping structure is the template we'll follow.

#### Context-aware autocomplete (`src/complete.js`)

This 410-line file provides intelligent autocomplete by walking the Lezer parse
tree to determine what kind of code the cursor is inside:

```
Context Detection Algorithm:
────────────────────────────
1. Get the parse tree node at the cursor position
2. Walk UP the tree, checking parent node types
3. Return a context string:

   SystemOp / Sys*         → "system_op"    → suggest ::relations, ::columns, ...
   Opt* (not OptYield)     → "query_option" → suggest :limit, :sort, ...
   FixedRuleBody / Algo    → "algorithm"    → suggest PageRank, BFS, DFS, ...
   RuleHead / ruleHeadArgs → "rule_head"    → suggest count, sum, min, ...
   FunctionCall / ArgList  → "function_arg" → suggest all 67+ functions
   RelationSpec / ColSpec  → "relation_spec"→ suggest Int, Float, String, ...
   RuleBody / Conjunction  → "rule_body"    → suggest everything
   (fallback)              → "general"      → suggest everything

4. Also extract user-defined relation names from the document
   by scanning for :create/:put/*relation patterns
```

**Completion data includes:**
- 11 system operations (::relations, ::columns, etc.)
- 14 query options (:limit, :offset, :sort, etc.)
- 24 aggregation operators (count, sum, min, max, collect, etc.)
- 21 graph algorithms (PageRank, BFS, DFS, etc.)
- 67+ built-in functions (math, string, list, type, regex, etc.)
- 10 keywords (not, or, and, in, null, true, false, etc.)
- 8 column types (Int, Float, String, Bool, etc.)
- Dynamic user-defined relations (extracted from document text)

#### The main entry point (`src/index.js`)

This ties everything together into a single `cozoscript()` function:

```javascript
import { parser } from "./parser.js";
import { LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside }
  from "@codemirror/language";
import { syntaxHighlighting } from "@codemirror/language";
import { cozoHighlighting } from "./highlight.js";
import { cozoHighlightStyle, cozoEditorTheme } from "./theme.js";
import { cozoCompletions } from "./complete.js";

// 1. Define the language (parser + indent/fold rules)
export const cozoLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      cozoHighlighting,
      indentNodeProp.add({
        BracedQuery:   (cx) => cx.baseIndent + cx.unit,
        ListLiteral:   (cx) => cx.baseIndent + cx.unit,
        RelationSpec:  (cx) => cx.baseIndent + cx.unit,
        FixedRuleBody: (cx) => cx.baseIndent + cx.unit,
        ArgList:       (cx) => cx.baseIndent + cx.unit,
      }),
      foldNodeProp.add({
        BracedQuery:  foldInside,
        ListLiteral:  foldInside,
        RelationSpec: foldInside,
      }),
    ],
  }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", '"', "'"] },
  },
});

// 2. Bundle language + autocomplete + theme into one extension
export function cozoscript() {
  return new LanguageSupport(cozoLanguage, [
    cozoLanguage.data.of({ autocomplete: cozoCompletions }),
    syntaxHighlighting(cozoHighlightStyle),
    cozoEditorTheme,
  ]);
}
```

**Important:** The `cozoscript()` function bundles the Catppuccin theme. For the
notebook, we'll use `cozoLanguage` directly and provide our own theme.

---

## 3. The System 7 Light Theme — Design

We need a `HighlightStyle` and `EditorView.theme()` that feel like a Classic
Mac editor — think BBEdit or MPW Shell circa 1993.

### 3.1 Proposed Color Palette

The System 7 palette is constrained. Classic Mac OS used limited colors. Our
syntax highlighting should be subtle, readable on white/off-white backgrounds,
and avoid the saturated pastels of modern dark themes.

```
Proposed System 7 Syntax Colors:
─────────────────────────────────
Keywords:          #6a1b9a   (deep purple — distinct but muted)
Control keywords:  #6a1b9a   (same, bold)
Operators:         #333333   (dark gray — structural, not flashy)
Def operators:     #005599   (steel blue — :=, <~, <-)
Comments:          #888888   (gray, italic)
Strings:           #2e7d32   (forest green)
Numbers:           #1565c0   (medium blue)
Null:              #c62828   (dark red)
Booleans:          #e65100   (burnt orange)
Rule definitions:  #0d47a1   (navy blue, bold)
Function names:    #00695c   (dark teal)
Aggregation ops:   #f57f17   (dark gold)
Algorithm names:   #f57f17   (dark gold, bold)
System ops:        #c62828   (dark red, bold)
Type names:        #6a1b9a   (deep purple)
Entry marker (?):  #c62828   (dark red, bold)
Stored relations:  #c62828   (dark red, bold — the * prefix)
Variables:         #000000   (black — plain text)
Brackets:          #666666   (medium gray)
Escape sequences:  #00695c   (teal)
Errors:            #ffffff on #c62828 (white on red)

Editor Chrome:
─────────────
Background:        #f5f5f0   (warm off-white, matches --bg-code)
Gutter bg:         #ebebeb   (light gray)
Gutter text:       #999999   (muted)
Active line:       #e8e8e0   (slightly darker off-white)
Selection:         #bbd6f7   (classic Mac selection blue)
Cursor:            #000000   (black)
Tooltip bg:        #ffffff   (white)
Tooltip border:    #000000   (1px solid black — System 7 style)
Autocomplete sel:  #000000 bg, #ffffff text (inverted — classic Mac)
Font:              "IBM Plex Mono", monospace (13px)
```

### 3.2 Pseudocode for the System 7 Theme

```typescript
// file: frontend/src/editor/cozoscriptSystem7Theme.ts

import { HighlightStyle } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// ── System 7 palette ──────────────────────────────────
const s7 = {
  purple:      "#6a1b9a",
  steelBlue:   "#005599",
  navy:        "#0d47a1",
  mediumBlue:  "#1565c0",
  teal:        "#00695c",
  green:       "#2e7d32",
  gold:        "#f57f17",
  orange:      "#e65100",
  red:         "#c62828",
  black:       "#000000",
  darkGray:    "#333333",
  mediumGray:  "#666666",
  gray:        "#888888",
  lightGray:   "#999999",
  bgCode:      "#f5f5f0",
  bgGutter:    "#ebebeb",
  bgActive:    "#e8e8e0",
  bgSelection: "#bbd6f7",
  white:       "#ffffff",
};

// ── Editor chrome ─────────────────────────────────────
export const system7EditorTheme = EditorView.theme({
  "&": {
    color: s7.black,
    backgroundColor: s7.bgCode,
    fontSize: "13px",
  },
  ".cm-content": {
    caretColor: s7.black,
    fontFamily: "'IBM Plex Mono', monospace",
    padding: "8px 0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: s7.black,
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: s7.bgSelection,
  },
  ".cm-gutters": {
    backgroundColor: s7.bgGutter,
    color: s7.lightGray,
    border: "none",
    borderRight: "1px solid #cccccc",
  },
  ".cm-activeLineGutter": {
    backgroundColor: s7.bgActive,
    color: s7.darkGray,
  },
  ".cm-activeLine": {
    backgroundColor: s7.bgActive,
  },
  // System 7 tooltips: solid border, no rounded corners
  ".cm-tooltip": {
    backgroundColor: s7.white,
    color: s7.black,
    border: "1px solid #000",
    boxShadow: "2px 2px 0px #000",
    borderRadius: "0px",
  },
  // Autocomplete: inverted selection (classic Mac)
  ".cm-tooltip-autocomplete": {
    "& > ul > li": {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: "12px",
    },
    "& > ul > li[aria-selected]": {
      backgroundColor: s7.black,
      color: s7.white,
    },
  },
  ".cm-completionLabel": { color: s7.black },
  ".cm-completionDetail": { color: s7.mediumGray, fontStyle: "italic" },
  ".cm-completionMatchedText": {
    textDecoration: "none",
    fontWeight: "bold",
  },
  ".cm-panels": {
    backgroundColor: s7.bgGutter,
    color: s7.black,
    borderTop: "1px solid #000",
  },
  ".cm-searchMatch": {
    backgroundColor: "#fff59d",
  },
  ".cm-searchMatch.cm-searchMatch-selected": {
    backgroundColor: "#fff176",
    outline: "1px solid #000",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: s7.bgGutter,
    color: s7.mediumGray,
    border: "1px solid #999",
  },
}, { dark: false });

// ── Syntax highlighting ───────────────────────────────
export const system7HighlightStyle = HighlightStyle.define([
  // Keywords
  { tag: t.keyword,        color: s7.purple, fontWeight: "bold" },
  { tag: t.controlKeyword, color: s7.purple, fontWeight: "bold" },

  // Operators
  { tag: t.definitionOperator, color: s7.steelBlue },
  { tag: t.compareOperator,    color: s7.darkGray },
  { tag: t.arithmeticOperator, color: s7.darkGray },

  // Literals
  { tag: t.null,    color: s7.red },
  { tag: t.bool,    color: s7.orange },
  { tag: t.integer, color: s7.mediumBlue },
  { tag: t.float,   color: s7.mediumBlue },
  { tag: t.string,  color: s7.green },
  { tag: t.escape,  color: s7.teal },

  // Names
  { tag: t.definition(t.variableName),
    color: s7.navy, fontWeight: "bold" },
  { tag: t.function(t.variableName),   color: s7.teal },
  { tag: t.special(t.variableName),
    color: s7.red, fontWeight: "bold" },
  { tag: t.standard(t.function(t.variableName)),
    color: s7.gold },
  { tag: t.standard(t.className),
    color: s7.gold, fontWeight: "bold" },
  { tag: t.variableName, color: s7.black },
  { tag: t.typeName,     color: s7.purple },

  // System ops
  { tag: t.special(t.keyword),
    color: s7.red, fontWeight: "bold" },

  // Comments
  { tag: t.lineComment,
    color: s7.gray, fontStyle: "italic" },

  // Errors
  { tag: t.invalid,
    color: s7.white, backgroundColor: s7.red },

  // Brackets
  { tag: t.paren,         color: s7.mediumGray },
  { tag: t.squareBracket, color: s7.mediumGray },
  { tag: t.brace,         color: s7.mediumGray },
]);
```

---

## 4. Architecture of the Integration

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  NotebookCellCard.tsx                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              CozoScriptEditor (new)                   │  │
│  │                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │ CodeMirror 6│  │ lang-cozo-  │  │ System 7     │  │  │
│  │  │ EditorView  │  │ script      │  │ Theme        │  │  │
│  │  │             │  │             │  │              │  │  │
│  │  │ - lineNums  │  │ - Lezer     │  │ - Editor     │  │  │
│  │  │ - history   │  │   parser    │  │   chrome     │  │  │
│  │  │ - brackets  │  │ - highlight │  │ - Highlight  │  │  │
│  │  │ - fold      │  │   tags      │  │   colors     │  │  │
│  │  │ - search    │  │ - complete  │  │              │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  │                                                       │  │
│  │  State bridge:                                        │  │
│  │    Redux source ──▸ EditorState                       │  │
│  │    EditorState  ──▸ dispatch(setCellSource)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Output area (unchanged)                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Component Design

We'll create a new React component `CozoScriptEditor` that wraps CodeMirror 6:

```
CozoScriptEditor Props:
─────────────────────────
  value: string           // The CozoScript source from Redux
  onChange: (v: string)   // Callback when text changes
  onRun: () => void       // Shift+Enter handler
  onRunAndInsert: () => void  // Alt/Ctrl+Enter handler
  onBlur: () => void      // Persist on blur
  onFocus: () => void     // Set active cell
  placeholder?: string    // Placeholder text
  autoFocus?: boolean     // Focus on mount
```

### 4.3 The State Bridge Problem

CodeMirror 6 manages its own internal state (`EditorState`). React/Redux also
manages state. We need to synchronize them without creating infinite loops.

```
The danger:
  Redux updates source ──▸ we push new doc to CM ──▸ CM fires onChange
  ──▸ we dispatch setCellSource ──▸ Redux updates ──▸ loop!

The solution:
  Use a "guard" flag. When we programmatically update CM from Redux,
  skip the onChange dispatch.

Pseudocode:
───────────
const updatingFromProps = useRef(false);

// When Redux value changes externally:
useEffect(() => {
  if (viewRef.current) {
    const currentDoc = viewRef.current.state.doc.toString();
    if (currentDoc !== value) {
      updatingFromProps.current = true;
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: value }
      });
      updatingFromProps.current = false;
    }
  }
}, [value]);

// In the update listener:
EditorView.updateListener.of((update) => {
  if (update.docChanged && !updatingFromProps.current) {
    onChange(update.state.doc.toString());
  }
});
```

---

## 5. Step-by-Step Implementation Plan

### Phase 1: Install Dependencies

Add CodeMirror 6 and the lang-cozoscript package to the notebook frontend:

```bash
cd 2026-03-14--cozodb-editor/frontend

# Core CodeMirror packages
npm install @codemirror/view @codemirror/state @codemirror/language \
  @codemirror/commands @codemirror/autocomplete @codemirror/search \
  @codemirror/lint

# Lezer packages (needed by lang-cozoscript)
npm install @lezer/highlight @lezer/lr

# The language package (local dependency)
npm install ../../../2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript
```

Alternatively, if the lang-cozoscript package causes issues as a file dependency,
copy the source files directly into the frontend:

```
frontend/src/editor/codemirror/
  ├── parser.js           (copy from lang-cozoscript/src/)
  ├── parser.terms.js     (copy)
  ├── highlight.js        (copy)
  ├── complete.js         (copy)
  └── cozoscript.grammar  (copy, for reference)
```

### Phase 2: Create the System 7 Theme

Create the theme file at `frontend/src/editor/cozoscriptSystem7Theme.ts`.
Follow the design from Section 3.2 above.

### Phase 3: Create the CozoScriptEditor Component

Create `frontend/src/editor/CozoScriptEditor.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine,
         drawSelection, highlightActiveLineGutter,
         placeholder as cmPlaceholder } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, bracketMatching, foldGutter,
         foldKeymap } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap, autocompletion,
         completionKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

// From lang-cozoscript (reuse grammar + highlight + autocomplete)
import { cozoLanguage } from "lang-cozoscript";   // or local copy
import { cozoCompletions } from "lang-cozoscript";

// Our System 7 theme
import { system7EditorTheme, system7HighlightStyle }
  from "./cozoscriptSystem7Theme";

interface CozoScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onRunAndInsert?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CozoScriptEditor({
  value, onChange, onRun, onRunAndInsert, onBlur, onFocus,
  placeholder, autoFocus
}: CozoScriptEditorProps) {

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const updatingFromProps = useRef(false);

  // ── Mount CodeMirror ────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const runKeymap = keymap.of([
      {
        key: "Shift-Enter",
        run: () => { onRun?.(); return true; },
      },
      {
        key: "Alt-Enter",
        run: () => { onRunAndInsert?.(); return true; },
      },
      {
        key: "Ctrl-Enter",
        run: () => { onRunAndInsert?.(); return true; },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        // Core editor features
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        history(),
        bracketMatching(),
        closeBrackets(),
        foldGutter(),
        highlightSelectionMatches(),
        autocompletion(),

        // Keymaps (custom first, then defaults)
        runKeymap,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
        ]),

        // CozoScript language (grammar + autocomplete)
        cozoLanguage,
        cozoLanguage.data.of({ autocomplete: cozoCompletions }),

        // System 7 theme (NOT the Catppuccin one)
        syntaxHighlighting(system7HighlightStyle),
        system7EditorTheme,

        // Placeholder text
        placeholder ? cmPlaceholder(placeholder) : [],

        // State bridge: CM → React/Redux
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !updatingFromProps.current) {
            onChange(update.state.doc.toString());
          }
        }),

        // Blur/Focus handlers
        EditorView.domEventHandlers({
          blur: () => { onBlur?.(); },
          focus: () => { onFocus?.(); },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    if (autoFocus) {
      view.focus();
    }

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);  // Mount once only

  // ── Sync Redux → CodeMirror (external updates) ─────
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      updatingFromProps.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
      updatingFromProps.current = false;
    }
  }, [value]);

  return <div ref={containerRef} className="mac-codemirror-container" />;
}
```

### Phase 4: Wire into NotebookCellCard

Replace the `<textarea>` in `NotebookCellCard.tsx`:

```tsx
// Before (line ~228):
<textarea
  ref={editorRef}
  className="mac-cell-editor"
  value={resolvedCell.source}
  onChange={(e) => dispatch(setCellSource({
    cellId: resolvedCell.id, source: e.target.value
  }))}
  ...
/>

// After:
<CozoScriptEditor
  value={resolvedCell.source}
  onChange={(source) => dispatch(setCellSource({
    cellId: resolvedCell.id, source
  }))}
  onRun={() => dispatch(runNotebookCellById(resolvedCell.id))}
  onRunAndInsert={() => onRunAndInsertBelow(resolvedCell.id)}
  onBlur={handleEditorBlur}
  onFocus={() => dispatch(setActiveCellId(resolvedCell.id))}
  placeholder="-- Enter Datalog query... (Shift+Enter to run)"
  autoFocus={isActive}
/>
```

### Phase 5: CSS Integration

Add CodeMirror container styles to `notebook.css`:

```css
/* CodeMirror container inside cell body */
.mac-codemirror-container {
  border: 1px solid var(--border-field);
  background: var(--bg-code);
  min-height: 28px;
}

.mac-codemirror-container .cm-editor {
  font-family: "IBM Plex Mono", monospace;
  font-size: 13px;
}

/* Remove CodeMirror's default focus outline —
   the cell card already shows active state */
.mac-codemirror-container .cm-editor.cm-focused {
  outline: none;
}

/* Autocomplete tooltip should match System 7 buttons */
.mac-codemirror-container .cm-tooltip-autocomplete {
  font-family: "IBM Plex Sans", "Geneva", sans-serif;
}
```

### Phase 6: Remove the Auto-Resize useEffect

The old `<textarea>` needed manual height calculation. CodeMirror auto-sizes
by default. Remove the `useEffect` that sets `editorRef.current.style.height`
(currently in NotebookCellCard.tsx at lines 105–111).

### Phase 7: Handle Markdown Cells

Markdown cells should NOT use CodeMirror — they're plain text. Keep the
`<textarea>` for markdown cells and only use `CozoScriptEditor` for code cells:

```tsx
{isCode ? (
  <CozoScriptEditor ... />
) : editing ? (
  <textarea
    ref={editorRef}
    className="mac-cell-editor"
    ...
  />
) : (
  <div className="mac-md-preview" ... />
)}
```

---

## 6. What Can Be Reused vs. What Needs New Code

| Component | Reuse? | Notes |
|-----------|--------|-------|
| `cozoscript.grammar` | **Yes, as-is** | The grammar defines the language, not the editor |
| `parser.js` (generated) | **Yes, as-is** | Generated LR tables, language-specific |
| `parser.terms.js` | **Yes, as-is** | Token IDs |
| `highlight.js` (styleTags) | **Yes, as-is** | Maps nodes to abstract tags, theme-independent |
| `complete.js` (autocomplete) | **Yes, as-is** | Context detection and completion data |
| `theme.js` (Catppuccin) | **No** | Replace with System 7 light theme |
| `index.js` (entry point) | **Partially** | Use `cozoLanguage` but not `cozoscript()` wrapper |

**New code to write:**
1. `cozoscriptSystem7Theme.ts` — System 7 editor theme + highlight style (~100 lines)
2. `CozoScriptEditor.tsx` — React wrapper component with Redux state bridge (~100 lines)
3. CSS additions to `notebook.css` — Container styling (~20 lines)
4. Modifications to `NotebookCellCard.tsx` — Replace textarea with new component (~10 line change)

---

## 7. Dependency Graph

```
New files to create:
────────────────────
frontend/src/editor/CozoScriptEditor.tsx        (React component)
frontend/src/editor/cozoscriptSystem7Theme.ts   (Theme)

Files to copy or link (from lang-cozoscript/src/):
──────────────────────────────────────────────────
frontend/src/editor/codemirror/parser.js
frontend/src/editor/codemirror/parser.terms.js
frontend/src/editor/codemirror/highlight.js
frontend/src/editor/codemirror/complete.js
frontend/src/editor/codemirror/index.js          (modified: no theme)

Files to modify:
────────────────
frontend/package.json                             (add @codemirror/* deps)
frontend/src/notebook/NotebookCellCard.tsx        (replace textarea)
frontend/src/notebook/notebook.css                (add .mac-codemirror-container)

npm packages to add:
────────────────────
@codemirror/view        @codemirror/state
@codemirror/language    @codemirror/commands
@codemirror/autocomplete @codemirror/search
@lezer/highlight        @lezer/lr
```

---

## 8. Testing Strategy

### 8.1 Manual Smoke Tests

1. **Highlighting check:** Type a query like
   `?[x, count(y)] := *friends{person: x, friend: y} :limit 10`
   and verify:
   - `?` is red+bold (entry marker)
   - `count` is gold (aggregation)
   - `*friends` has red `*` (stored relation)
   - `:=` is steel blue (definition operator)
   - `:limit` is purple+bold (query option)
   - `10` is blue (number)

2. **Autocomplete check:** Type `::` and verify system operations appear. Type
   inside a rule body and press Tab — verify functions and keywords appear.

3. **State sync check:** Type code, run the cell, verify the query that runs
   matches what was typed. Edit after running, verify the output is marked dirty.

4. **Keyboard shortcuts:** Shift+Enter should run. Alt+Enter should run and
   insert. Ctrl+Z should undo.

5. **Multi-cell check:** Create multiple code cells. Verify each has independent
   editor state (undo history, cursor position).

6. **Markdown cells:** Verify they still use the textarea, not CodeMirror.

### 8.2 Edge Cases

- Empty cell (should show placeholder)
- Very long single-line query (horizontal scroll)
- Cell with 100+ lines (performance)
- Paste from clipboard (should trigger highlighting)
- Cell source updated externally (AI fix applied — verify CM updates)

---

## 9. Potential Pitfalls and Solutions

### Pitfall 1: Vite Pre-bundling Cache

Vite aggressively caches pre-bundled dependencies. If you change the
lang-cozoscript package, you must clear the cache:

```bash
rm -rf node_modules/.vite
```

The Makefile in the treesitter project already handles this. Consider adding a
similar script to the notebook frontend.

### Pitfall 2: Multiple EditorView Instances

Each notebook cell creates its own `EditorView`. With 20+ cells, this means 20+
parser instances. Lezer parsers are lightweight (they share parse tables), so
this should be fine — but monitor memory if cells exceed 50.

### Pitfall 3: Focus Management

When the user clicks a cell, Redux sets `activeCellId`. The old textarea had
`autoFocus` on the active cell. With CodeMirror, you need to call
`viewRef.current.focus()` when the cell becomes active. Use a `useEffect`
watching `isActive`:

```tsx
useEffect(() => {
  if (autoFocus && viewRef.current) {
    viewRef.current.focus();
  }
}, [autoFocus]);
```

### Pitfall 4: Controlled vs. Uncontrolled

CodeMirror 6 is inherently "uncontrolled" — it manages its own state. The
React component must bridge this carefully. The `updatingFromProps` guard
(Section 4.3) is critical. Without it, you get infinite update loops or
cursor position resets.

### Pitfall 5: SSR and Tree-Shaking

CodeMirror 6 accesses `document` and `window` on import. If the frontend ever
moves to SSR, CodeMirror imports must be dynamically loaded. For now (Vite SPA),
this isn't an issue.

---

## 10. CozoScript Language Quick Reference

For the intern's benefit, here is a cheat sheet of CozoScript syntax — the
things the editor will highlight:

### Rule types

```cozoscript
# Inline rule (standard Datalog)
rule_name[arg1, arg2] := body_clause, another_clause

# Fixed rule (graph algorithms)
result[node, rank] <~ PageRank(*edges[])

# Const rule (literal data)
data[x, y] <- [[1, 2], [3, 4], [5, 6]]
```

### Entry point

```cozoscript
# The ? rule is the query entry point (what gets returned)
?[name, age] := *people{name, age}, age > 21
```

### Stored relations

```cozoscript
# Read from stored relation
*people{name, age}
*people[name, age]

# Create a stored relation
:create people {name: String => age: Int, email: String}
```

### Aggregations

```cozoscript
?[dept, count(emp), mean(salary)] :=
  *employees{dept, emp, salary}
```

### Query options

```cozoscript
:limit 10
:sort -age, +name
:assert some
```

### System operations

```cozoscript
::relations
::columns people
::remove old_table
```

---

## 11. API Reference: Key CodeMirror 6 Types

For the intern's reference, here are the main CodeMirror 6 APIs used:

### EditorView

The main editor instance. Created with a parent DOM element and initial state.

```typescript
new EditorView({ state, parent: domElement })

// Key methods:
view.state           // Current EditorState
view.dispatch(tr)    // Apply a transaction (state change)
view.focus()         // Focus the editor
view.destroy()       // Clean up (call in useEffect cleanup)
```

### EditorState

Immutable state object. Contains the document, selection, and extensions.

```typescript
EditorState.create({ doc: "initial text", extensions: [...] })

// Key properties:
state.doc            // The document (a Text object)
state.doc.toString() // Get full text as string
```

### LRLanguage

Defines a language from a Lezer parser:

```typescript
LRLanguage.define({
  parser: parser.configure({ props: [...] }),
  languageData: {
    commentTokens: { line: "#" },
    closeBrackets: { brackets: ["(", "[", "{", '"', "'"] },
  },
})
```

### HighlightStyle

Maps highlight tags to CSS properties:

```typescript
HighlightStyle.define([
  { tag: tags.keyword, color: "#6a1b9a", fontWeight: "bold" },
  { tag: tags.string,  color: "#2e7d32" },
  // ...
])
```

### EditorView.theme()

Styles editor chrome (gutters, cursors, tooltips, etc.):

```typescript
EditorView.theme({
  "&": { backgroundColor: "#f5f5f0" },
  ".cm-gutters": { backgroundColor: "#ebebeb" },
  ".cm-tooltip": { border: "1px solid #000" },
}, { dark: false })
```

### EditorView.updateListener

React to editor state changes (the bridge from CM to React):

```typescript
EditorView.updateListener.of((update) => {
  if (update.docChanged) {
    // The document changed — sync to React state
    const newText = update.state.doc.toString();
    onChange(newText);
  }
})
```

---

## 12. File Reference Summary

### Source system (lang-cozoscript — reuse these)

| File | Size | Purpose |
|------|------|---------|
| `lang-cozoscript/src/cozoscript.grammar` | 396 lines | Lezer grammar definition |
| `lang-cozoscript/src/parser.js` | ~24 KB | Generated LR parser |
| `lang-cozoscript/src/parser.terms.js` | ~4 KB | Generated token IDs |
| `lang-cozoscript/src/highlight.js` | 73 lines | styleTags mappings |
| `lang-cozoscript/src/complete.js` | 410 lines | Context-aware autocomplete |
| `lang-cozoscript/src/index.js` | 50 lines | Language definition entry point |
| `lang-cozoscript/src/theme.js` | 163 lines | Catppuccin theme (reference only) |

### Target system (notebook frontend — modify these)

| File | Purpose |
|------|---------|
| `frontend/package.json` | Add CodeMirror dependencies |
| `frontend/src/notebook/NotebookCellCard.tsx` | Replace textarea with CozoScriptEditor |
| `frontend/src/notebook/notebook.css` | Add CodeMirror container styles |

### New files to create

| File | Purpose | ~Size |
|------|---------|-------|
| `frontend/src/editor/CozoScriptEditor.tsx` | React wrapper for CodeMirror | ~100 lines |
| `frontend/src/editor/cozoscriptSystem7Theme.ts` | System 7 highlight + editor theme | ~100 lines |
| `frontend/src/editor/codemirror/` (directory) | Copied/linked lang-cozoscript sources | ~500 lines total |
