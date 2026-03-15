import { describe, expect, it } from "vitest";
import {
  applySemEvent,
  createSemProjectionState,
  getCompletedHintEntries,
  getInlineSemEntities,
  getInlineSemThreads,
  getStreamingEntries,
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

  it("preserves compatibility hint entries until the legacy path is retired", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "hint.result",
      id: "hint-7",
      data: { text: "final", chips: ["next"] },
    });

    expect(getCompletedHintEntries(state)).toEqual([
      ["hint-7", { text: "final", chips: ["next"] }],
    ]);
  });

  it("promotes cozo preview entities to final entities using the canonical item id", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.hint.preview",
      id: "event-preview-id",
      data: {
        itemId: "cozo-item-1",
        transient: true,
        data: { text: "preview hint" },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "event-final-id",
      data: {
        itemId: "cozo-item-1",
        transient: false,
        data: { text: "final hint", code: "?[x] := x = 1" },
      },
    });

    expect(state.order).toEqual(["cozo-item-1"]);
    expect(state.entities["cozo-item-1"]).toMatchObject({
      id: "cozo-item-1",
      kind: "cozo_hint",
      status: "complete",
      transient: false,
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
        data: {
          itemId,
          transient: true,
          data: finalData,
        },
      });
      state = applySemEvent(state, {
        type: finalType,
        id: `${itemId}-final`,
        data: {
          itemId,
          transient: false,
          data: finalData,
        },
      });

      expect(state.entities[itemId]).toMatchObject({
        id: itemId,
        kind: expectedKind,
        status: "complete",
        transient: false,
        data: finalData,
      });
    });
  });

  it("routes anchored entities inline and unanchored entities to the trailing selector", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.query_suggestion.extracted",
      id: "suggestion-event",
      data: {
        itemId: "suggestion-1",
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
      data: {
        itemId: "doc-1",
        data: {
          title: "Inline rules",
          body: "Rules define returned variables.",
        },
      },
    });

    expect(getInlineSemEntities(state, 3).map((entity) => entity.id)).toEqual(["suggestion-1"]);
    expect(getTrailingSemEntities(state).map((entity) => entity.id)).toEqual(["doc-1"]);
  });

  it("groups hint threads with their structured child entities", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, {
      type: "cozo.hint.extracted",
      id: "hint-event",
      data: {
        itemId: "hint-1",
        data: {
          text: "Use an inline rule.",
          anchor: { line: 4 },
        },
      },
    });
    state = applySemEvent(state, {
      type: "cozo.query_suggestion.extracted",
      id: "query-event",
      data: {
        itemId: "query-1",
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
      data: {
        itemId: "doc-1",
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
      data: {
        itemId: "doc-2",
        data: {
          title: "Global reference",
          body: "Applies across the notebook.",
        },
      },
    });

    expect(getInlineSemThreads(state, 4)).toEqual([
      {
        id: "hint-1",
        hint: state.entities["hint-1"],
        children: [state.entities["query-1"], state.entities["doc-1"]],
        anchorLine: 4,
      },
    ]);
    expect(getTrailingSemThreads(state)).toEqual([
      {
        id: "doc-2",
        hint: null,
        children: [state.entities["doc-2"]],
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
});
