import { createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  bootstrapNotebook,
  deleteNotebookCell,
  insertNotebookCell,
  moveNotebookCell,
  runNotebookCell,
  updateNotebookCell,
  updateNotebookTitle,
  type CellRuntime,
  type Notebook,
  type NotebookCell,
  type NotebookDocument,
  type NotebookMutationResult,
} from "../../transport/httpClient";
import { applySemEvent, createSemProjectionState, type SemProjectionState } from "../../sem/semProjection";
import type { SemEvent } from "../../transport/hintsSocket";
import { buildNotebookExecutionState } from "../runtimeState";
import type { AppThunk, RootState } from "../../app/store";

type LoadingStatus = "idle" | "loading" | "ready" | "error";

interface APIErrorResponse {
  message: string;
  ok: false;
}

export interface NotebookState {
  activeCellId: string | null;
  aiPrompts: Record<string, string>;
  cellsById: Record<string, NotebookCell>;
  collapsedThreads: Record<string, boolean>;
  dismissedThreads: Record<string, boolean>;
  error: string | null;
  localDirtyByCellId: Record<string, true>;
  notebook: Notebook | null;
  orderedCellIds: string[];
  runtimeByCell: Record<string, CellRuntime>;
  semProjection: SemProjectionState;
  status: LoadingStatus;
}

function isAPIErrorResponse(value: unknown): value is APIErrorResponse {
  return Boolean(
    value
    && typeof value === "object"
    && "ok" in value
    && (value as { ok?: unknown }).ok === false
    && "message" in value
    && typeof (value as { message?: unknown }).message === "string",
  );
}

function getErrorMessage(response: unknown, fallback: string): string {
  return isAPIErrorResponse(response) ? response.message : fallback;
}

function normalizeCells(cells: NotebookCell[]): { cellsById: Record<string, NotebookCell>; orderedCellIds: string[] } {
  const orderedCells = [...cells].sort((left, right) => left.position - right.position);
  return {
    cellsById: Object.fromEntries(orderedCells.map((cell) => [cell.id, cell])),
    orderedCellIds: orderedCells.map((cell) => cell.id),
  };
}

function pickExistingEntries<T>(entries: Record<string, T>, allowedIds: Set<string>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(entries).filter(([id]) => allowedIds.has(id)),
  );
}

function mergeServerDocumentWithLocalDrafts(
  serverDocument: NotebookDocument,
  state: NotebookState,
): NotebookDocument {
  const dirtyIds = new Set(Object.keys(state.localDirtyByCellId));
  if (dirtyIds.size === 0) {
    return serverDocument;
  }

  return {
    ...serverDocument,
    cells: serverDocument.cells.map((cell) => {
      if (!dirtyIds.has(cell.id)) {
        return cell;
      }

      const localCell = state.cellsById[cell.id];
      if (!localCell) {
        return cell;
      }

      return {
        ...cell,
        kind: localCell.kind,
        source: localCell.source,
      };
    }),
  };
}

function applyNotebookDocumentToState(
  state: NotebookState,
  document: NotebookDocument,
  options: { clearDirty?: boolean } = {},
) {
  const nextDocument = options.clearDirty ? document : mergeServerDocumentWithLocalDrafts(document, state);
  const normalized = normalizeCells(nextDocument.cells);
  const allowedCellIds = new Set(normalized.orderedCellIds);

  state.notebook = nextDocument.notebook;
  state.cellsById = normalized.cellsById;
  state.orderedCellIds = normalized.orderedCellIds;
  state.runtimeByCell = nextDocument.runtime || {};
  state.aiPrompts = pickExistingEntries(state.aiPrompts, allowedCellIds);
  state.localDirtyByCellId = options.clearDirty ? {} : pickExistingEntries(state.localDirtyByCellId, allowedCellIds);

  if (!state.activeCellId || !allowedCellIds.has(state.activeCellId)) {
    state.activeCellId = state.orderedCellIds[0] || null;
  }
}

function reorderCellIds(orderedCellIds: string[], cellId: string, targetIndex: number): string[] {
  const currentIndex = orderedCellIds.indexOf(cellId);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedCellIds.length) {
    return orderedCellIds;
  }

  const next = [...orderedCellIds];
  const [id] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, id!);
  return next;
}

export const initialNotebookState: NotebookState = {
  activeCellId: null,
  aiPrompts: {},
  cellsById: {},
  collapsedThreads: {},
  dismissedThreads: {},
  error: null,
  localDirtyByCellId: {},
  notebook: null,
  orderedCellIds: [],
  runtimeByCell: {},
  semProjection: createSemProjectionState(),
  status: "idle",
};

const notebookSlice = createSlice({
  name: "notebook",
  initialState: initialNotebookState,
  reducers: {
    dismissThread(state, action: PayloadAction<string>) {
      state.dismissedThreads[action.payload] = true;
    },
    mutationResultApplied(state, action: PayloadAction<NotebookMutationResult>) {
      if (action.payload.document) {
        applyNotebookDocumentToState(state, action.payload.document);
      }
      state.error = null;
    },
    notebookLoadFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.status = "error";
    },
    notebookLoadStarted(state) {
      state.error = null;
      state.status = "loading";
    },
    notebookLoaded(state, action: PayloadAction<NotebookDocument>) {
      applyNotebookDocumentToState(state, action.payload, { clearDirty: true });
      state.error = null;
      state.status = "ready";
    },
    notebookTitleUpdated(state, action: PayloadAction<NotebookDocument>) {
      applyNotebookDocumentToState(state, action.payload);
      state.error = null;
    },
    runtimeUpdated(state, action: PayloadAction<{ cellId: string; runtime: CellRuntime }>) {
      state.runtimeByCell[action.payload.cellId] = action.payload.runtime;
      state.error = null;
    },
    semEventProjected(state, action: PayloadAction<SemEvent>) {
      state.semProjection = applySemEvent(state.semProjection, action.payload);
    },
    setActiveCellId(state, action: PayloadAction<string | null>) {
      state.activeCellId = action.payload;
    },
    setAIPrompt(state, action: PayloadAction<{ cellId: string; value: string }>) {
      state.aiPrompts[action.payload.cellId] = action.payload.value;
    },
    setCellSource(state, action: PayloadAction<{ cellId: string; source: string }>) {
      const cell = state.cellsById[action.payload.cellId];
      if (!cell) {
        return;
      }
      cell.source = action.payload.source;
      state.localDirtyByCellId[action.payload.cellId] = true;
    },
    setNotebookError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    toggleThreadCollapse(state, action: PayloadAction<string>) {
      const threadId = action.payload;
      state.collapsedThreads[threadId] = !state.collapsedThreads[threadId];
    },
    updateCellPersisted(state, action: PayloadAction<NotebookCell>) {
      const cell = action.payload;
      if (!state.cellsById[cell.id]) {
        return;
      }
      state.cellsById[cell.id] = cell;
      delete state.localDirtyByCellId[cell.id];
      state.error = null;
    },
  },
});

export const {
  dismissThread,
  mutationResultApplied,
  notebookLoadFailed,
  notebookLoadStarted,
  notebookLoaded,
  notebookTitleUpdated,
  runtimeUpdated,
  semEventProjected,
  setActiveCellId,
  setAIPrompt,
  setCellSource,
  setNotebookError,
  toggleThreadCollapse,
  updateCellPersisted,
} = notebookSlice.actions;

export const notebookReducer = notebookSlice.reducer;

export const loadNotebook = (): AppThunk<Promise<void>> => async (dispatch) => {
  dispatch(notebookLoadStarted());
  const response = await bootstrapNotebook();
  if ("notebook" in response) {
    dispatch(notebookLoaded(response as NotebookDocument));
    return;
  }

  dispatch(notebookLoadFailed(getErrorMessage(response, "Failed to load notebook")));
};

export const persistNotebookCell = (cellId: string): AppThunk<Promise<NotebookCell | null>> => async (dispatch, getState) => {
  const state = getState().notebook;
  const cell = state.cellsById[cellId];
  if (!cell) {
    dispatch(setNotebookError("Cell not found"));
    return null;
  }

  if (!state.localDirtyByCellId[cellId]) {
    return cell;
  }

  const response = await updateNotebookCell(cellId, {
    kind: cell.kind,
    source: cell.source,
  });
  if ("id" in response) {
    dispatch(updateCellPersisted(response as NotebookCell));
    return response as NotebookCell;
  }

  dispatch(setNotebookError(getErrorMessage(response, "Failed to save cell")));
  return null;
};

export const persistNotebookTitle = (title: string): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const notebookId = getState().notebook.notebook?.id;
  if (!notebookId) {
    return;
  }

  const response = await updateNotebookTitle(notebookId, title);
  if ("notebook" in response) {
    dispatch(notebookTitleUpdated(response as NotebookDocument));
    return;
  }

  dispatch(setNotebookError(getErrorMessage(response, "Failed to update notebook title")));
};

export const insertNotebookCellBelow = (
  afterCellId: string,
  kind: "code" | "markdown",
  source = "",
): AppThunk<Promise<NotebookCell | null>> => async (dispatch, getState) => {
  const notebookId = getState().notebook.notebook?.id;
  if (!notebookId) {
    return null;
  }

  const response = await insertNotebookCell(notebookId, {
    after_cell_id: afterCellId,
    kind,
    source,
  });
  if ("document" in response) {
    dispatch(mutationResultApplied(response as NotebookMutationResult));
    return (response as NotebookMutationResult).cell || null;
  }

  dispatch(setNotebookError(getErrorMessage(response, "Failed to insert cell")));
  return null;
};

export const moveNotebookCellToIndex = (
  cellId: string,
  targetIndex: number,
): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const state = getState().notebook;
  if (!state.cellsById[cellId]) {
    dispatch(setNotebookError("Cell not found"));
    return;
  }

  const response = await moveNotebookCell(cellId, targetIndex);
  if ("document" in response) {
    dispatch(mutationResultApplied(response as NotebookMutationResult));
    return;
  }

  dispatch(setNotebookError(getErrorMessage(response, "Failed to move cell")));
};

export const deleteNotebookCellById = (cellId: string): AppThunk<Promise<void>> => async (dispatch, getState) => {
  const state = getState().notebook;
  if (!state.cellsById[cellId]) {
    dispatch(setNotebookError("Cell not found"));
    return;
  }

  const response = await deleteNotebookCell(cellId);
  if ("document" in response) {
    dispatch(mutationResultApplied(response as NotebookMutationResult));
    return;
  }

  dispatch(setNotebookError(getErrorMessage(response, "Failed to delete cell")));
};

export const runNotebookCellById = (cellId: string): AppThunk<Promise<CellRuntime | null>> => async (dispatch, getState) => {
  const state = getState().notebook;
  if (!state.cellsById[cellId]) {
    dispatch(setNotebookError("Cell not found"));
    return null;
  }

  if (state.localDirtyByCellId[cellId]) {
    const persistedCell = await dispatch(persistNotebookCell(cellId));
    if (!persistedCell) {
      return null;
    }
  }

  const response = await runNotebookCell(cellId);
  if ("run" in response || "output" in response) {
    dispatch(runtimeUpdated({ cellId, runtime: response as CellRuntime }));
    return response as CellRuntime;
  }

  dispatch(setNotebookError(getErrorMessage(response, "Failed to run cell")));
  return null;
};

const selectNotebookState = (state: RootState) => state.notebook;
const selectCellIdParam = (_state: RootState, cellId: string) => cellId;

export const selectNotebookStatus = createSelector(
  [selectNotebookState],
  (notebook) => notebook.status,
);

export const selectNotebookError = createSelector(
  [selectNotebookState],
  (notebook) => notebook.error,
);

export const selectNotebookMeta = createSelector(
  [selectNotebookState],
  (notebook) => notebook.notebook,
);

export const selectOrderedCellIds = createSelector(
  [selectNotebookState],
  (notebook) => notebook.orderedCellIds,
);

export const selectCellsById = createSelector(
  [selectNotebookState],
  (notebook) => notebook.cellsById,
);

export const selectOrderedNotebookCells = createSelector(
  [selectCellsById, selectOrderedCellIds],
  (cellsById, orderedCellIds) => orderedCellIds
    .map((cellId) => cellsById[cellId])
    .filter((cell): cell is NotebookCell => Boolean(cell)),
);

export const selectNotebookRuntimeByCell = createSelector(
  [selectNotebookState],
  (notebook) => notebook.runtimeByCell,
);

export const selectNotebookDocument = createSelector(
  [selectNotebookMeta, selectOrderedNotebookCells, selectNotebookRuntimeByCell],
  (notebook, cells, runtime) => {
    if (!notebook) {
      return null;
    }

    return {
      notebook,
      cells,
      runtime,
    } satisfies NotebookDocument;
  },
);

export const selectActiveCellId = createSelector(
  [selectNotebookState],
  (notebook) => notebook.activeCellId,
);

export const selectActiveCellIndex = createSelector(
  [selectOrderedCellIds, selectActiveCellId],
  (orderedCellIds, activeCellId) => {
    if (!activeCellId) {
      return orderedCellIds.length > 0 ? 0 : -1;
    }
    return orderedCellIds.indexOf(activeCellId);
  },
);

export const selectSemProjection = createSelector(
  [selectNotebookState],
  (notebook) => notebook.semProjection,
);

export const selectCollapsedThreads = createSelector(
  [selectNotebookState],
  (notebook) => notebook.collapsedThreads,
);

export const selectDismissedThreads = createSelector(
  [selectNotebookState],
  (notebook) => notebook.dismissedThreads,
);

export const selectCellById = createSelector(
  [selectCellsById, selectCellIdParam],
  (cellsById, cellId) => cellsById[cellId] || null,
);

export const selectRuntimeForCell = createSelector(
  [selectNotebookRuntimeByCell, selectCellIdParam],
  (runtimeByCell, cellId) => runtimeByCell[cellId],
);

export const selectAIPromptForCell = createSelector(
  [selectNotebookState, selectCellIdParam],
  (notebook, cellId) => notebook.aiPrompts[cellId] || "",
);

export const selectExecutionStateByCell = createSelector(
  [selectOrderedNotebookCells, selectNotebookRuntimeByCell, selectNotebookState],
  (cells, runtimeByCell, notebook) => buildNotebookExecutionState(cells, runtimeByCell, Object.keys(notebook.localDirtyByCellId)),
);

export const selectExecutionStateForCell = createSelector(
  [selectExecutionStateByCell, selectCellIdParam],
  (executionStateByCell, cellId) => executionStateByCell[cellId],
);

export const selectNextCodeCellId = createSelector(
  [selectOrderedNotebookCells, selectCellIdParam],
  (cells, cellId) => {
    const currentIndex = cells.findIndex((cell) => cell.id === cellId);
    if (currentIndex < 0) {
      return null;
    }
    for (let index = currentIndex + 1; index < cells.length; index += 1) {
      if (cells[index]?.kind === "code") {
        return cells[index]?.id || null;
      }
    }
    return null;
  },
);

export const selectTargetCellIdByOffset = createSelector(
  [selectOrderedCellIds, selectActiveCellId, (_state: RootState, offset: number) => offset],
  (orderedCellIds, activeCellId, offset) => {
    if (orderedCellIds.length === 0) {
      return null;
    }

    const currentIndex = activeCellId ? orderedCellIds.indexOf(activeCellId) : 0;
    const safeIndex = currentIndex < 0 ? 0 : currentIndex;
    const nextIndex = Math.min(orderedCellIds.length - 1, Math.max(0, safeIndex + offset));
    return orderedCellIds[nextIndex] || null;
  },
);

export const selectReorderedCellIds = createSelector(
  [selectOrderedCellIds, selectCellIdParam, (_state: RootState, _cellId: string, targetIndex: number) => targetIndex],
  reorderCellIds,
);
