import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CozoSemRenderer } from "./CozoSemRenderer";

describe("CozoSemRenderer", () => {
  it("renders hint, query suggestion, and doc ref widgets", () => {
    const onInsertCode = vi.fn();

    const { rerender } = render(
      <CozoSemRenderer
        entity={{
          kind: "cozo_hint",
          status: "complete",
          data: { text: "Use an inline rule.", code: "?[x] := x = 1", chips: ["add a filter"] },
        }}
        onAskQuestion={vi.fn()}
        onInsertCode={onInsertCode}
      />,
    );

    expect(screen.getByText(/Use an inline rule/)).toBeTruthy();
    expect(screen.getByText(/Insert code/)).toBeTruthy();

    rerender(
      <CozoSemRenderer
        entity={{
          kind: "cozo_query_suggestion",
          status: "complete",
          data: { label: "Filter to age > 30", code: "?[age] := age > 30", reason: "Narrow the result set." },
        }}
        onAskQuestion={vi.fn()}
        onInsertCode={onInsertCode}
      />,
    );

    expect(screen.getByText(/Filter to age > 30/)).toBeTruthy();
    expect(screen.getByText(/Insert suggestion/)).toBeTruthy();

    rerender(
      <CozoSemRenderer
        entity={{
          kind: "cozo_doc_ref",
          status: "complete",
          data: { title: "Inline rules", section: "§2.1", body: "Rules define returned variables." },
        }}
        onAskQuestion={vi.fn()}
        onInsertCode={onInsertCode}
      />,
    );

    expect(screen.getByText(/Inline rules/)).toBeTruthy();
    expect(screen.getByText(/Rules define returned variables/)).toBeTruthy();
  });
});
