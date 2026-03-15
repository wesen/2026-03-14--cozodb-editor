import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CozoSemRenderer } from "./CozoSemRenderer";

afterEach(() => {
  cleanup();
});

describe("CozoSemRenderer", () => {
  it("renders a foldable thread with a hint and child widgets", () => {
    const onInsertCode = vi.fn();

    render(
      <CozoSemRenderer
        thread={{
          id: "cozo-bundle:bundle-render",
          bundle: {
            id: "cozo-bundle:bundle-render",
            kind: "cozo_bundle",
            anchorLine: 2,
          },
          anchorLine: 2,
          hint: {
            id: "cozo-item:bundle-render:hint:1",
            kind: "cozo_hint",
            status: "complete",
            data: { text: "Use an inline rule.", code: "?[x] := x = 1", chips: ["add a filter"] },
          },
          children: [
            {
              id: "cozo-item:bundle-render:query_suggestion:2",
              kind: "cozo_query_suggestion",
              status: "complete",
              data: { label: "Filter to age > 30", code: "?[age] := age > 30", reason: "Narrow the result set." },
            },
            {
              id: "cozo-item:bundle-render:doc_ref:3",
              kind: "cozo_doc_ref",
              status: "complete",
              data: { title: "Inline rules", section: "§2.1", body: "Rules define returned variables." },
            },
          ],
        }}
        onDismiss={vi.fn()}
        onAskQuestion={vi.fn()}
        onInsertCode={onInsertCode}
        onToggleCollapse={vi.fn()}
      />,
    );

    expect(screen.getByText(/SEM THREAD/)).toBeTruthy();
    expect(screen.getByText(/Use an inline rule/)).toBeTruthy();
    expect(screen.getByText(/Insert code/)).toBeTruthy();
    expect(screen.getByText(/Filter to age > 30/)).toBeTruthy();
    expect(screen.getByText(/Insert suggestion/)).toBeTruthy();
    expect(screen.getByText(/Inline rules/)).toBeTruthy();
    expect(screen.getByText(/Rules define returned variables/)).toBeTruthy();
    expect(screen.getByText(/Line 3/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fold/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Dismiss/ })).toBeTruthy();
  });

  it("renders the collapsed summary state", () => {
    render(
      <CozoSemRenderer
        thread={{
          id: "hint-2",
          anchorLine: null,
          hint: {
            id: "hint-2",
            kind: "cozo_hint",
            status: "complete",
            data: { text: "Use an inline rule." },
          },
          children: [],
        }}
        collapsed
        onDismiss={vi.fn()}
        onAskQuestion={vi.fn()}
        onInsertCode={vi.fn()}
        onToggleCollapse={vi.fn()}
      />,
    );

    expect(screen.getByText(/Use an inline rule/)).toBeTruthy();
    expect(screen.queryByText(/Hint with structured follow-up items/)).toBeNull();
    expect(screen.getByRole("button", { name: /Expand/ })).toBeTruthy();
  });

  it("uses the first child summary when a bundle has no hint", () => {
    render(
      <CozoSemRenderer
        thread={{
          id: "cozo-bundle:bundle-child-only",
          bundle: {
            id: "cozo-bundle:bundle-child-only",
            kind: "cozo_bundle",
            anchorLine: null,
          },
          anchorLine: null,
          hint: null,
          children: [
            {
              id: "cozo-item:bundle-child-only:query_suggestion:2",
              kind: "cozo_query_suggestion",
              status: "complete",
              data: { label: "Add a filter", code: "?[x] := x > 1" },
            },
          ],
        }}
        collapsed
        onDismiss={vi.fn()}
        onAskQuestion={vi.fn()}
        onInsertCode={vi.fn()}
        onToggleCollapse={vi.fn()}
      />,
    );

    expect(screen.getByText(/SEM ITEM/)).toBeTruthy();
    expect(screen.getByText(/Add a filter/)).toBeTruthy();
    expect(screen.getByText(/Global/)).toBeTruthy();
  });
});
