import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "../app/store";
import { runNotebookCell } from "../transport/httpClient";
import { NotebookCellCard } from "./NotebookCellCard";
import { notebookLoaded, setActiveCellId } from "./state/notebookSlice";

vi.mock("../transport/httpClient", () => ({
  bootstrapNotebook: vi.fn(),
  deleteNotebookCell: vi.fn(),
  insertNotebookCell: vi.fn(),
  moveNotebookCell: vi.fn(),
  runNotebookCell: vi.fn(),
  updateNotebookCell: vi.fn(),
  updateNotebookTitle: vi.fn(),
}));

const baseDocument = {
  notebook: {
    id: "nb_1",
    title: "Notebook",
    created_at_ms: 1000,
    updated_at_ms: 1000,
  },
  cells: [
    {
      id: "cell_1",
      notebook_id: "nb_1",
      kind: "code" as const,
      source: "?[x] := [[1]]",
      position: 0,
      created_at_ms: 1000,
      updated_at_ms: 1000,
    },
  ],
  runtime: {},
};

function renderCellCard() {
  const store = makeStore();
  const onRunAndInsertBelow = vi.fn();

  store.dispatch(notebookLoaded(structuredClone(baseDocument)));
  store.dispatch(setActiveCellId("cell_1"));

  render(
    <Provider store={store}>
      <NotebookCellCard
        cellId="cell_1"
        cellIndex={0}
        onAskAI={vi.fn()}
        onDiagnose={vi.fn()}
        onRunAndInsertBelow={onRunAndInsertBelow}
        wsConnected={false}
      />
    </Provider>,
  );

  return {
    editor: screen.getByRole("textbox"),
    onRunAndInsertBelow,
  };
}

describe("NotebookCellCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("starts editors at one row", () => {
    const { editor } = renderCellCard();

    expect(editor.getAttribute("rows")).toBe("1");
  });

  it("runs and inserts below on ctrl+enter", () => {
    const { editor, onRunAndInsertBelow } = renderCellCard();

    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(onRunAndInsertBelow).toHaveBeenCalledWith("cell_1");
  });

  it("keeps shift+enter as run", async () => {
    vi.mocked(runNotebookCell).mockResolvedValue({
      run: {
        id: "run_1",
        cell_id: "cell_1",
        notebook_id: "nb_1",
        status: "complete",
        execution_count: 1,
      },
    });

    const { editor, onRunAndInsertBelow } = renderCellCard();

    fireEvent.keyDown(editor, { key: "Enter", shiftKey: true });

    await waitFor(() => {
      expect(runNotebookCell).toHaveBeenCalledWith("cell_1");
    });
    expect(onRunAndInsertBelow).not.toHaveBeenCalled();
  });
});
