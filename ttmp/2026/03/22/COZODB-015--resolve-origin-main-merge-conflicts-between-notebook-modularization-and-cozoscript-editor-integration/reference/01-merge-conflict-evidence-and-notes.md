---
Title: Merge conflict evidence and notes
Ticket: COZODB-015
Status: active
Topics:
    - merge-conflict
    - frontend
    - notebook
    - codemirror
    - packaging
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: frontend/package-lock.json
      Note: Generated artifact with conflict markers that should be regenerated after the semantic merge is complete
    - Path: frontend/src/notebook/NotebookCellCard.tsx
      Note: Large semantic conflict surface showing remote editor changes against the old monolithic card
    - Path: frontend/src/notebook/NotebookPage.tsx
      Note: Large semantic conflict surface showing remote keyboard fixes against the old page/controller file
    - Path: ttmp/2026/03/22/COZODB-015--resolve-origin-main-merge-conflicts-between-notebook-modularization-and-cozoscript-editor-integration/sources/01-merge-conflict-inventory.txt
      Note: Captured merge-base and unresolved-file evidence used by this ticket
    - Path: ttmp/vocabulary.yaml
      Note: Low-risk metadata conflict that only needs a union of vocabulary entries
ExternalSources: []
Summary: Command evidence, merge-base findings, and remote-branch intent notes for the origin/main merge conflict.
LastUpdated: 2026-03-22T22:14:31.823389751-04:00
WhatFor: Preserve a compact factual record of the current merge state, remote-branch intent, and exact command evidence used to scope the conflict.
WhenToUse: Use when implementing or reviewing the merge resolution, validating that the design doc matches the actual git state, or onboarding someone who needs the raw facts before they start editing.
---


# Merge conflict evidence and notes

## Goal

Provide a copy/paste-ready factual reference for the current merge:

- what the merge base is,
- which files are unresolved,
- which commits are unique to each side,
- what the incoming branch actually changed,
- where the semantic merge needs to happen in the post-refactor architecture.

## Context

The current merge looks worse than it is because the conflict markers appear in two large notebook files. In reality, the remote branch is small and focused, while the local branch carries a much broader architectural refactor. The purpose of this document is to separate those two dimensions so implementation can proceed rationally.

## Quick Reference

### Merge state summary

```text
HEAD:       95a99f7
MERGE_HEAD: 136a956
merge-base: 084ce54fb1a56be7bba6c5cf2df4dc0619545168
```

### Unresolved files

```text
frontend/package-lock.json
frontend/src/notebook/NotebookCellCard.tsx
frontend/src/notebook/NotebookPage.tsx
ttmp/vocabulary.yaml
```

### Remote branch intent in one sentence

Remote added a CodeMirror-based CozoScript editor plus a few notebook behavior fixes on top of the old pre-modularization notebook file structure.

### Local branch intent in one sentence

Local split the notebook into package-oriented controller/view/container surfaces and then built preset packaging on top of that architecture.

### Commits unique to `MERGE_HEAD`

```text
136a956 Merge pull request #1 from wesen/task/cozo-autocomplete-notebook
3717f14 :art: Restore enter shortcut
a3e01e4 fix(notebook): strip ANSI escape codes from error output
17553da fix(notebook): use monospace font in error body for alignment
fe4306f docs(COZODB-010): add diary entry for double-execution bugfix
edb3159 fix(editor): prevent double cell execution on Shift+Enter
dcfbcc0 docs(COZODB-010): update diary with implementation details
c6d424a feat(editor): add CozoScript syntax highlighting with System 7 theme
```

### High-value files from the incoming branch

- [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx)
- [frontend/src/editor/codemirror/index.js](../../../../../../frontend/src/editor/codemirror/index.js)
- [frontend/src/editor/cozoscriptSystem7Theme.ts](../../../../../../frontend/src/editor/cozoscriptSystem7Theme.ts)
- [frontend/src/notebook/notebook.css](../../../../../../frontend/src/notebook/notebook.css)

### Current local files that should receive the behavior

- [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx)
- [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx)
- [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts)
- [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx)

### Conflict severity table

| File | Severity | Why |
| --- | --- | --- |
| [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx) | High | Incoming code editor behavior landed on the old monolithic card, while local split rendering into `NotebookCellCardView.tsx`. |
| [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx) | High | Incoming keyboard fixes landed on the old page/controller file, while local moved that logic into `useNotebookPageController.ts`. |
| [frontend/package-lock.json](../../../../../../frontend/package-lock.json) | Medium-Low | Generated artifact conflict; should be regenerated after source-of-truth `package.json` is confirmed. |
| [ttmp/vocabulary.yaml](../../../../../vocabulary.yaml) | Low | Straightforward union of vocabulary entries. |

### Behavioral deltas that must survive

- Code cells render `CozoScriptEditor` instead of plain `textarea`
- CozoScript syntax highlighting and autocomplete are available
- `.cm-editor` is treated as an input by page-level keyboard handling
- `Shift+Enter` and `Ctrl/Alt+Enter` do not double-fire
- bare `Enter` still focuses/opens the active cell correctly
- ANSI escape codes are stripped from notebook error output
- notebook error body uses monospace typography

### Structural deltas that must survive

- keep `NotebookCellCard` as container + `NotebookCellCardView` as view
- keep `NotebookPage` thin
- keep `useNotebookPageController` as page behavior owner
- keep notebook package and preset architecture from the local branch

### Reproducible evidence

- script: [01-merge-conflict-inventory.sh](../scripts/01-merge-conflict-inventory.sh)
- output: [01-merge-conflict-inventory.txt](../sources/01-merge-conflict-inventory.txt)

## Usage Examples

### Example: inspect only the incoming branch's notebook/editor delta

```bash
git diff "$(git merge-base HEAD MERGE_HEAD)..MERGE_HEAD" -- \
  frontend/package.json \
  frontend/package-lock.json \
  frontend/src/editor \
  frontend/src/notebook \
  ttmp/vocabulary.yaml
```

### Example: list unresolved files only

```bash
git diff --name-only --diff-filter=U
```

### Example: show commits unique to the incoming branch

```bash
git log --oneline --decorate "$(git merge-base HEAD MERGE_HEAD)..MERGE_HEAD"
```

### Example: implementation checklist for the actual semantic merge

```text
1. Preserve incoming editor files and package.json additions
2. Port code-cell rendering into NotebookCellCardView.tsx
3. Port keyboard fixes into useNotebookPageController.ts
4. Keep notebook.css CodeMirror and error-body styling
5. Regenerate package-lock.json
6. Union ttmp/vocabulary.yaml
7. Run frontend validation
```

## Related

- [01-merge-conflict-resolution-analysis-design-and-implementation-guide.md](../design-doc/01-merge-conflict-resolution-analysis-design-and-implementation-guide.md)
- [01-merge-conflict-inventory.sh](../scripts/01-merge-conflict-inventory.sh)
- [01-merge-conflict-inventory.txt](../sources/01-merge-conflict-inventory.txt)
