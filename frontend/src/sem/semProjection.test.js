import { describe, expect, it } from "vitest";
import {
  applySemEvent,
  createSemProjectionState,
  ENTITY_KIND_COZO_BUNDLE,
  getInlineSemEntities,
  getInlineSemThreads,
  getSemThreadsForCell,
  getStreamingEntries,
  getStreamingEntriesForCell,
  getTrailingSemEntities,
  getTrailingSemThreads,
} from "./semProjection";

describe("semProjection", () => {
  it("coalesces repeated llm.delta events into one streaming entity", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, { type: "llm.start", id: "hint-1" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-1", data: "hello" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-1", data: " world" });

    expect(getStreamingEntries(state)).toEqual([["hint-1", "hello world"]]);
  });

  it("trims trailing whitespace from streaming text for display", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, { type: "llm.start", id: "hint-2" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-2", data: "hello world\n\n" });

    expect(getStreamingEntries(state)).toEqual([["hint-2", "hello world"]]);
  });

  it("groups streaming entries and threads by ownerCellId for notebook rendering", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "llm.start",
      id: "hint-cell-1",
      data: { ownerCellId: "cell_a", notebookId: "nbk_a", runId: "run_a" },
    });
    state = applySemEvent(state, {
      type: "llm.delta",
      id: "hint-cell-1",
      data: { delta: "explain this query\n", ownerCellId: "cell_a", notebookId: "nbk_a", runId: "run_a" },
    });
    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "hint-cell-a",
      stream_id: "bundle-cell-a",
      data: {
        itemId: "cozo-item:bundle-cell-a:hint:1",
        bundleId: "bundle-cell-a",
        parentId: "cozo-bundle:bundle-cell-a",
        ordinal: 1,
        ownerCellId: "cell_a",
        notebookId: "nbk_a",
        runId: "run_a",
        data: {
          text: "Use a rule head to project your variables.",
        },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "hint-cell-b",
      stream_id: "bundle-cell-b",
      data: {
        itemId: "cozo-item:bundle-cell-b:hint:1",
        bundleId: "bundle-cell-b",
        parentId: "cozo-bundle:bundle-cell-b",
        ordinal: 1,
        ownerCellId: "cell_b",
        notebookId: "nbk_a",
        runId: "run_b",
        data: {
          text: "This belongs to another cell.",
        },
      },
    });

    expect(getStreamingEntriesForCell(state, "cell_a")).toEqual([["hint-cell-1", "explain this query"]]);
    expect(getStreamingEntriesForCell(state, "cell_b")).toEqual([]);
    expect(getSemThreadsForCell(state, "cell_a").map((thread) => thread.id)).toEqual(["cozo-bundle:bundle-cell-a"]);
    expect(getSemThreadsForCell(state, "cell_b").map((thread) => thread.id)).toEqual(["cozo-bundle:bundle-cell-b"]);
  });

  it("ignores non-diagnosis hint.result events now that the SEM path is authoritative", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "hint.result",
      id: "hint-7",
      data: { text: "final", chips: ["next"] },
    });

    expect(state).toEqual(createSemProjectionState());
  });

  it("promotes cozo preview entities to final entities using the canonical item id", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.hint.preview",
      id: "event-preview-id",
      stream_id: "bundle-1",
      data: {
        itemId: "cozo-item-1",
        bundleId: "bundle-1",
        parentId: "cozo-bundle:bundle-1",
        ordinal: 1,
        transient: true,
        data: { text: "preview hint" },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "event-final-id",
      stream_id: "bundle-1",
      data: {
        itemId: "cozo-item-1",
        bundleId: "bundle-1",
        parentId: "cozo-bundle:bundle-1",
        ordinal: 1,
        transient: false,
        data: { text: "final hint", code: "?[x] := x = 1" },
      },
    });

    expect(state.entities["cozo-bundle:bundle-1"]).toMatchObject({
      id: "cozo-bundle:bundle-1",
      kind: ENTITY_KIND_COZO_BUNDLE,
      bundleId: "bundle-1",
      status: "complete",
    });
    expect(state.entities["cozo-item-1"]).toMatchObject({
      id: "cozo-item-1",
      kind: "cozo_hint",
      status: "complete",
      transient: false,
      parentId: "cozo-bundle:bundle-1",
      bundleId: "bundle-1",
      ordinal: 1,
      data: { text: "final hint", code: "?[x] := x = 1" },
    });
  });

  it("promotes previews to finals for every cozo widget family", () => {
    const cases = [
      {
        previewType: "cozo.hint.preview",
        finalType: "cozo.hint.extracted",
        itemId: "hint-family-1",
        expectedKind: "cozo_hint",
        finalData: { text: "final hint" },
      },
      {
        previewType: "cozo.query_suggestion.preview",
        finalType: "cozo.query_suggestion.extracted",
        itemId: "query-family-1",
        expectedKind: "cozo_query_suggestion",
        finalData: { label: "Add filter", code: "?[x] := x > 1" },
      },
      {
        previewType: "cozo.doc_ref.preview",
        finalType: "cozo.doc_ref.extracted",
        itemId: "doc-family-1",
        expectedKind: "cozo_doc_ref",
        finalData: { title: "Inline rules", body: "Rules define returned variables." },
      },
    ];

    cases.forEach(({ previewType, finalType, itemId, expectedKind, finalData }) => {
      let state = createSemProjectionState();

      state = applySemEvent(state, {
        type: previewType,
        id: `${itemId}-preview`,
        stream_id: `${itemId}-bundle`,
        data: {
          itemId,
          bundleId: `${itemId}-bundle`,
          parentId: `cozo-bundle:${itemId}-bundle`,
          ordinal: 1,
          transient: true,
          data: finalData,
        },
      });
      state = applySemEvent(state, {
        type: finalType,
        id: `${itemId}-final`,
        stream_id: `${itemId}-bundle`,
        data: {
          itemId,
          bundleId: `${itemId}-bundle`,
          parentId: `cozo-bundle:${itemId}-bundle`,
          ordinal: 1,
          transient: false,
          data: finalData,
        },
      });

      expect(state.entities[itemId]).toMatchObject({
        id: itemId,
        kind: expectedKind,
        status: "complete",
        transient: false,
        bundleId: `${itemId}-bundle`,
        parentId: `cozo-bundle:${itemId}-bundle`,
        ordinal: 1,
        data: finalData,
      });
    });
  });

  it("routes anchored entities inline and unanchored entities to the trailing selector", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.query_suggestion.extracted",
      id: "suggestion-event",
      stream_id: "bundle-inline",
      data: {
        itemId: "suggestion-1",
        bundleId: "bundle-inline",
        parentId: "cozo-bundle:bundle-inline",
        ordinal: 1,
        data: {
          label: "Add a filter",
          code: "?[name] := *users{name}, age > 30",
          anchor: { line: 3 },
        },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.doc_ref.extracted",
      id: "doc-event",
      stream_id: "bundle-global",
      data: {
        itemId: "cozo-item:bundle-global:doc_ref:1",
        bundleId: "bundle-global",
        parentId: "cozo-bundle:bundle-global",
        ordinal: 1,
        data: {
          title: "Inline rules",
          body: "Rules define returned variables.",
        },
      },
    });

    expect(getInlineSemEntities(state, 3).map((entity) => entity.id)).toEqual(["suggestion-1"]);
    expect(getTrailingSemEntities(state).map((entity) => entity.id)).toEqual(["cozo-item:bundle-global:doc_ref:1"]);
  });

  it("groups hint threads with their structured child entities", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "hint-event",
      stream_id: "bundle-thread",
      data: {
        itemId: "cozo-item:bundle-thread:hint:1",
        bundleId: "bundle-thread",
        parentId: "cozo-bundle:bundle-thread",
        ordinal: 1,
        data: {
          text: "Use an inline rule.",
          anchor: { line: 4 },
        },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.query_suggestion.extracted",
      id: "query-event",
      stream_id: "bundle-thread",
      data: {
        itemId: "cozo-item:bundle-thread:query_suggestion:2",
        bundleId: "bundle-thread",
        parentId: "cozo-bundle:bundle-thread",
        ordinal: 2,
        data: {
          label: "Add a filter",
          code: "?[name] := *users{name}, age > 30",
          anchor: { line: 4 },
        },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.doc_ref.extracted",
      id: "doc-event",
      stream_id: "bundle-thread",
      data: {
        itemId: "cozo-item:bundle-thread:doc_ref:3",
        bundleId: "bundle-thread",
        parentId: "cozo-bundle:bundle-thread",
        ordinal: 3,
        data: {
          title: "Inline rules",
          body: "Rules define returned variables.",
          anchor: { line: 4 },
        },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.doc_ref.extracted",
      id: "trailing-doc-event",
      stream_id: "bundle-global",
      data: {
        itemId: "cozo-item:bundle-global:doc_ref:1",
        bundleId: "bundle-global",
        parentId: "cozo-bundle:bundle-global",
        ordinal: 1,
        data: {
          title: "Global reference",
          body: "Applies across the notebook.",
        },
      },
    });

    expect(getInlineSemThreads(state, 4)).toEqual([
      {
        id: "cozo-bundle:bundle-thread",
        bundle: state.entities["cozo-bundle:bundle-thread"],
        hint: state.entities["cozo-item:bundle-thread:hint:1"],
        children: [
          state.entities["cozo-item:bundle-thread:query_suggestion:2"],
          state.entities["cozo-item:bundle-thread:doc_ref:3"],
        ],
        anchorLine: 4,
      },
    ]);
    expect(getTrailingSemThreads(state)).toEqual([
      {
        id: "cozo-bundle:bundle-global",
        bundle: state.entities["cozo-bundle:bundle-global"],
        hint: null,
        children: [state.entities["cozo-item:bundle-global:doc_ref:1"]],
        anchorLine: null,
      },
    ]);
  });

  it("keeps errored cozo entities in the projection for widget-level error rendering", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.doc_ref.failed",
      id: "doc-failed-event",
      data: {
        itemId: "doc-failed-1",
        error: "invalid payload",
      },
    });

    expect(state.entities["doc-failed-1"]).toMatchObject({
      id: "doc-failed-1",
      kind: "cozo_doc_ref",
      status: "error",
      error: "invalid payload",
    });
  });

  it("keeps explicitly grouped bundles separate even when events interleave", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.query_suggestion.preview",
      id: "bundle-a-query-preview",
      stream_id: "bundle-a",
      data: {
        itemId: "cozo-item:bundle-a:query_suggestion:2",
        bundleId: "bundle-a",
        parentId: "cozo-bundle:bundle-a",
        ordinal: 2,
        transient: true,
        data: { label: "A query", code: "?[x] := x = 1", anchor: { line: 1 } },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.hint.preview",
      id: "bundle-b-hint-preview",
      stream_id: "bundle-b",
      data: {
        itemId: "cozo-item:bundle-b:hint:1",
        bundleId: "bundle-b",
        parentId: "cozo-bundle:bundle-b",
        ordinal: 1,
        transient: true,
        data: { text: "Bundle B hint", anchor: { line: 1 } },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "bundle-a-hint-final",
      stream_id: "bundle-a",
      data: {
        itemId: "cozo-item:bundle-a:hint:1",
        bundleId: "bundle-a",
        parentId: "cozo-bundle:bundle-a",
        ordinal: 1,
        transient: false,
        data: { text: "Bundle A hint", anchor: { line: 1 } },
      },
    });

    expect(getInlineSemThreads(state, 1)).toEqual([
      {
        id: "cozo-bundle:bundle-a",
        bundle: state.entities["cozo-bundle:bundle-a"],
        hint: state.entities["cozo-item:bundle-a:hint:1"],
        children: [state.entities["cozo-item:bundle-a:query_suggestion:2"]],
        anchorLine: 1,
      },
      {
        id: "cozo-bundle:bundle-b",
        bundle: state.entities["cozo-bundle:bundle-b"],
        hint: state.entities["cozo-item:bundle-b:hint:1"],
        children: [],
        anchorLine: 1,
      },
    ]);
  });

  it("orders bundle children by ordinal even when the hint arrives after a child", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.doc_ref.preview",
      id: "bundle-c-doc-preview",
      stream_id: "bundle-c",
      data: {
        itemId: "cozo-item:bundle-c:doc_ref:3",
        bundleId: "bundle-c",
        parentId: "cozo-bundle:bundle-c",
        ordinal: 3,
        transient: true,
        data: { title: "Doc C", body: "Context", anchor: { line: 6 } },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.query_suggestion.preview",
      id: "bundle-c-query-preview",
      stream_id: "bundle-c",
      data: {
        itemId: "cozo-item:bundle-c:query_suggestion:2",
        bundleId: "bundle-c",
        parentId: "cozo-bundle:bundle-c",
        ordinal: 2,
        transient: true,
        data: { label: "Query C", code: "?[x] := x = 1", anchor: { line: 6 } },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "bundle-c-hint-final",
      stream_id: "bundle-c",
      data: {
        itemId: "cozo-item:bundle-c:hint:1",
        bundleId: "bundle-c",
        parentId: "cozo-bundle:bundle-c",
        ordinal: 1,
        transient: false,
        data: { text: "Bundle C hint", anchor: { line: 6 } },
      },
    });

    expect(getInlineSemThreads(state, 6)).toEqual([
      {
        id: "cozo-bundle:bundle-c",
        bundle: state.entities["cozo-bundle:bundle-c"],
        hint: state.entities["cozo-item:bundle-c:hint:1"],
        children: [
          state.entities["cozo-item:bundle-c:query_suggestion:2"],
          state.entities["cozo-item:bundle-c:doc_ref:3"],
        ],
        anchorLine: 6,
      },
    ]);
  });

  it("does not build visible threads for bundleless cozo events anymore", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "legacy-hint",
      data: {
        itemId: "legacy-hint",
        data: { text: "Legacy hint", anchor: { line: 2 } },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.doc_ref.extracted",
      id: "legacy-doc",
      data: {
        itemId: "legacy-doc",
        data: { title: "Legacy doc", body: "Legacy explanation.", anchor: { line: 2 } },
      },
    });

    expect(getInlineSemThreads(state, 2)).toEqual([]);
  });
});
