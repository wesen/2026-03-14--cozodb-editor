import { afterEach, describe, expect, it, vi } from "vitest";
import { createHTTPNotebookTransport } from "./httpClient";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("createHTTPNotebookTransport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prefixes notebook bootstrap requests with the configured api base", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({
      notebook: {
        id: "nb_1",
        title: "Notebook",
        created_at_ms: 1,
        updated_at_ms: 1,
      },
      cells: [],
      runtime: {},
    }));

    const transport = createHTTPNotebookTransport({ apiBase: "/cozo" });
    await transport.bootstrapNotebook();

    expect(fetchMock).toHaveBeenCalledWith("/cozo/api/notebooks/bootstrap", {});
  });

  it("prefixes mutating notebook cell requests with the configured api base", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse({
      run: {
        id: "run_1",
        cell_id: "cell_1",
        notebook_id: "nb_1",
        status: "complete",
        execution_count: 1,
        finished_at_ms: 1,
      },
      output: {
        kind: "query_result",
        headers: ["value"],
        rows: [[42]],
        took: 1,
      },
    }));

    const transport = createHTTPNotebookTransport({ apiBase: "/cozo" });
    await transport.runNotebookCell("cell_1");

    expect(fetchMock).toHaveBeenCalledWith("/cozo/api/notebook-cells/cell_1/run", {
      method: "POST",
    });
  });
});
