import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HintResponseCard } from "./HintResponseCard";

describe("HintResponseCard", () => {
  it("renders the normalized response content", () => {
    render(
      <HintResponseCard
        collapsed={false}
        onChipClick={vi.fn()}
        onInsert={vi.fn()}
        onToggleCollapse={vi.fn()}
        response={{
          text: "Use **:create** to make a relation.",
          code: ":create users {name: String => age: Int}",
          chips: ["insert data"],
          docs: [{ title: "create", section: "§6.1", body: "Creates a stored relation." }],
        }}
      />,
    );

    expect(screen.getByText(/Use/)).toBeTruthy();
    expect(screen.getByText("insert data")).toBeTruthy();
    expect(screen.getByText(/Insert code/)).toBeTruthy();
    expect(screen.getByText(/copy/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /create/i })).toBeTruthy();
  });
});
