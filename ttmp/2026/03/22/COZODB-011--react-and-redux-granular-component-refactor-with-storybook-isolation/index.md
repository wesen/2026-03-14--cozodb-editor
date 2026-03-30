---
Title: React and Redux granular component refactor with Storybook isolation
Ticket: COZODB-011
Status: complete
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
LastUpdated: 2026-03-23T14:40:00-04:00
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

Current status: **complete**

- Analysis and task planning are complete.
- Storybook, primitive extraction, `NotebookCellCard`, and `NotebookPage` refactors are complete.
- The ticket now includes both pure page-shell stories and an MSW-backed full interactive notebook Storybook story.
- The frontend is ready for the frontend-side package extraction work described in `COZODB-010`.

## Tasks

See [tasks.md](./tasks.md) for the ordered implementation sequence.
