import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSemProjectionState } from "../sem/semProjection";
import { NotebookCellCard } from "./NotebookCellCard";

const baseCell = {
  id: "cell_1",
  notebook_id: "nb_1",
  kind: "code" as const,
  source: "?[x] := [[1]]",
  position: 0,
  created_at_ms: 1000,
  updated_at_ms: 1000,
};

function renderCellCard() {
  const onRun = vi.fn();
  const onRunAndInsertBelow = vi.fn();

  render(
    <NotebookCellCard
      aiPrompt=""
      cell={baseCell}
      cellIndex={0}
      isActive
      collapsedThreads={{}}
      dismissedThreads={{}}
      executionState={{ dirty: false, hasRun: false, mutationRisk: "read_only", stale: false }}
      onAskAI={vi.fn()}
      onChangeSource={vi.fn()}
      onDelete={vi.fn()}
      onDiagnose={vi.fn()}
      onDismissThread={vi.fn()}
      onFocus={vi.fn()}
      onInsertCodeBelow={vi.fn()}
      onInsertMarkdownBelow={vi.fn()}
      onMoveDown={vi.fn()}
      onMoveUp={vi.fn()}
      onPersistSource={vi.fn()}
      onRun={onRun}
      onRunAndInsertBelow={onRunAndInsertBelow}
      onSetAIPrompt={vi.fn()}
      onToggleThreadCollapse={vi.fn()}
      runtime={undefined}
      semProjection={createSemProjectionState()}
      wsConnected={false}
    />,
  );

  return {
    editor: screen.getByRole("textbox"),
    onRun,
    onRunAndInsertBelow,
  };
}

describe("NotebookCellCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("starts editors at one row", () => {
    const { editor } = renderCellCard();

    expect(editor.getAttribute("rows")).toBe("1");
  });

  it("runs and inserts below on ctrl+enter", () => {
    const { editor, onRun, onRunAndInsertBelow } = renderCellCard();

    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(onRunAndInsertBelow).toHaveBeenCalledWith("cell_1");
    expect(onRun).not.toHaveBeenCalled();
  });

  it("keeps shift+enter as run", () => {
    const { editor, onRun, onRunAndInsertBelow } = renderCellCard();

    fireEvent.keyDown(editor, { key: "Enter", shiftKey: true });

    expect(onRun).toHaveBeenCalledWith("cell_1");
    expect(onRunAndInsertBelow).not.toHaveBeenCalled();
  });
});
