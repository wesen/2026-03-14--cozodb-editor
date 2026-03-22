import { http, HttpResponse } from "msw";
import type {
  CellRuntime,
  InsertCellPayload,
  NotebookCell,
  NotebookDocument,
  UpdateCellPayload,
} from "../transport/httpClient";

interface NotebookApiFixture {
  document: NotebookDocument;
}

interface MutableNotebookState {
  document: NotebookDocument;
  initialDocument: NotebookDocument;
}

function cloneDocument(document: NotebookDocument): NotebookDocument {
  return structuredClone(document);
}

function normalizeCells(cells: NotebookCell[]): NotebookCell[] {
  return [...cells]
    .sort((left, right) => left.position - right.position)
    .map((cell, index) => ({ ...cell, position: index }));
}

function nextTimestamp() {
  return Date.now();
}

function createCell(state: MutableNotebookState, kind: "code" | "markdown", source: string, position: number): NotebookCell {
  const timestamp = nextTimestamp();
  return {
    id: `cell_${timestamp}_${Math.random().toString(36).slice(2, 7)}`,
    notebook_id: state.document.notebook.id,
    kind,
    source,
    position,
    created_at_ms: timestamp,
    updated_at_ms: timestamp,
  };
}

function updateDocument(state: MutableNotebookState, cells: NotebookCell[], runtime?: Record<string, CellRuntime>) {
  state.document = {
    ...state.document,
    notebook: {
      ...state.document.notebook,
      updated_at_ms: nextTimestamp(),
    },
    cells: normalizeCells(cells),
    runtime: runtime ?? state.document.runtime ?? {},
  };
}

function getRuntimeForSource(cell: NotebookCell): CellRuntime {
  const source = cell.source.trim();
  const timestamp = nextTimestamp();

  if (source === "") {
    return {
      run: {
        id: `run_${cell.id}`,
        cell_id: cell.id,
        notebook_id: cell.notebook_id,
        status: "complete",
        execution_count: 1,
        finished_at_ms: timestamp,
      },
      output: {
        kind: "query_result",
        headers: [],
        rows: [],
        took: 1,
      },
    };
  }

  if (source.includes("error") || (source.includes("age > 30") && !source.includes("{name, age}"))) {
    return {
      run: {
        id: `run_${cell.id}`,
        cell_id: cell.id,
        notebook_id: cell.notebook_id,
        status: "error",
        execution_count: 1,
        finished_at_ms: timestamp,
      },
      output: {
        kind: "error_result",
        display: "Evaluation failed: variable age is not bound in this clause.",
        message: "Evaluation failed: variable age is not bound in this clause.",
      },
    };
  }

  if (source.startsWith(":create")) {
    return {
      run: {
        id: `run_${cell.id}`,
        cell_id: cell.id,
        notebook_id: cell.notebook_id,
        status: "complete",
        execution_count: 1,
        finished_at_ms: timestamp,
      },
      output: {
        kind: "query_result",
        headers: ["status"],
        rows: [["relation created"]],
        took: 2,
      },
    };
  }

  return {
    run: {
      id: `run_${cell.id}`,
      cell_id: cell.id,
      notebook_id: cell.notebook_id,
      status: "complete",
      execution_count: 1,
      finished_at_ms: timestamp,
    },
    output: {
      kind: "query_result",
      headers: ["name", "age"],
      rows: [
        ["Ada", 31],
        ["Grace", 42],
      ],
      took: 4,
    },
  };
}

export function createNotebookFixture(): NotebookDocument {
  const notebookId = "nb_storybook";
  const now = Date.now();

  return {
    notebook: {
      id: notebookId,
      title: "Storybook Notebook",
      created_at_ms: now - 86_400_000,
      updated_at_ms: now - 3_600_000,
    },
    cells: [
      {
        id: "cell_intro",
        notebook_id: notebookId,
        kind: "markdown",
        source: "## Storybook Notebook\n\nEdit cells, run queries, and add new cells.",
        position: 0,
        created_at_ms: now - 86_400_000,
        updated_at_ms: now - 86_400_000,
      },
      {
        id: "cell_query",
        notebook_id: notebookId,
        kind: "code",
        source: "?[name, age] := *users{name, age}, age > 30",
        position: 1,
        created_at_ms: now - 86_400_000,
        updated_at_ms: now - 3_600_000,
      },
      {
        id: "cell_broken",
        notebook_id: notebookId,
        kind: "code",
        source: "?[name] := *users{name}, age > 30 -- error",
        position: 2,
        created_at_ms: now - 86_400_000,
        updated_at_ms: now - 1_800_000,
      },
    ],
    runtime: {},
  };
}

export function createNotebookApiHandlers(fixture: NotebookApiFixture) {
  const state: MutableNotebookState = {
    document: cloneDocument(fixture.document),
    initialDocument: cloneDocument(fixture.document),
  };

  return [
    http.get("/api/notebooks/bootstrap", () => HttpResponse.json(cloneDocument(state.document))),

    http.patch("/api/notebooks/:notebookId", async ({ request, params }) => {
      if (params.notebookId !== state.document.notebook.id) {
        return HttpResponse.json({ ok: false, message: "Notebook not found" }, { status: 404 });
      }

      const body = await request.json() as { title?: string };
      state.document = {
        ...state.document,
        notebook: {
          ...state.document.notebook,
          title: body.title || state.document.notebook.title,
          updated_at_ms: nextTimestamp(),
        },
      };

      return HttpResponse.json(cloneDocument(state.document));
    }),

    http.post("/api/notebooks/:notebookId/cells", async ({ request, params }) => {
      if (params.notebookId !== state.document.notebook.id) {
        return HttpResponse.json({ ok: false, message: "Notebook not found" }, { status: 404 });
      }

      const body = await request.json() as InsertCellPayload;
      const currentCells = normalizeCells(state.document.cells);
      const afterIndex = body.after_cell_id
        ? currentCells.findIndex((cell) => cell.id === body.after_cell_id)
        : currentCells.length - 1;
      const insertIndex = afterIndex >= 0 ? afterIndex + 1 : currentCells.length;
      const nextCells = [...currentCells];
      nextCells.splice(insertIndex, 0, createCell(state, body.kind, body.source, insertIndex));
      updateDocument(state, nextCells);
      const insertedCell = state.document.cells[insertIndex];
      if (!insertedCell) {
        return HttpResponse.json({ ok: false, message: "Failed to insert cell" }, { status: 500 });
      }
      return HttpResponse.json({ document: cloneDocument(state.document), cell: insertedCell });
    }),

    http.post("/api/notebooks/:notebookId/clear", ({ params }) => {
      if (params.notebookId !== state.document.notebook.id) {
        return HttpResponse.json({ ok: false, message: "Notebook not found" }, { status: 404 });
      }

      state.document = cloneDocument(state.initialDocument);
      state.document.runtime = {};
      return HttpResponse.json(cloneDocument(state.document));
    }),

    http.patch("/api/notebook-cells/:cellId", async ({ request, params }) => {
      const cellId = params.cellId as string;
      const body = await request.json() as UpdateCellPayload;
      const cells = state.document.cells.map((cell) => (
        cell.id === cellId
          ? {
              ...cell,
              kind: (body.kind as NotebookCell["kind"]) || cell.kind,
              source: body.source ?? cell.source,
              updated_at_ms: nextTimestamp(),
            }
          : cell
      ));
      updateDocument(state, cells);
      const updatedCell = state.document.cells.find((cell) => cell.id === cellId);
      if (!updatedCell) {
        return HttpResponse.json({ ok: false, message: "Cell not found" }, { status: 404 });
      }
      return HttpResponse.json(updatedCell);
    }),

    http.post("/api/notebook-cells/:cellId/move", async ({ request, params }) => {
      const cellId = params.cellId as string;
      const body = await request.json() as { target_index: number };
      const cells = normalizeCells(state.document.cells);
      const currentIndex = cells.findIndex((cell) => cell.id === cellId);
      if (currentIndex < 0) {
        return HttpResponse.json({ ok: false, message: "Cell not found" }, { status: 404 });
      }
      const [cell] = cells.splice(currentIndex, 1);
      if (!cell) {
        return HttpResponse.json({ ok: false, message: "Cell not found" }, { status: 404 });
      }
      cells.splice(Math.max(0, Math.min(body.target_index, cells.length)), 0, cell);
      updateDocument(state, cells);
      return HttpResponse.json({ document: cloneDocument(state.document) });
    }),

    http.delete("/api/notebook-cells/:cellId", ({ params }) => {
      const cellId = params.cellId as string;
      const cells = state.document.cells.filter((cell) => cell.id !== cellId);
      updateDocument(state, cells);
      return HttpResponse.json({ document: cloneDocument(state.document) });
    }),

    http.post("/api/notebook-cells/:cellId/run", ({ params }) => {
      const cellId = params.cellId as string;
      const cell = state.document.cells.find((entry) => entry.id === cellId);
      if (!cell) {
        return HttpResponse.json({ ok: false, message: "Cell not found" }, { status: 404 });
      }

      const runtime = getRuntimeForSource(cell);
      state.document = {
        ...state.document,
        runtime: {
          ...(state.document.runtime || {}),
          [cellId]: runtime,
        },
      };

      return HttpResponse.json(runtime);
    }),

    http.post("/api/runtime/reset-kernel", () => {
      state.document = {
        ...state.document,
        runtime: {},
      };
      return HttpResponse.json({
        ok: true,
        kernel_generation: 2,
      });
    }),
  ];
}
