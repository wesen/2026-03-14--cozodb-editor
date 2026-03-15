import { describe, expect, it } from "vitest";
import { buildNotebookExecutionState } from "./runtimeState";
import type { CellRuntime, NotebookCell } from "../transport/httpClient";

function codeCell(id: string, position: number, source: string, updatedAt = 100): NotebookCell {
  return {
    id,
    notebook_id: "nbk_default",
    kind: "code",
    source,
    position,
    created_at_ms: 0,
    updated_at_ms: updatedAt,
  };
}

function runtime(id: string, finishedAt: number, executionCount = 1): CellRuntime {
  return {
    run: {
      id: `run_${id}`,
      cell_id: id,
      notebook_id: "nbk_default",
      status: "complete",
      execution_count: executionCount,
      started_at_ms: finishedAt - 10,
      finished_at_ms: finishedAt,
    },
  };
}

describe("runtimeState", () => {
  it("marks edited code cells as dirty", () => {
    const cells = [
      codeCell("cell_a", 0, "?[x] <- [[1]]", 200),
    ];
    const runtimeByCell = {
      cell_a: runtime("cell_a", 100),
    };

    const state = buildNotebookExecutionState(cells, runtimeByCell, []);

    expect(state.cell_a).toMatchObject({
      dirty: true,
      stale: false,
      hasRun: true,
    });
  });

  it("marks downstream cells stale when an upstream risky cell reruns later", () => {
    const cells = [
      codeCell("cell_a", 0, ":create users {name: String => age: Int}", 100),
      codeCell("cell_b", 1, "?[name] := *users{name, age}", 100),
    ];
    const runtimeByCell = {
      cell_a: runtime("cell_a", 300, 2),
      cell_b: runtime("cell_b", 200, 1),
    };

    const state = buildNotebookExecutionState(cells, runtimeByCell, []);

    expect(state.cell_a!.stale).toBe(false);
    expect(state.cell_b!.stale).toBe(true);
  });

  it("marks downstream cells stale when an upstream cell is dirty", () => {
    const cells = [
      codeCell("cell_a", 0, "?[x] <- [[1]]", 100),
      codeCell("cell_b", 1, "?[y] <- [[2]]", 100),
    ];
    const runtimeByCell = {
      cell_a: runtime("cell_a", 100, 1),
      cell_b: runtime("cell_b", 150, 1),
    };

    const state = buildNotebookExecutionState(cells, runtimeByCell, ["cell_a"]);

    expect(state.cell_a!.dirty).toBe(true);
    expect(state.cell_b!.stale).toBe(true);
  });
});
