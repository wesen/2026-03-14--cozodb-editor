# Tasks

## TODO

- [x] Add tasks here

- [x] Install CodeMirror 6 npm dependencies (@codemirror/view, state, language, commands, autocomplete, search; @lezer/highlight, @lezer/lr)
- [x] Copy lang-cozoscript source files (parser.js, parser.terms.js, highlight.js, complete.js, index.js) into frontend/src/editor/codemirror/
- [x] Create System 7 light theme (cozoscriptSystem7Theme.ts) with EditorView.theme() and HighlightStyle.define()
- [x] Create CozoScriptEditor React component with CodeMirror 6, state bridge (updatingFromProps guard), and keyboard shortcut keymaps
- [x] Replace textarea with CozoScriptEditor in NotebookCellCard.tsx (code cells only, keep textarea for markdown)
- [x] Add .mac-codemirror-container CSS styles to notebook.css matching System 7 chrome
- [x] Remove auto-resize useEffect (CodeMirror handles sizing automatically)
- [x] Test: highlighting, autocomplete, keyboard shortcuts, state sync, multi-cell focus, markdown cells unaffected
