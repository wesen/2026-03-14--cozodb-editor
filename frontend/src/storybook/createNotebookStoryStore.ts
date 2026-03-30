import { makeStore } from "../app/store";
import {
  notebookLoaded,
  runtimeUpdated,
  semEventProjected,
  setAIPrompt,
  setActiveCellId,
  toggleThreadCollapse,
} from "../notebook/state/notebookSlice";
import type { SemEvent } from "../transport/hintsSocket";
import type { CellRuntime, NotebookDocument } from "../transport/httpClient";

export interface NotebookStoryStateOptions {
  activeCellId?: string | null;
  aiPrompts?: Record<string, string>;
  collapsedThreadIds?: string[];
  document: NotebookDocument;
  runtimeByCell?: Record<string, CellRuntime>;
  semEvents?: SemEvent[];
}

export function createNotebookStoryStore({
  activeCellId,
  aiPrompts,
  collapsedThreadIds,
  document,
  runtimeByCell,
  semEvents,
}: NotebookStoryStateOptions) {
  const store = makeStore();

  store.dispatch(notebookLoaded({
    ...document,
    runtime: runtimeByCell || document.runtime,
  }));

  if (activeCellId) {
    store.dispatch(setActiveCellId(activeCellId));
  }

  if (aiPrompts) {
    for (const [cellId, value] of Object.entries(aiPrompts)) {
      store.dispatch(setAIPrompt({ cellId, value }));
    }
  }

  if (runtimeByCell) {
    for (const [cellId, runtime] of Object.entries(runtimeByCell)) {
      store.dispatch(runtimeUpdated({ cellId, runtime }));
    }
  }

  if (semEvents) {
    for (const event of semEvents) {
      store.dispatch(semEventProjected(event));
    }
  }

  if (collapsedThreadIds) {
    for (const threadId of collapsedThreadIds) {
      store.dispatch(toggleThreadCollapse(threadId));
    }
  }

  return store;
}
