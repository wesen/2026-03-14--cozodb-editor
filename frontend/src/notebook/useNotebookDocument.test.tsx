import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapNotebook,
  deleteNotebookCell,
  insertNotebookCell,
  moveNotebookCell,
  runNotebookCell,
  updateNotebookCell,
  updateNotebookTitle,
  type CellRuntime,
  type NotebookDocument,
} from "../transport/httpClient";
import { useNotebookDocument } from "./useNotebookDocument";

vi.mock("../transport/httpClient", () => ({
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

describe("useNotebookDocument", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(bootstrapNotebook).mockResolvedValue(structuredClone(baseDocument));
    vi.mocked(deleteNotebookCell).mockResolvedValue({ document: structuredClone(baseDocument) });
    vi.mocked(insertNotebookCell).mockResolvedValue({ document: structuredClone(baseDocument), cell: baseDocument.cells[0]! });
    vi.mocked(moveNotebookCell).mockResolvedValue({ document: structuredClone(baseDocument) });
    vi.mocked(updateNotebookTitle).mockResolvedValue(structuredClone(baseDocument));
  });

  it("persists dirty cell source before running", async () => {
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

    const { result } = renderHook(() => useNotebookDocument());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.document?.cells[0]?.source).toBe("?[x] := [[1]]");
    });

    act(() => {
      result.current.setCellSource("cell_1", "?[x] := [[42]]");
    });

    await act(async () => {
      const nextRuntime = await result.current.runCell("cell_1");
      expect(nextRuntime).toEqual(runtime);
    });

    expect(updateNotebookCell).toHaveBeenCalledWith("cell_1", {
      kind: "code",
      source: "?[x] := [[42]]",
    });
    expect(runNotebookCell).toHaveBeenCalledWith("cell_1");
  });

  it("preserves dirty local drafts when an insert response replaces notebook order", async () => {
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

    const { result } = renderHook(() => useNotebookDocument());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setCellSource("cell_1", "?[x] := [[42]]");
    });

    await act(async () => {
      const inserted = await result.current.insertCellAfter("cell_1", "code", "?[y] := [[2]]");
      expect(inserted?.id).toBe("cell_2");
    });

    expect(result.current.document?.cells.map((cell) => cell.id)).toEqual(["cell_1", "cell_2"]);
    expect(result.current.document?.cells[0]?.source).toBe("?[x] := [[42]]");
  });
});
