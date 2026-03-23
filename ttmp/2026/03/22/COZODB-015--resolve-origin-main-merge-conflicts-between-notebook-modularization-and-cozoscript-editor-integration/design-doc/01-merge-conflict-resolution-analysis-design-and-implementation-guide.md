---
Title: Merge conflict resolution analysis, design, and implementation guide
Ticket: COZODB-015
Status: active
Topics:
    - merge-conflict
    - frontend
    - notebook
    - codemirror
    - packaging
DocType: design-doc
Intent: long-term
Owners: []
RelatedFiles:
    - Path: frontend/package.json
      Note: Source-of-truth dependency manifest that should keep both Storybook/MSW and CodeMirror/Lezer packages before regenerating the lockfile
    - Path: frontend/src/editor/CozoScriptEditor.tsx
      Note: Incoming CodeMirror editor component that should be preserved and threaded into the modular notebook surfaces
    - Path: frontend/src/notebook/NotebookCellCard.tsx
      Note: Current merge conflict location for the cell-card container; preserve container role while porting editor behavior into the split architecture
    - Path: frontend/src/notebook/NotebookCellCardView.tsx
      Note: Current view-layer owner that should render CozoScriptEditor for code cells after the semantic merge
    - Path: frontend/src/notebook/NotebookPage.tsx
      Note: Current merge conflict location for the page wrapper; should remain thin after the merge
    - Path: frontend/src/notebook/notebook.css
      Note: Notebook shell stylesheet that carries the incoming CodeMirror container and monospace error styling
    - Path: frontend/src/notebook/useNotebookPageController.ts
      Note: Current owner of page keyboard behavior and the correct target for the incoming CodeMirror keyboard fixes
ExternalSources: []
Summary: Detailed intern-oriented guide for resolving the origin/main merge between notebook modularization and CozoScript editor integration without regressing either architecture or editor behavior.
LastUpdated: 2026-03-22T22:14:31.652866538-04:00
WhatFor: Explain the current merge conflict to a new intern, document the architectural cause, and define the correct semantic merge plan before any code is edited.
WhenToUse: Use when resolving the current origin/main merge, onboarding an intern to the notebook frontend architecture, or reviewing how editor integration should land on top of the newer modular notebook surfaces.
---


# Merge conflict resolution analysis, design, and implementation guide

## Executive Summary

This ticket exists because `origin/main` introduced a focused frontend feature branch that added a CodeMirror-based CozoScript editor, syntax highlighting, and a handful of notebook interaction fixes at the same time that the current local branch had already completed a larger modularization effort. The result is not a repo-wide merge disaster. It is a concentrated semantic conflict in two frontend files that had been structurally split on the local line after the merge base.

The key fact for an intern to understand is that the merge cannot be resolved by choosing "ours" or "theirs" in [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx) and [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx). Those files are conflict points only because `origin/main` modified the old monolithic notebook surfaces, while the current local branch had already moved the real logic into [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx), [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts), and related package-level abstractions.

The correct design is therefore:

1. keep the local modular notebook architecture,
2. keep the incoming CodeMirror editor assets and dependency additions,
3. manually port the remote behavior into the new architecture,
4. regenerate mechanical artifacts like `package-lock.json`,
5. validate the result with the existing automated frontend checks plus a manual editor smoke test.

The goal of this document is to make that merge strategy explicit and reproducible, so that an intern can understand both the architecture and the exact implementation sequence before touching the conflicted files.

## Problem Statement

The repository is in the middle of a merge from `origin/main`. The unresolved files are:

- [frontend/package-lock.json](../../../../../../frontend/package-lock.json)
- [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx)
- [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx)
- [ttmp/vocabulary.yaml](../../../../../vocabulary.yaml)

At first glance this could look like a broad branch divergence, but the merge-base analysis in [01-merge-conflict-evidence-and-notes.md](../reference/01-merge-conflict-evidence-and-notes.md) shows that the divergence is highly asymmetric:

- the local branch contains the notebook modularization, backend packaging, current-app preset work, and JavaScript preset work,
- the incoming branch contains a narrow editor feature set: CodeMirror CozoScript editing, syntax highlighting, autocomplete, a keyboard fix, and two notebook presentation fixes.

That means the real problem is not "how do we merge two equally large notebooks?" The real problem is:

How do we land the incoming editor feature branch on top of the newer, already-modular notebook architecture without losing either the modularization or the editor behavior?

The risks are specific:

- resolving the conflicts mechanically could revert the architecture from split view/controller files back to monolithic notebook files,
- resolving the conflicts by blindly keeping local files could drop the new editor entirely,
- resolving the lockfile manually could leave the dependency graph inconsistent,
- resolving only the visible conflict files could miss behavior that now belongs in non-conflicted modular files such as [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx) and [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts).

## Proposed Solution

The proposed solution is a semantic merge performed around the post-modularization architecture, not around the conflicted file text.

### High-level resolution rule

Preserve local ownership of structure. Import remote ownership of behavior.

In practice that means:

- structure comes from the local branch:
  - page/controller split,
  - card/container/view split,
  - notebook package and preset layering,
  - Storybook- and package-oriented surfaces,
  - newer frontend organization around `frontend/src/notebook`.
- behavior comes from the remote branch where it is still relevant:
  - CodeMirror code-cell editor for CozoScript,
  - Lezer grammar and highlighting assets,
  - System 7 editor theme,
  - `.cm-editor` handling in global keyboard routing,
  - restored `Enter` behavior for active code cells,
  - ANSI stripping for error output,
  - monospace styling for error cards.

### Why this is the right shape

The current architecture is already the result of several completed tickets:

- `COZODB-011` split notebook page and cell rendering into container/view/controller surfaces,
- `COZODB-012` moved backend notebook ownership into the notebook package,
- `COZODB-013` turned the current app into a preset and formalized notebook package surfaces,
- `COZODB-014` added the JavaScript preset.

Rolling the frontend back to the old pre-modularization file structure just to accept the remote branch would throw away the architectural work that the rest of the repository already assumes.

By contrast, the incoming editor branch is mostly additive and self-contained:

- [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx)
- [frontend/src/editor/codemirror/index.js](../../../../../../frontend/src/editor/codemirror/index.js)
- [frontend/src/editor/cozoscriptSystem7Theme.ts](../../../../../../frontend/src/editor/cozoscriptSystem7Theme.ts)

Those files can be preserved nearly as-is. The merge work is mainly about threading them into the current modular notebook surfaces.

## System Overview

An intern should understand the current frontend notebook architecture before touching the merge.

### Before the local modularization

At the merge base, the notebook frontend was organized around two monolithic surfaces:

- [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx) mixed page composition, state selection, WebSocket wiring, command dispatch, and keyboard orchestration.
- [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx) mixed Redux container logic, UI rendering, markdown editing, output rendering, AI interactions, and runtime/error display.

The remote feature branch was written against that model.

### After the local modularization

The current local branch has a more intentional split:

```text
Notebook package
|
+-- NotebookPage.tsx
|   Thin app-facing composition wrapper
|
+-- useNotebookPageController.ts
|   Keyboard handling, data loading, AI dispatch, notebook commands
|
+-- NotebookPageView.tsx
|   Page shell, title bar, toolbar, list layout
|
+-- NotebookCellCard.tsx
|   Redux-connected container for one cell
|
+-- NotebookCellCardView.tsx
|   Presentational card UI for one cell
|
+-- experienceConfig.ts / experience.tsx
|   Preset-specific renderers and placeholders
|
+-- state/notebookSlice.ts
    Domain state, async thunks, selectors
```

That split matters because the incoming behavior should now be attached at the correct level:

- code editor rendering belongs in [NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx),
- editor-related container state belongs in [NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx),
- page-wide keyboard semantics belong in [useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts),
- editor styles belong in [notebook.css](../../../../../../frontend/src/notebook/notebook.css),
- package dependencies belong in [frontend/package.json](../../../../../../frontend/package.json).

### Architectural flow after the merge is correctly resolved

```text
User edits code cell
  -> NotebookCellCard container selects state from Redux
  -> NotebookCellCardView renders CozoScriptEditor for code cells
  -> CozoScriptEditor emits onChange/onRun/onRunAndInsert callbacks
  -> container dispatches notebookSlice actions/thunks
  -> runtime result updates Redux state
  -> NotebookCellCardView renders query table, error card, or AI artifacts

User presses keyboard shortcuts at page level
  -> useNotebookPageController window keydown handler runs
  -> handler ignores active textareas, inputs, and .cm-editor surfaces
  -> handler routes Enter / Shift+Enter / Ctrl+Enter / Alt+Enter correctly
  -> active cell changes or cell execution occurs
```

## Merge Base and Branch Anatomy

The merge base is commit `084ce54` (`:art: Update go mod`). Everything after that can be split into "local architectural work" and "remote editor work."

### Local branch after the merge base

The local branch contains several tickets' worth of work. The important consequence for this merge is that the notebook code no longer lives in the same structural places that the remote branch modified.

The most important local commits for understanding the conflict are:

- `cf623a2` `frontend: add storybook and reusable notebook primitives`
- `ea9b9c6` `frontend: split notebook cell card into view and container`
- `b5715bf` `frontend: add interactive notebook page stories with msw`
- `3b69ec1` `frontend: inject notebook transport through store services`
- `073ba4e` `frontend: add notebook app and current cozo preset`
- `2d7fe22` `notebook: move cozo experience into preset config`
- `10f2094` `frontend: add javascript notebook preset and stories`

### Remote branch after the merge base

The incoming branch is much smaller and much more focused:

- `c6d424a` `feat(editor): add CozoScript syntax highlighting with System 7 theme`
- `edb3159` `fix(editor): prevent double cell execution on Shift+Enter`
- `17553da` `fix(notebook): use monospace font in error body for alignment`
- `a3e01e4` `fix(notebook): strip ANSI escape codes from error output`
- `3717f14` `:art: Restore enter shortcut`

### Conflict interpretation

This is not "both branches rewrote the same feature equally." Instead:

- local changed ownership boundaries and composition surfaces,
- remote changed runtime behavior and editing UX within the old ownership boundaries.

That is why the merge should be resolved by preserving local ownership boundaries and porting remote behavior.

## Detailed Conflict Analysis

### 1. Code-cell rendering conflict

The biggest conflict is in [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx).

What the remote branch changed:

- imported [CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx),
- replaced the code-cell `textarea` with `CozoScriptEditor`,
- limited auto-resize behavior to markdown textareas only,
- stripped ANSI escape sequences before rendering notebook errors,
- stripped ANSI escape sequences before passing errors into the diagnosis card.

What the local branch changed:

- reduced [NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx) into a thinner connected container,
- moved presentational logic into [NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx),
- moved package-specific rendering customizations behind [experienceConfig.ts](../../../../../../frontend/src/notebook/experienceConfig.ts).

What should happen in the resolved state:

- [NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx) stays a container,
- [NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx) gains the `CozoScriptEditor` rendering path for code cells,
- ANSI stripping logic lives in a shared helper or locally in the view layer,
- markdown textarea auto-resize remains markdown-only,
- diagnosis and error cards both use stripped error text.

#### Desired post-merge pseudocode

```ts
if (cell.kind === "code") {
  render CozoScriptEditor({
    value: cell.source,
    onChange: onEditorChange,
    onRun: onRun,
    onRunAndInsert: onRunAndInsertBelow,
    onBlur: onEditorBlur,
    onFocus: onEditorFocus,
    placeholder: codeCellPlaceholder,
    autoFocus: isActive,
  });
} else if (cell.kind === "markdown" && !isEditing) {
  render markdown preview;
} else {
  render textarea;
}
```

#### Why this matters

If we instead choose the remote text wholesale, we would reintroduce old rendering logic into the container file and partially bypass the current view split. That would work temporarily, but it would be a regression against the modular package architecture that later tickets already rely on.

### 2. Page keyboard routing conflict

The second real conflict is in [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx), but the *real* current ownership is in [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts).

What the remote branch changed:

- treated `.cm-editor` as an editable surface in the global keydown guard,
- allowed bare `Enter` to interact with an active CodeMirror editor and focus `.cm-content`,
- prevented duplicate execution by combining page-level and editor-level keyboard protections.

What the local branch changed:

- moved all page keyboard logic into [useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts),
- left [NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx) as a thin composition surface.

What should happen in the resolved state:

- keep the thin [NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx),
- manually apply the remote keyboard logic inside [useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts),
- keep the remote `stopPropagation` safeguard inside [CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx).

#### Desired post-merge pseudocode

```ts
const isInInput =
  target.tagName === "TEXTAREA" ||
  target.tagName === "INPUT" ||
  target.closest(".cm-editor") != null;

if (isInInput) return;

if (event.key === "Enter") {
  const activeTarget = query(
    ".mac-cell-card.is-active textarea, " +
    ".mac-cell-card.is-active .mac-md-preview, " +
    ".mac-cell-card.is-active .cm-editor"
  );

  activeTarget?.click();

  if (activeTarget is textarea) activeTarget.focus();

  const cmContent = activeTarget?.querySelector(".cm-content");
  if (cmContent is HTMLElement) cmContent.focus();
}
```

### 3. CSS and theme conflict

The CSS side is much simpler. There is no unresolved marker in [frontend/src/notebook/notebook.css](../../../../../../frontend/src/notebook/notebook.css), but the incoming branch *did* add meaningful styles:

- monospace font for `.mac-cell-error__body`,
- `.mac-codemirror-container`,
- `.cm-editor` typography,
- autocomplete tooltip font adjustments.

These changes should survive the merge because they are behaviorally tied to the new editor and to the notebook error-display fixes.

An intern should treat [frontend/src/notebook/notebook.css](../../../../../../frontend/src/notebook/notebook.css) as a "semantic companion" to [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx), even though the stylesheet itself is not conflicted.

### 4. Dependency and lockfile conflict

[frontend/package.json](../../../../../../frontend/package.json) already contains the correct conceptual union:

- local branch additions such as Storybook and MSW,
- remote branch additions such as CodeMirror and Lezer packages.

The unresolved [frontend/package-lock.json](../../../../../../frontend/package-lock.json) is therefore not a design decision. It is a generated artifact conflict.

The correct policy is:

- first establish the source-of-truth `package.json`,
- then regenerate `package-lock.json`,
- then validate with `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and likely `npm run build-storybook`.

### 5. Ticket vocabulary conflict

[ttmp/vocabulary.yaml](../../../../../vocabulary.yaml) only needs a union of words from both sides. It should preserve both the existing packaging vocabulary and the incoming editor vocabulary:

- `javascript`
- `notebook`
- `syntax-highlighting`
- `codemirror`

This file is low risk and should be resolved last.

## Design Decisions

### Decision 1: Keep the modular notebook architecture

Rationale:

- the rest of the repo is already built on top of the modularized architecture,
- the local branch includes packaging and preset work that assumes this structure,
- rolling back the split would create hidden regressions and future cleanup work.

### Decision 2: Treat the incoming editor branch as a behavior patch, not a structure patch

Rationale:

- the remote branch's real value is the editor UX and notebook interaction behavior,
- most of its structure assumptions are artifacts of the older frontend layout,
- translating behavior into the new architecture is cleaner than translating the new architecture back into old files.

### Decision 3: Preserve `CozoScriptEditor.tsx` mostly as-is

Rationale:

- the editor component is additive and self-contained,
- it already contains the key duplicate-execution fix via `stopPropagation`,
- it can be reused by the modular notebook view without changing its external API.

Relevant API surface in [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx):

```ts
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
```

### Decision 4: Move editor-specific rendering into the view layer

Rationale:

- view files should own rendering choices,
- container files should own store coordination,
- keeping editor rendering in the view preserves the direction of the refactor.

### Decision 5: Regenerate `package-lock.json` rather than hand-merging it

Rationale:

- the lockfile conflict is a generated-artifact conflict,
- manual lockfile surgery is error-prone,
- once `package.json` is correct, regeneration is cheaper and more reliable.

## Alternatives Considered

### Alternative A: Keep the remote notebook files wholesale

Rejected because:

- it would effectively revert the notebook page and cell-card split,
- it would reintroduce monolithic notebook files,
- it would conflict with later packaging and preset work already present locally.

### Alternative B: Keep the local notebook files wholesale and ignore the remote editor behavior

Rejected because:

- it would drop the new CozoScript editor integration,
- it would lose the incoming keyboard fixes,
- it would lose the ANSI-stripping and error-font improvements,
- it would waste valid feature work already merged into `origin/main`.

### Alternative C: Recreate the editor integration from scratch instead of porting the remote implementation

Rejected because:

- the remote implementation already exists and is coherent,
- recreating it by hand would be slower and risk subtle behavior mismatches,
- it would make the merge harder to audit against the actual incoming intent.

### Alternative D: Cherry-pick remote commits after aborting the merge

Rejected for this ticket's design because:

- the current problem is already a concrete merge state,
- the documentation should explain how to finish the present merge safely,
- aborting and replaying is a possible operator tactic, but it does not change the semantic merge design and may create more operator risk in a dirty worktree.

## Implementation Plan

The implementation should be staged and deliberate. The order matters.

### Phase 0: Preserve evidence

Do not start by editing conflicted files blindly. First preserve the merge analysis evidence:

- keep [01-merge-conflict-inventory.sh](../scripts/01-merge-conflict-inventory.sh),
- keep [01-merge-conflict-inventory.txt](../sources/01-merge-conflict-inventory.txt),
- keep [01-merge-conflict-evidence-and-notes.md](../reference/01-merge-conflict-evidence-and-notes.md).

This gives future reviewers a reproducible snapshot of the current state.

### Phase 1: Resolve the editor asset side first

Accept and preserve the additive editor assets:

- [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx)
- [frontend/src/editor/codemirror/complete.js](../../../../../../frontend/src/editor/codemirror/complete.js)
- [frontend/src/editor/codemirror/cozoscript.grammar](../../../../../../frontend/src/editor/codemirror/cozoscript.grammar)
- [frontend/src/editor/codemirror/highlight.js](../../../../../../frontend/src/editor/codemirror/highlight.js)
- [frontend/src/editor/codemirror/index.d.ts](../../../../../../frontend/src/editor/codemirror/index.d.ts)
- [frontend/src/editor/codemirror/index.js](../../../../../../frontend/src/editor/codemirror/index.js)
- [frontend/src/editor/codemirror/parser.js](../../../../../../frontend/src/editor/codemirror/parser.js)
- [frontend/src/editor/codemirror/parser.terms.js](../../../../../../frontend/src/editor/codemirror/parser.terms.js)
- [frontend/src/editor/cozoscriptSystem7Theme.ts](../../../../../../frontend/src/editor/cozoscriptSystem7Theme.ts)

These are not the hard part, but they are prerequisites for the real semantic merge.

### Phase 2: Rebuild the code-cell rendering path against the modular card/view split

Work from the current modular surfaces, not the conflicted monolith.

Implementation tasks:

1. inspect the current connected [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx) once conflicts are resolved conceptually,
2. update [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx) so code cells render `CozoScriptEditor`,
3. keep markdown preview and markdown textarea behavior unchanged,
4. ensure markdown auto-resize logic only targets markdown textareas,
5. add ANSI stripping for both the error card and diagnosis card.

Recommended helper extraction:

```ts
function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}
```

The helper can live locally in the view or in a tiny notebook utility file if both the container and view need it.

### Phase 3: Port keyboard and focus behavior into the controller

Implementation tasks:

1. update [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts),
2. add `.cm-editor` to the input detection guard,
3. preserve active-cell `Enter` behavior for textarea, markdown preview, and CodeMirror,
4. keep the existing controller structure intact,
5. verify that CodeMirror-level `stopPropagation` and page-level `.cm-editor` detection work together.

This phase is critical because the editor branch introduced both a new input surface and a double-execution fix. Both layers must survive:

- the editor component stops propagation for modified Enter combinations,
- the page controller recognizes `.cm-editor` as an editable target and exits early.

### Phase 4: Reconcile styles and dependencies

Implementation tasks:

1. preserve the CodeMirror container styles in [notebook.css](../../../../../../frontend/src/notebook/notebook.css),
2. preserve the monospace error font,
3. confirm [frontend/package.json](../../../../../../frontend/package.json) keeps both Storybook/MSW and CodeMirror/Lezer dependencies,
4. delete the conflict markers in [frontend/package-lock.json](../../../../../../frontend/package-lock.json),
5. regenerate the lockfile from `package.json`.

### Phase 5: Resolve documentation metadata

Implementation tasks:

1. union the vocabulary entries in [ttmp/vocabulary.yaml](../../../../../vocabulary.yaml),
2. keep the incoming `COZODB-010` editor-integration ticket docs,
3. update this ticket with final implementation notes after the merge is fully resolved.

### Phase 6: Validate

The merge is only complete when behavior is validated.

Recommended command sequence:

```bash
cd /home/manuel/code/wesen/2026-03-14--cozodb-editor/frontend
npm install
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run build-storybook
```

Recommended manual smoke checklist:

1. start the app in the Cozo preset,
2. focus a code cell,
3. verify syntax highlighting is visible,
4. verify autocomplete opens,
5. verify `Shift+Enter` runs exactly once,
6. verify `Ctrl+Enter` or `Alt+Enter` runs and inserts exactly once,
7. verify bare `Enter` focuses or opens the active editor correctly,
8. trigger a runtime error and verify ANSI codes do not render literally,
9. confirm the error body still aligns in monospace,
10. confirm markdown cells still use the old textarea/preview path.

## File-by-File Implementation Map

### Primary semantic merge targets

- [frontend/src/notebook/NotebookCellCard.tsx](../../../../../../frontend/src/notebook/NotebookCellCard.tsx)
  Why it matters: current conflict location, but should remain a container.
- [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx)
  Why it matters: the correct post-refactor place to render `CozoScriptEditor`.
- [frontend/src/notebook/NotebookPage.tsx](../../../../../../frontend/src/notebook/NotebookPage.tsx)
  Why it matters: visible conflict location, but should remain thin after resolution.
- [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts)
  Why it matters: the real post-refactor owner of notebook keyboard behavior.

### Supporting files that must survive intact

- [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx)
- [frontend/src/editor/cozoscriptSystem7Theme.ts](../../../../../../frontend/src/editor/cozoscriptSystem7Theme.ts)
- [frontend/src/editor/codemirror/index.js](../../../../../../frontend/src/editor/codemirror/index.js)
- [frontend/src/notebook/notebook.css](../../../../../../frontend/src/notebook/notebook.css)
- [frontend/package.json](../../../../../../frontend/package.json)

### Mechanical merge targets

- [frontend/package-lock.json](../../../../../../frontend/package-lock.json)
- [ttmp/vocabulary.yaml](../../../../../vocabulary.yaml)

## Intern Playbook

If you are the intern assigned to complete this merge, do not improvise the order. Use this playbook:

1. read [01-merge-conflict-evidence-and-notes.md](../reference/01-merge-conflict-evidence-and-notes.md) completely,
2. read [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx),
3. read [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx),
4. read [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts),
5. resolve the card rendering path first,
6. resolve controller keyboard behavior second,
7. reconcile CSS and dependencies third,
8. regenerate `package-lock.json` fourth,
9. run frontend validation,
10. only then mark the merge as resolved.

## Open Questions

- Should ANSI stripping remain local to notebook rendering, or should it move into a more general transport/runtime formatting utility if similar errors appear in other presets later?
- Does `CozoScriptEditor` belong behind the experience-config layer in the long term, so that additional language presets can inject their own editor component instead of only changing placeholders and renderers?
- Should a Storybook scenario be added after the merge specifically to exercise keyboard behavior with the CodeMirror-based code cell, or is the current package-level smoke coverage sufficient?

## References

- [01-merge-conflict-evidence-and-notes.md](../reference/01-merge-conflict-evidence-and-notes.md)
- [01-merge-conflict-inventory.sh](../scripts/01-merge-conflict-inventory.sh)
- [01-merge-conflict-inventory.txt](../sources/01-merge-conflict-inventory.txt)
- [frontend/src/editor/CozoScriptEditor.tsx](../../../../../../frontend/src/editor/CozoScriptEditor.tsx)
- [frontend/src/notebook/NotebookCellCardView.tsx](../../../../../../frontend/src/notebook/NotebookCellCardView.tsx)
- [frontend/src/notebook/useNotebookPageController.ts](../../../../../../frontend/src/notebook/useNotebookPageController.ts)
- [frontend/src/notebook/notebook.css](../../../../../../frontend/src/notebook/notebook.css)
- [frontend/package.json](../../../../../../frontend/package.json)
