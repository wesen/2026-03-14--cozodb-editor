---
Title: Geppetto/Pinocchio Streaming & Structured Extraction for SEM Frame Rich Widgets
Ticket: COZODB-002
Status: active
Topics:
    - streaming
    - structured-extraction
    - geppetto
    - pinocchio
    - rich-widgets
    - ai-completion
DocType: index
Intent: long-term
Owners: []
RelatedFiles:
    - Path: ttmp/2026/03/14/COZODB-002--geppetto-pinocchio-streaming-structured-extraction-for-sem-frame-rich-widgets/design-doc/01-independent-review-and-implementation-guide-for-geppetto-pinocchio-and-sem-extraction-widgets.md
      Note: Primary implementation guide
    - Path: ttmp/2026/03/14/COZODB-002--geppetto-pinocchio-streaming-structured-extraction-for-sem-frame-rich-widgets/reference/01-investigation-diary.md
      Note: Chronological investigation record
ExternalSources: []
Summary: Independent review and implementation-planning ticket for replacing the local Anthropic-plus-ad-hoc websocket flow with geppetto inference, pinocchio SEM frames, FilteringSink-based YAML extraction, and projected rich widgets for Cozo guidance.
LastUpdated: 2026-03-14T23:09:35.896855106-04:00
WhatFor: Review the current code, extract the cleanest adoption path from geppetto/pinocchio/temporal-relationships, and document the migration plan for COZODB-002.
WhenToUse: Use this workspace when implementing or reviewing the geppetto plus pinocchio streaming migration for cozodb-editor.
---




# Geppetto/Pinocchio Streaming & Structured Extraction for SEM Frame Rich Widgets

## Overview

This ticket is the research and implementation-planning workspace for moving `cozodb-editor` from its current Anthropic-specific hint path to a geppetto plus pinocchio streaming architecture with structured YAML extraction and SEM-backed rich widgets.

The independent review in this workspace concludes that the local app is still prototype-grade at the inference/UI boundary: the backend uses a direct Anthropic stream plus JSON post-processing, and the frontend consumes pseudo-SEM envelopes inside a single monolithic component. The reference repos already provide the right patterns for the target architecture, and those packages were validated locally during this investigation.

## Key Links

- Primary design doc: `design-doc/01-independent-review-and-implementation-guide-for-geppetto-pinocchio-and-sem-extraction-widgets.md`
- Investigation diary: `reference/01-investigation-diary.md`
- Earlier draft analysis: `analysis/01-geppetto-pinocchio-streaming-structured-extraction-architecture-analysis.md`
- Related files: see frontmatter `RelatedFiles`

## Status

Current status: **active**

Current deliverables in this workspace:

- independent code review of the current local stack,
- evidence-backed mapping to geppetto/pinocchio/temporal-relationships,
- phased implementation guide for Cozo `hint`, `query_suggestion`, and `doc_ref` SEM widget families,
- investigation diary and validation record.

## Topics

- streaming
- structured-extraction
- geppetto
- pinocchio
- rich-widgets
- ai-completion

## Tasks

See [tasks.md](./tasks.md) for the current task list.

## Changelog

See [changelog.md](./changelog.md) for recent changes and decisions.

## Structure

- design/ - Architecture and design documents
- reference/ - Prompt packs, API contracts, context summaries
- playbooks/ - Command sequences and test procedures
- scripts/ - Temporary code and tooling
- various/ - Working notes and research
- archive/ - Deprecated or reference-only artifacts
