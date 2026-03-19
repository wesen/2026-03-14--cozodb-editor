---
Title: Diary
Ticket: COZODB-009
Status: active
Topics:
    - frontend
    - backend
    - cozodb
DocType: reference
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Diary for clear-notebook and reset-kernel work."
LastUpdated: 2026-03-19T15:00:00-04:00
WhatFor: "Record planning and implementation steps for COZODB-009."
WhenToUse: "Use when implementing or reviewing clear-notebook and reset-kernel features."
---

# Diary

## Goal

Track the implementation of explicit source-reset and runtime-reset notebook commands.

## Step 1: Define the reset-actions slice

I created this ticket as the third slice in the notebook refactor sequence. It depends on both the backend mutation safety work and the frontend Redux migration so that clear/reset commands can land on stable backend APIs and a coherent frontend state container.

### Prompt Context

**User prompt (verbatim):** (same as COZODB-007 Step 1)

**Assistant interpretation:** Create a dedicated ticket for clear-notebook and reset-kernel work with its own design guide and tasks.

**Inferred user intent:** Keep destructive or state-resetting features isolated and reviewable.

**Commit (code):** N/A

### What I did
- Created ticket `COZODB-009`.
- Added the implementation guide for clear-notebook and reset-kernel.
- Added a granular task list covering backend runtime-manager work, APIs, frontend integration, and tests.

### Why
- Clearing notebook source and resetting the runtime are different actions with different semantics and should be implemented deliberately.

### What worked
- The umbrella design doc already identified the correct separation between source reset and runtime reset.

### What didn't work
- N/A

### What I learned
- This slice is best implemented last because it depends on both stable mutation contracts and a better frontend state model.

### What was tricky to build
- The main challenge was making sure this ticket did not accidentally absorb the Redux migration or backend mutation-fix work instead of depending on them.

### What warrants a second pair of eyes
- Review the proposed runtime-manager seam carefully before implementation starts because it will affect HTTP and websocket paths.

### What should be done in the future
- Start implementation only after COZODB-007 and COZODB-008 are complete.

### Code review instructions
- Start with the design doc, then inspect current runtime ownership in `backend/main.go` and notebook UI actions in `NotebookPage.tsx`.

### Technical details
- Design doc: `design-doc/01-notebook-clear-and-reset-kernel-implementation-guide.md`
- Tasks: `tasks.md`
