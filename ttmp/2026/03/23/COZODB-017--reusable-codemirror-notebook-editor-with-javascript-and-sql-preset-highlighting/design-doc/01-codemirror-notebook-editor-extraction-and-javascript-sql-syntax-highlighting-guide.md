---
Title: CodeMirror notebook editor extraction and JavaScript/SQL syntax highlighting guide
Ticket: COZODB-017
Status: active
Topics:
    - frontend
    - codemirror
    - notebook
    - javascript
    - sqlite
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: frontend/src/editor/CozoScriptEditor.tsx
      Note: Existing Cozo-specific CodeMirror editor that should become the reusable baseline
    - Path: frontend/src/notebook/experienceConfig.ts
      Note: Shared notebook experience contract where the editor component is injected
    - Path: frontend/src/notebook/NotebookCellCardView.tsx
      Note: Notebook cell renderer that swaps between preset editor and textarea fallback
    - Path: frontend/src/notebook/currentCozoConfig.ts
      Note: Current preset config that already opts into a custom editor
    - Path: frontend/src/notebook/currentJavaScriptConfig.ts
      Note: JavaScript preset config that should opt into the reusable editor
    - Path: frontend/src/notebook/currentSQLiteConfig.ts
      Note: SQLite preset config that should opt into the reusable editor
ExternalSources: []
Summary: Detailed design and implementation plan for extracting a reusable CodeMirror notebook editor and wiring JavaScript and SQLite presets to it.
LastUpdated: 2026-03-23T10:46:00-04:00
WhatFor: Explain the editor architecture, the extraction strategy, and the implementation sequence for adding syntax highlighting to JavaScript and SQLite notebook presets without duplicating the Cozo editor.
WhenToUse: Use when implementing this ticket, reviewing the editor architecture, or onboarding an intern to the notebook preset editor system.
---

# CodeMirror notebook editor extraction and JavaScript/SQL syntax highlighting guide

## Executive Summary

The notebook package already has the right extension seam for custom editors, but only one preset actually uses it. Cozo injects a CodeMirror editor through the notebook experience config, while JavaScript and SQLite still fall back to the plain `textarea`. That means the architecture is good, but the implementation is inconsistent.

This ticket makes the editor system match the preset system. We will extract the current Cozo editor into a reusable CodeMirror notebook editor primitive, keep Cozo as one language-specific adapter, add JavaScript and SQL adapters, and validate the result in Storybook and in the live preset apps. The main rule is simple: the notebook package should own the editor shell and keyboard behavior, while presets should only provide language extensions, placeholder text, and optional renderer details.

## Problem Statement

Right now the notebook frontend supports custom code editors through the experience config in [frontend/src/notebook/experienceConfig.ts](../../../../../../frontend/src/notebook/experienceConfig.ts), and [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx) already respects that contract. However, only [frontend/src/notebook/currentCozoConfig.ts](../../../../../../frontend/src/notebook/currentCozoConfig.ts) provides a `CodeCellEditor`. JavaScript and SQLite only set `codeFenceLanguage`, which affects rendering but does not change the editing experience.

That leaves the system in an awkward partial state:

- Cozo has proper syntax highlighting and CodeMirror keyboard behavior.
- JavaScript and SQLite still use a plain `textarea`.
- The current Cozo editor in [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx) mixes three concerns together:
  - notebook editor shell behavior,
  - CodeMirror setup and state syncing,
  - Cozo-specific language and completion wiring.

This is exactly the kind of code that starts reasonable and then becomes expensive to extend. If we add JS and SQL by copying the Cozo editor, we will produce three similar-but-not-identical editor components that will drift over time.

## Current Architecture

The current editor flow looks like this:

```text
Current*PresetConfig.ts
  -> experienceConfig.CodeCellEditor
  -> NotebookApp
  -> NotebookCellCardView
  -> either custom editor OR textarea fallback
```

The code path is:

```text
Preset config
  frontend/src/notebook/currentCozoConfig.ts
  frontend/src/notebook/currentJavaScriptConfig.ts
  frontend/src/notebook/currentSQLiteConfig.ts

Notebook experience contract
  frontend/src/notebook/experienceConfig.ts

Notebook cell rendering
  frontend/src/notebook/NotebookCellCardView.tsx

Current custom editor
  frontend/src/editor/CozoScriptEditor.tsx
```

That means the notebook package already has the correct inversion point. The missing piece is a reusable editor primitive.

## Proposed Solution

We will split the current Cozo editor into two layers.

### Layer 1: Shared notebook CodeMirror editor primitive

This component should own:

- CodeMirror mount lifecycle
- React-to-CodeMirror value synchronization
- CodeMirror-to-React change propagation
- notebook keyboard shortcuts:
  - `Shift+Enter` -> run
  - `Alt+Enter` -> run and insert
  - `Ctrl+Enter` -> run and insert
- focus and blur propagation
- placeholder handling
- theme wiring common to notebook editors
- optional language extension and optional autocomplete wiring

This component should not know anything about Cozo, JavaScript, or SQL.

### Layer 2: Language-specific adapters

These should be thin wrappers or factory helpers that provide:

- language extension
- optional completion source
- language-specific placeholder defaults only if needed
- any language-specific theme tweaks if truly necessary

Expected adapters after this ticket:

- Cozo adapter
- JavaScript adapter
- SQLite adapter

### Preset integration

Each preset config should inject its editor explicitly:

- Cozo -> Cozo adapter
- JavaScript -> JavaScript adapter
- SQLite -> SQLite adapter

The notebook shell should remain unchanged.

## Design Decisions

### 1. Keep preset injection, do not hardcode by language string

We should not make [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx) choose editors based on `codeFenceLanguage` or notebook language. The preset system already exists and works. The editor should continue to be injected through `experienceConfig.CodeCellEditor`.

Reason:

- keeps notebook core generic
- keeps language policy inside presets
- matches the overall packaging direction of the project

### 2. Extract the CodeMirror shell, not three independent editors

The current Cozo editor already solved important notebook behavior:

- stable callback refs
- focus synchronization
- preventing duplicate enter handling
- mount-once CodeMirror lifecycle

Those behaviors should not be reimplemented per language.

Reason:

- reduces drift
- reduces bugs in keyboard handling
- makes adding a fourth language materially easier

### 3. Keep Cozo-specific language support as a wrapper, not a special case in the generic editor

Cozo has custom grammar and completions in [frontend/src/editor/codemirror/index.js](../../../../../../frontend/src/editor/codemirror/index.js). That should stay outside the generic editor. The generic editor should accept language extensions and optional autocomplete sources rather than importing Cozo internals.

Reason:

- makes the generic component reusable
- makes language behavior declarative
- keeps future language additions local

### 4. Add editor-level Storybook stories, not just app-level stories

We already have preset app stories, but they mostly validate integration. They do not isolate the editor enough to catch problems in focus behavior, placeholder rendering, or basic configuration.

We should add stories for the reusable editor primitive and the language adapters.

Reason:

- faster validation loop than running the full app
- clearer regression surface for future refactors
- better onboarding artifact for interns

## Detailed Implementation Plan

### Step 1: Extract a generic notebook CodeMirror editor

Create a shared editor component in the editor layer, likely something like:

- `frontend/src/editor/NotebookCodeMirrorEditor.tsx`

Expected prop shape:

```ts
interface NotebookCodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onRunAndInsert?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  extensions?: Extension[];
}
```

Possible pseudocode:

```ts
function NotebookCodeMirrorEditor(props) {
  keep stable refs for callbacks
  mount CodeMirror once
  install notebook keybindings
  install shared theme
  install passed-in language extensions
  bridge doc changes to React
  bridge prop changes back into CodeMirror
  focus view when autoFocus becomes true
}
```

### Step 2: Move shared visual theme into a reusable editor theme module

The current System 7 editor theme is already mostly shared UI styling even though it lives in a Cozo-named file:

- `frontend/src/editor/cozoscriptSystem7Theme.ts`

We should rename or split this into something notebook-generic, for example:

- `frontend/src/editor/notebookCodeMirrorTheme.ts`

If Cozo-specific highlighting colors are mixed in, separate:

- generic editor chrome
- language-specific highlight style

### Step 3: Rewrite Cozo editor as an adapter

The current Cozo editor should become a thin wrapper around the generic editor:

```ts
export function CozoScriptEditor(props) {
  return (
    <NotebookCodeMirrorEditor
      {...props}
      extensions={[
        cozoLanguage,
        cozoLanguage.data.of({ autocomplete: cozoCompletions }),
        syntaxHighlighting(cozoHighlightStyle),
      ]}
    />
  );
}
```

This step is important because it proves the extraction worked before adding new languages.

### Step 4: Add JavaScript editor adapter

Use CodeMirror’s JavaScript language package.

Likely package:

- `@codemirror/lang-javascript`

Expected adapter:

- `frontend/src/editor/JavaScriptNotebookEditor.tsx`

It should use the shared editor shell plus a JavaScript language extension.

### Step 5: Add SQLite editor adapter

Use CodeMirror’s SQL language package.

Likely package:

- `@codemirror/lang-sql`

Expected adapter:

- `frontend/src/editor/SQLiteNotebookEditor.tsx`

It should use the shared editor shell plus an SQL language extension.

### Step 6: Wire preset configs

Update:

- [frontend/src/notebook/currentJavaScriptConfig.ts](../../../../../../frontend/src/notebook/currentJavaScriptConfig.ts)
- [frontend/src/notebook/currentSQLiteConfig.ts](../../../../../../frontend/src/notebook/currentSQLiteConfig.ts)

Each should set `CodeCellEditor` explicitly, just like Cozo already does.

### Step 7: Add Storybook coverage

Recommended stories:

- reusable generic editor primitive
- Cozo adapter
- JavaScript adapter
- SQLite adapter
- at least one notebook card/app story confirming the preset wiring works

Story scenarios:

- empty editor with placeholder
- active editor with highlighted code
- run shortcut path present
- long multi-line example
- error-prone or edge syntax sample

### Step 8: Validate and document

Run:

```bash
cd frontend && npm test
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
cd frontend && npm run build
cd frontend && npm run build-storybook
```

Manual validation:

- run each preset app locally
- confirm editor renders as CodeMirror for Cozo, JS, and SQLite
- confirm `Shift+Enter` still runs once
- confirm `Alt+Enter` and `Ctrl+Enter` still run-and-insert

## API Reference

### Existing notebook editor injection contract

From [frontend/src/notebook/experienceConfig.ts](../../../../../../frontend/src/notebook/experienceConfig.ts):

```ts
export interface NotebookCodeCellEditorProps {
  value: string;
  onChange: (value: string) => void;
  onRun?: () => void;
  onRunAndInsert?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}
```

This is the contract every custom notebook editor must satisfy.

### Desired reusable editor contract

The generic CodeMirror editor should either implement that exact contract directly or extend it only with optional configuration props. It should not require notebook callers to understand CodeMirror internals.

## Diagrams

### Before

```text
Cozo preset
  -> CozoScriptEditor
  -> CodeMirror

JavaScript preset
  -> textarea

SQLite preset
  -> textarea
```

### After

```text
Cozo preset -----------\
JavaScript preset ------> preset config injects editor adapter
SQLite preset ---------/
                         |
                         v
                NotebookCellCardView
                         |
                         v
               NotebookCodeMirrorEditor
                         |
                         v
                 CodeMirror + language extensions
```

## Alternatives Considered

### Copy the Cozo editor twice

Rejected.

Why:

- fast in the short term
- expensive immediately after
- almost guarantees keyboard and focus drift

### Pick editor based on `codeFenceLanguage`

Rejected.

Why:

- pushes preset policy into notebook core
- makes language-specific capabilities implicit
- scales poorly once languages diverge in completions or behavior

### Keep JS and SQL on textarea for now

Rejected.

Why:

- user explicitly asked for syntax highlighting
- it undermines the preset architecture we already built
- it leaves the editor system half modularized

## Risks

- CodeMirror extension typing may require careful composition when mixing language packages and existing Cozo autocomplete.
- The generic editor extraction could accidentally regress focus behavior or keyboard handling if the mount-once lifecycle changes.
- Storybook can validate rendering but not every keyboard nuance, so at least one live preset check is still necessary.

## Open Questions

- Do we want a single shared highlight theme for all languages, or slight language-specific highlight styles layered on top of the same chrome?
- Should the generic editor expose a lower-level `extensions` prop only, or also a friendlier `language` prop for common built-in languages?

For this ticket, the safer answer is to expose `extensions` and keep policy in adapters.

## References

- [../reference/01-codemirror-editor-implementation-diary.md](../reference/01-codemirror-editor-implementation-diary.md)
- [../sources/01-editor-surface-inventory.txt](../sources/01-editor-surface-inventory.txt)
