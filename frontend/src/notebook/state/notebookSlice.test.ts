import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "../../app/store";
import {
  bootstrapNotebook,
  insertNotebookCell,
  runNotebookCell,
  updateNotebookCell,
  type CellRuntime,
  type NotebookDocument,
} from "../../transport/httpClient";
import {
  insertNotebookCellBelow,
  loadNotebook,
  runNotebookCellById,
  selectNotebookDocument,
  setCellSource,
} from "./notebookSlice";

vi.mock("../../transport/httpClient", () => ({
  bootstrapNotebook: vi.fn(),
  deleteNotebookCell: vi.fn(),
  insertNotebookCell: vi.fn(),
  moveNotebookCell: vi.fn(),
  runNotebookCell: vi.fn(),
  updateNotebookCell: vi.fn(),
  updateNotebookTitle: vi.fn(),
}));

const baseDocument: NotebookDocument = {
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
      kind: "code",
      source: "?[x] := [[1]]",
      position: 0,
      created_at_ms: 1000,
      updated_at_ms: 1000,
    },
  ],
  runtime: {},
};

describe("notebookSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bootstrapNotebook).mockResolvedValue(structuredClone(baseDocument));
  });

  it("loads notebook state into normalized selectors", async () => {
    const store = makeStore();

    await store.dispatch(loadNotebook());

    expect(selectNotebookDocument(store.getState())?.cells.map((cell) => cell.id)).toEqual(["cell_1"]);
  });

  it("persists dirty cell source before running", async () => {
    const store = makeStore();
    const persistedCell = {
      ...baseDocument.cells[0]!,
      source: "?[x] := [[42]]",
      updated_at_ms: 2000,
    };
    const runtime: CellRuntime = {
      run: {
        id: "run_1",
        cell_id: "cell_1",
        notebook_id: "nb_1",
        status: "complete",
        execution_count: 1,
        started_at_ms: 3000,
        finished_at_ms: 3001,
      },
      output: {
        kind: "query_result",
        headers: ["x"],
        rows: [[42]],
      },
    };

    vi.mocked(updateNotebookCell).mockResolvedValue(persistedCell);
    vi.mocked(runNotebookCell).mockResolvedValue(runtime);

    await store.dispatch(loadNotebook());
    store.dispatch(setCellSource({ cellId: "cell_1", source: "?[x] := [[42]]" }));

    const nextRuntime = await store.dispatch(runNotebookCellById("cell_1"));

    expect(nextRuntime).toEqual(runtime);
    expect(updateNotebookCell).toHaveBeenCalledWith("cell_1", {
      kind: "code",
      source: "?[x] := [[42]]",
    });
    expect(runNotebookCell).toHaveBeenCalledWith("cell_1");
  });

  it("preserves dirty local drafts when an insert response replaces notebook order", async () => {
    const store = makeStore();
    const insertedCell = {
      id: "cell_2",
      notebook_id: "nb_1",
      kind: "code" as const,
      source: "?[y] := [[2]]",
      position: 1,
      created_at_ms: 2000,
      updated_at_ms: 2000,
    };

    vi.mocked(insertNotebookCell).mockResolvedValue({
      cell: insertedCell,
      document: {
        ...structuredClone(baseDocument),
        cells: [
          structuredClone(baseDocument.cells[0]!),
          insertedCell,
        ],
      },
    });

    await store.dispatch(loadNotebook());
    store.dispatch(setCellSource({ cellId: "cell_1", source: "?[x] := [[42]]" }));

    const inserted = await store.dispatch(insertNotebookCellBelow("cell_1", "code", "?[y] := [[2]]"));

    expect(inserted?.id).toBe("cell_2");
    expect(selectNotebookDocument(store.getState())?.cells.map((cell) => cell.id)).toEqual(["cell_1", "cell_2"]);
    expect(selectNotebookDocument(store.getState())?.cells[0]?.source).toBe("?[x] := [[42]]");
  });
});
