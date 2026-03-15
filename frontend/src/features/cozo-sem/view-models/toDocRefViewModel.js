export function toDocRefViewModel(entity) {
  const payload = entity?.data || {};
  return {
    body: payload.body || "",
    section: payload.section || "",
    status: entity?.status || "idle",
    title: payload.title || "Reference",
    url: payload.url || "",
  };
}
