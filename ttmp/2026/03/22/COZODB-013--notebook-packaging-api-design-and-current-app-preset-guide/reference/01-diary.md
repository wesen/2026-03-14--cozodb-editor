---
Title: Diary
Ticket: COZODB-013
Status: active
Topics:
    - architecture
    - backend
    - frontend
    - cozodb
    - javascript
DocType: reference
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/scripts/01-package-surface-inventory.sh
      Note: Ticket-local script used to inventory current backend/frontend package surfaces
    - Path: ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/sources/01-package-surface-inventory.txt
      Note: Captured inventory output used as evidence for the guide
ExternalSources: []
Summary: Chronological diary for the packaging/API design ticket that follows the frontend and backend modularization work.
LastUpdated: 2026-03-22T12:43:33.466793201-04:00
WhatFor: Record how the packaging design guide, inventory evidence, and reMarkable bundle were produced for COZODB-013.
WhenToUse: Use when continuing the packaging-design work, reviewing the evidence trail, or checking how the deliverable bundle was assembled.
---


# Diary

## Goal

Track the creation of the package and API design ticket that prepares the repository for reusable notebook packaging and a later JavaScript-oriented surface.

## Step 1: Create the packaging design ticket and write the guide

This ticket does not change runtime code. Its job is to make the next implementation phase legible. I used the now-complete frontend and backend cutover tickets as inputs, re-read the current package surfaces in the codebase, and wrote a packaging guide aimed at an intern who needs both conceptual framing and concrete file-level orientation.

The key new design constraint is the future JavaScript language surface. That changed the guide materially: instead of describing package extraction only as “make the Cozo app reusable,” the guide now describes a preset-based architecture in which the current Cozo app is preset #1 and a JavaScript-oriented notebook becomes preset #2.

### Prompt Context

**User prompt (verbatim):**
> ok, create a new ticket, and write a detailed implementation guide for our internn and upload to remarkable. on the whole packaging and api design and app example.
>
> My plan is that once we have this going, we design a second surface on the backend and frontend that exposes JS as a language.

**Assistant interpretation:** Create a new ticket focused on package extraction and host-facing APIs, write a detailed intern guide that explains the current app preset and future multi-language direction, and upload the deliverables to reMarkable.

**Inferred user intent:** Lock down the next-stage architecture before implementation starts, with enough specificity that an intern can work from the guide and enough foresight that the future JavaScript surface does not force a redesign.

**Commit (code):** Pending

### What I did
- Created ticket `COZODB-013`.
- Added the primary design doc and diary.
- Inspected the current backend package surface in:
  - `backend/main.go`
  - `backend/pkg/notebook/service.go`
  - `backend/pkg/notebook/http.go`
  - `backend/pkg/notebook/websocket.go`
- Inspected the current frontend package surface in:
  - `frontend/src/notebook/NotebookPage.tsx`
  - `frontend/src/notebook/useNotebookPageController.ts`
  - `frontend/src/notebook/NotebookPageView.tsx`
  - `frontend/src/notebook/state/notebookSlice.ts`
  - `frontend/src/transport/httpClient.ts`
  - `frontend/src/transport/hintsSocket.ts`
  - `frontend/src/theme/tokens.css`
- Wrote the packaging and API design guide.
- Added a ticket-local package inventory script.

### Why
- The modularization work is now past the point where “split this file” guidance is useful. The next risk is unclear package APIs and unclear preset boundaries.
- The future JavaScript surface needs to influence the package design now, before the public-facing APIs hard-code Cozo-only assumptions.

### What worked
- The repository already has credible package centers on both backend and frontend.
- The previous tickets provide a clean sequence: first frontend decomposition, then backend cutover, now package API design.
- The current app is already close to a preset, which makes the guide concrete rather than aspirational.
- The final bundle uploaded cleanly to `/ai/2026/03/22/COZODB-013`, and `remarquee cloud ls /ai/2026/03/22/COZODB-013 --long --non-interactive` returned the uploaded PDF.

### What didn't work
- My first version of the inventory script pointed one directory too high when resolving the repository root.
- Command:
  - `bash ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/scripts/01-package-surface-inventory.sh > ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/sources/01-package-surface-inventory.txt`
- Error:
  - `rg: backend/pkg/notebook: IO error for operation on backend/pkg/notebook: No such file or directory (os error 2)`
- Fix:
  - changed the script root traversal from `../../../../../../..` to `../../../../../..`
  - reran the script successfully and captured the output in `sources/01-package-surface-inventory.txt`
- My first reMarkable upload attempt failed during PDF generation because the diary stored the user prompt as one quoted string with literal `\n` sequences.
- Command:
  - `remarquee upload bundle ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/index.md ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/design-doc/01-notebook-packaging-api-design-and-current-app-preset-implementation-guide.md ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/tasks.md ttmp/2026/03/22/COZODB-013--notebook-packaging-api-design-and-current-app-preset-guide/reference/01-diary.md --name "COZODB-013 notebook packaging api design" --remote-dir "/ai/2026/03/22/COZODB-013" --toc-depth 2`
- Error:
  - `Error: pandoc failed: Error producing PDF.`
  - `! Undefined control sequence.`
  - `l.1322 ...aging and api design and app example. \n`
- Fix:
  - rewrote the prompt as a multiline blockquote in the diary
  - reran the upload successfully

### What I learned
- The real leverage point is not adding more interfaces everywhere. It is deciding which variability belongs to presets, which belongs to language profiles, and which should stay in the notebook domain.
- The current code is now structured well enough that package design can be evidence-driven instead of speculative.

### What was tricky to build
- The subtle part was incorporating the future JavaScript surface without over-generalizing the current code. If the guide abstracted everything immediately, it would become hand-wavy. If it ignored JavaScript, it would age badly almost immediately.
- The workable compromise was to recommend neutral host-facing module/preset APIs while keeping current Cozo-specific details in the first preset and the first language profile.

### What warrants a second pair of eyes
- Review whether the proposed backend `Module` abstraction should be introduced immediately or only after the first preset factory exists.
- Review whether the frontend preset should own store creation or whether store creation should remain a separate exported helper.

### What should be done in the future
- Start implementation against the packaging backlog from this ticket.
- Use the current-app preset as the first proving ground before adding the JavaScript-oriented preset family.

### Code review instructions
- Read the design guide first.
- Compare its proposed module/preset APIs against the current files listed above.
- Confirm that the JavaScript future plan is represented as a preset/language-profile extension, not as a separate architecture.

### Technical details
- Key code evidence:
  - `backend/pkg/notebook/http.go` exports `MountHTTPRoutes`
  - `backend/pkg/notebook/websocket.go` exports `MountWebSocketRoutes`
  - `backend/pkg/notebook/service.go` exports `NewService` and `OpenService`
  - `frontend/src/notebook/NotebookPage.tsx` is the current default app composition point
  - `frontend/src/notebook/useNotebookPageController.ts` still owns environment wiring
  - `frontend/src/transport/httpClient.ts` and `frontend/src/transport/hintsSocket.ts` already define transport modules that can become preset dependencies
  - `ttmp/.../scripts/01-package-surface-inventory.sh` captures the current package file inventory and key exported mount points
