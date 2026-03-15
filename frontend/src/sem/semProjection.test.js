import { describe, expect, it } from "vitest";
import {
  applySemEvent,
  createSemProjectionState,
  getCompletedHintEntries,
  getStreamingEntries,
} from "./semProjection";

describe("semProjection", () => {
  it("coalesces repeated llm.delta events into one streaming entity", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, { type: "llm.start", id: "hint-1" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-1", data: "hello" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-1", data: " world" });

    expect(getStreamingEntries(state)).toEqual([["hint-1", "hello world"]]);
  });

  it("preserves the canonical id across streaming and final updates", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, { type: "llm.start", id: "hint-7" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-7", data: "draft" });
    state = applySemEvent(state, {
      type: "hint.result",
      id: "hint-7",
      data: { text: "final", chips: ["next"] },
    });

    expect(getStreamingEntries(state)).toEqual([]);
    expect(getCompletedHintEntries(state)).toEqual([
      ["hint-7", { text: "final", chips: ["next"] }],
    ]);
    expect(state.order).toEqual(["hint-7"]);
  });

  it("applies final-style merging rules by replacing preview state with a completed result", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, { type: "llm.start", id: "hint-9" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-9", data: "preview" });
    state = applySemEvent(state, {
      type: "hint.result",
      id: "hint-9",
      data: { text: "preview promoted to final", code: "?[x] := x = 1" },
    });

    expect(state.entities["hint-9"]).toMatchObject({
      id: "hint-9",
      status: "complete",
      text: "preview",
      response: {
        text: "preview promoted to final",
        code: "?[x] := x = 1",
      },
    });
  });

  it("removes errored streams from the streaming selector", () => {
    let state = createSemProjectionState();

    state = applySemEvent(state, { type: "llm.start", id: "hint-err" });
    state = applySemEvent(state, { type: "llm.delta", id: "hint-err", data: "partial" });
    state = applySemEvent(state, { type: "llm.error", id: "hint-err" });

    expect(getStreamingEntries(state)).toEqual([]);
    expect(state.entities["hint-err"].status).toBe("error");
  });
});
