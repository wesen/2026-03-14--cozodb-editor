---
Title: "Implementation Diary — CozoScript Syntax Highlighting Integration"
Ticket: COZODB-010
Status: active
Topics:
    - syntax-highlighting
    - codemirror
    - frontend
    - cozodb
DocType: analysis
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Chronological diary of the analysis and planning work for integrating CozoScript syntax highlighting into the notebook editor."
LastUpdated: 2026-03-19T22:48:36.923474517-04:00
WhatFor: ""
WhenToUse: ""
---

# Implementation Diary — CozoScript Syntax Highlighting Integration

## 2026-03-19 — Initial Analysis and Planning

### What I did

Performed a thorough analysis of two separate systems that need to be connected:

1. **The CozoDB Notebook frontend** (`2026-03-14--cozodb-editor/frontend/`) — a
   React 19 + Redux Toolkit application with a System 7 / Classic Mac OS visual
   theme. Currently uses plain `<textarea>` elements for code editing.

2. **The lang-cozoscript package** (`2026-02-24--cozoscript-treesitter-autocomplete/lang-cozoscript/`) — a
   complete CodeMirror 6 language support package with Lezer parser, syntax
   highlighting (73 tag mappings), context-aware autocomplete (200+ completions),
   and a Catppuccin Mocha dark theme.

### Key findings

**The textarea situation.** In `NotebookCellCard.tsx`, the code cell editor is a
React controlled `<textarea>` (line 228). It dispatches `setCellSource` on every
keystroke, auto-resizes via a `useEffect` that reads `scrollHeight`, and handles
keyboard shortcuts for run (Shift+Enter) and run-and-insert (Alt/Ctrl+Enter).
The only "highlighting" is comment detection in `PadEditor.jsx` which colors
lines starting with `#??` or `//`.

**The lang-cozoscript package is production-ready.** It was already built and
tested against 8 example files and 27 inline test cases. The Lezer grammar
covers the full CozoScript language: system operations, inline/fixed/const
rules, aggregations, algorithms, expressions with full operator precedence,
query options, and relation specs. The autocomplete engine walks the parse tree
to detect 7 different cursor contexts and offers context-appropriate completions.

**The theme mismatch.** The existing theme is Catppuccin Mocha (dark). The
notebook uses System 7 (light). The key insight is that `highlight.js` (which
maps parse tree nodes to highlight tags) is completely theme-independent. Only
`theme.js` (which maps tags to colors) needs to be replaced. This is exactly
how CodeMirror 6 was designed to work — the tagging layer is separate from the
coloring layer.

**The React-CodeMirror state bridge.** This is the trickiest part of the
integration. CodeMirror 6 manages its own immutable `EditorState`. React/Redux
also wants to own the state via `resolvedCell.source`. We need bidirectional
sync without infinite loops. The standard solution is a guard ref
(`updatingFromProps`) that suppresses the onChange callback when we're pushing
Redux state into CodeMirror.

**No dependencies to add.** The notebook frontend currently has zero CodeMirror
packages. We'll need to add 8 npm packages: `@codemirror/view`, `state`,
`language`, `commands`, `autocomplete`, `search`, plus `@lezer/highlight` and
`@lezer/lr`.

### Decisions made

1. **Copy lang-cozoscript source files** into the frontend rather than using a
   `file:` dependency. This avoids Vite cache issues and makes the frontend
   self-contained.

2. **Create a new System 7 light theme** rather than adapting the Catppuccin
   theme. The color palettes are too different for adaptation to make sense.
   The new palette draws from classic Mac editor aesthetics (BBEdit, MPW Shell)
   with muted, readable colors on off-white backgrounds.

3. **Only replace the code cell textarea.** Markdown cells keep their existing
   `<textarea>` — they don't need syntax highlighting.

4. **Keep the same keyboard shortcuts.** Shift+Enter to run, Alt/Ctrl+Enter to
   run and insert below. These will be registered as CodeMirror keymaps.

### What's tricky

- **Focus management.** The notebook has an `activeCellId` concept where only
  one cell is focused at a time. When a cell becomes active, its editor needs to
  receive focus. With a textarea this was `editorRef.current.focus()`. With
  CodeMirror, we need `viewRef.current.focus()` — but we need to be careful
  not to steal focus during initial render of non-active cells.

- **The auto-resize useEffect.** The current code manually sets textarea height
  from `scrollHeight`. CodeMirror handles this automatically, but we need to
  make sure to remove the old useEffect to avoid it trying to operate on a
  DOM element that no longer exists (the textarea ref will be null for code cells).

- **Autocomplete tooltip styling.** CodeMirror's autocomplete dropdown renders
  as a floating tooltip. It needs to look like a System 7 menu — black border,
  pixel shadow, inverted (black bg / white text) selection — not a modern
  rounded dropdown.

### What worked well

The separation of concerns in the lang-cozoscript package is excellent. Because
the Lezer highlight tags are an abstract layer between the parser and the theme,
we can swap themes without touching any of the grammar, highlighting, or
autocomplete code. This is a direct benefit of CodeMirror 6's architecture.

### Artifacts produced

- **Design document:** `design-doc/01-cozoscript-syntax-highlighting-complete-design-and-implementation-guide.md`
  — A comprehensive 12-section guide covering both systems, the integration
  architecture, pseudocode for all new files, step-by-step implementation plan,
  testing strategy, and pitfall documentation. Written for an intern audience.

- **This diary** — Chronological record of work.

### Next steps

1. Install CodeMirror dependencies in the notebook frontend
2. Copy lang-cozoscript source files
3. Create the System 7 theme file
4. Create the CozoScriptEditor React component
5. Wire into NotebookCellCard, replacing the textarea
6. Add CSS for CodeMirror container
7. Test highlighting, autocomplete, keyboard shortcuts, and state sync
