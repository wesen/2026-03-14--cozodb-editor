const API_BASE = "";

export async function executeQuery(script, params = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script, params }),
    });
    return await res.json();
  } catch (err) {
    return { ok: false, message: `Network error: ${err.message}` };
  }
}

export async function fetchSchema() {
  const res = await fetch(`${API_BASE}/api/schema`);
  if (!res.ok) {
    throw new Error(`schema request failed: ${res.status}`);
  }
  return await res.json();
}
