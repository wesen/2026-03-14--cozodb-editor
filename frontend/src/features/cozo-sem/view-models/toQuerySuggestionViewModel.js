export function toQuerySuggestionViewModel(entity) {
  const payload = entity?.data || {};
  return {
    code: payload.code || "",
    label: payload.label || "Suggested query",
    reason: payload.reason || "",
    status: entity?.status || "idle",
  };
}
