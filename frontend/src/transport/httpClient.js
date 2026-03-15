const API_BASE = "";

async function requestJSON(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${path}`, options);
    const rawText = await res.text();
    let data = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { message: rawText };
      }
    }
    if (!res.ok) {
      return { ok: false, message: data?.message || data?.error || `request failed: ${res.status}` };
    }
    return data;
  } catch (err) {
    return { ok: false, message: `Network error: ${err.message}` };
  }
}

export async function executeQuery(script, params = {}) {
  return requestJSON("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ script, params }),
  });
}

export async function fetchSchema() {
  const res = await fetch(`${API_BASE}/api/schema`);
  if (!res.ok) {
    throw new Error(`schema request failed: ${res.status}`);
  }
  return await res.json();
}

export async function bootstrapNotebook() {
  return requestJSON("/api/notebooks/bootstrap");
}

export async function updateNotebookTitle(notebookId, title) {
  return requestJSON(`/api/notebooks/${notebookId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export async function insertNotebookCell(notebookId, payload) {
  return requestJSON(`/api/notebooks/${notebookId}/cells`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateNotebookCell(cellId, payload) {
  return requestJSON(`/api/notebook-cells/${cellId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function moveNotebookCell(cellId, targetIndex) {
  return requestJSON(`/api/notebook-cells/${cellId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target_index: targetIndex }),
  });
}

export async function deleteNotebookCell(cellId) {
  return requestJSON(`/api/notebook-cells/${cellId}`, {
    method: "DELETE",
  });
}

export async function runNotebookCell(cellId) {
  return requestJSON(`/api/notebook-cells/${cellId}/run`, {
    method: "POST",
  });
}
