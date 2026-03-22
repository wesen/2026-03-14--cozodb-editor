---
Title: React and Redux granular component refactor with Storybook isolation
Ticket: COZODB-011
Status: active
Topics:
    - architecture
    - frontend
    - rich-widgets
DocType: index
Intent: long-term
Owners: []
RelatedFiles: []
ExternalSources: []
Summary: "Frontend refactor ticket for extracting reusable React primitives, separating Redux containers from presentational views, and validating the result in Storybook before broader notebook package modularization."
LastUpdated: 2026-03-22T11:58:02-04:00
WhatFor: "Track the pre-COZODB-010 frontend granularity work and its implementation artifacts."
WhenToUse: "Use when orienting to COZODB-011 or continuing the React/Redux component refactor."
---

# React and Redux granular component refactor with Storybook isolation

## Overview

This ticket is the frontend refactor layer that should happen before the broader notebook package extraction in `COZODB-010`. It focuses on reusable primitives, container/view splits, and Storybook-backed isolated validation.

## Key Links

- Design guide:
  [design-doc/01-react-and-redux-granular-refactor-primitive-widget-extraction-and-storybook-guide.md](./design-doc/01-react-and-redux-granular-refactor-primitive-widget-extraction-and-storybook-guide.md)
- Diary:
  [reference/01-diary.md](./reference/01-diary.md)
- Inventory output:
  [sources/01-frontend-component-inventory.txt](./sources/01-frontend-component-inventory.txt)
- Inventory script:
  [scripts/01-frontend-component-inventory.sh](./scripts/01-frontend-component-inventory.sh)

## Status

Current status: **active**

- Analysis and task planning are complete.
- Storybook and primitive extraction are complete.
- `NotebookCellCard` has been split into container/view layers with both pure and mock-store stories.
- `NotebookPage` refactoring is the main remaining implementation block.

## Tasks

See [tasks.md](./tasks.md) for the ordered implementation sequence.
