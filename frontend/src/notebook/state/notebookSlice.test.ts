import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeStore } from "../../app/store";
import {
  bootstrapNotebook,
  clearNotebook,
  insertNotebookCell,
  resetNotebookKernel,
  runNotebookCell,
  updateNotebookCell,
  type CellRuntime,
  type NotebookDocument,
} from "../../transport/httpClient";
import {
  clearCurrentNotebook,
  insertNotebookCellBelow,
  loadNotebook,
  resetNotebookKernelState,
  runNotebookCellById,
  runtimeUpdated,
  semEventProjected,
  selectNotebookDocument,
  selectNotebookRuntimeByCell,
  selectSemProjection,
  setCellSource,
} from "./notebookSlice";

vi.mock("../../transport/httpClient", () => ({
  bootstrapNotebook: vi.fn(),
  clearNotebook: vi.fn(),
  deleteNotebookCell: vi.fn(),
  insertNotebookCell: vi.fn(),
  moveNotebookCell: vi.fn(),
  resetNotebookKernel: vi.fn(),
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
    vi.mocked(clearNotebook).mockResolvedValue(structuredClone(baseDocument));
    vi.mocked(resetNotebookKernel).mockResolvedValue({ ok: true, kernel_generation: 2 });
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

  it("clears notebook cells back to the server starter document", async () => {
    const store = makeStore();
    const clearedDocument: NotebookDocument = {
      notebook: structuredClone(baseDocument.notebook),
      cells: [
        {
          id: "cell_intro",
          notebook_id: "nb_1",
          kind: "markdown",
          source: "## Cozo Notebook",
          position: 0,
          created_at_ms: 2000,
          updated_at_ms: 2000,
        },
        {
          id: "cell_query",
          notebook_id: "nb_1",
          kind: "code",
          source: "?[x] <- [[1], [2], [3]]",
          position: 1,
          created_at_ms: 2000,
          updated_at_ms: 2000,
        },
      ],
      runtime: {},
    };

    vi.mocked(clearNotebook).mockResolvedValue(clearedDocument);

    await store.dispatch(loadNotebook());
    store.dispatch(setCellSource({ cellId: "cell_1", source: "?[x] := [[999]]" }));

    await store.dispatch(clearCurrentNotebook());

    expect(selectNotebookDocument(store.getState())?.cells.map((cell) => cell.id)).toEqual(["cell_intro", "cell_query"]);
    expect(selectNotebookDocument(store.getState())?.cells[1]?.source).toBe("?[x] <- [[1], [2], [3]]");
  });

  it("clears runtime and sem state on kernel reset while preserving cells", async () => {
    const store = makeStore();

    await store.dispatch(loadNotebook());
    store.dispatch(runtimeUpdated({
      cellId: "cell_1",
      runtime: {
        run: {
          id: "run_1",
          cell_id: "cell_1",
          notebook_id: "nb_1",
          status: "complete",
          execution_count: 1,
        },
      },
    }));
    store.dispatch(semEventProjected({
      type: "hint.result",
      id: "hint-1",
      data: {
        notebookId: "nb_1",
        ownerCellId: "cell_1",
        text: "Try a join here.",
      },
    }));

    await store.dispatch(resetNotebookKernelState());

    expect(selectNotebookDocument(store.getState())?.cells.map((cell) => cell.id)).toEqual(["cell_1"]);
    expect(selectNotebookRuntimeByCell(store.getState())).toEqual({});
    expect(selectSemProjection(store.getState()).order).toEqual([]);
  });
});
