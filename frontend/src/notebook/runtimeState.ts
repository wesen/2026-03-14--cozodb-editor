import type { CellRuntime, NotebookCell } from "../transport/httpClient";

export type MutationRisk = "read_only" | "write_or_unknown";

export interface NotebookExecutionState {
  dirty: boolean;
  hasRun: boolean;
  mutationRisk: MutationRisk;
  stale: boolean;
}

function stripCommentPrefix(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith(";")) {
    return "";
  }
  return trimmed;
}

export function classifyMutationRisk(cell: NotebookCell): MutationRisk {
  if (cell.kind !== "code") {
    return "read_only";
  }

  const trimmedLines = cell.source
    .split("\n")
    .map(stripCommentPrefix)
    .filter(Boolean);

  if (trimmedLines.length === 0) {
    return "read_only";
  }

  if (trimmedLines.some((line) => line.startsWith(":") || line.startsWith("::"))) {
    return "write_or_unknown";
  }

  if (trimmedLines.some((line) => line.startsWith("?[") || line.startsWith("?["))) {
    return "read_only";
  }

  return "write_or_unknown";
}

function hasNonEmptySource(cell: NotebookCell): boolean {
  return cell.source.trim() !== "";
}

export function buildNotebookExecutionState(
  cells: NotebookCell[],
  runtimeByCell: Record<string, CellRuntime>,
  localDirtyCellIds: Iterable<string>,
): Record<string, NotebookExecutionState> {
  const states: Record<string, NotebookExecutionState> = {};
  const localDirty = new Set(localDirtyCellIds);
  let upstreamDirtyOrNeedsRun = false;
  let upstreamRiskyFinishedAt = 0;

  for (const cell of [...cells].sort((left, right) => left.position - right.position)) {
    const runtime = runtimeByCell[cell.id];
    const run = runtime?.run;
    const hasRun = Boolean(run?.id);
    const finishedAt = run?.finished_at_ms || 0;
    const mutationRisk = classifyMutationRisk(cell);
    const dirty = cell.kind === "code" && hasNonEmptySource(cell) && (
      localDirty.has(cell.id)
      || !hasRun
      || Boolean(finishedAt && cell.updated_at_ms > finishedAt)
    );
    const stale = cell.kind === "code" && hasRun && (
      upstreamDirtyOrNeedsRun
      || (finishedAt > 0 && upstreamRiskyFinishedAt > finishedAt)
    );

    states[cell.id] = {
      dirty,
      hasRun,
      mutationRisk,
      stale,
    };

    if (cell.kind !== "code") {
      continue;
    }

    if (dirty || (!hasRun && hasNonEmptySource(cell))) {
      upstreamDirtyOrNeedsRun = true;
    }

    if (hasRun && finishedAt > 0 && mutationRisk === "write_or_unknown") {
      upstreamRiskyFinishedAt = Math.max(upstreamRiskyFinishedAt, finishedAt);
    }
  }

  return states;
}
