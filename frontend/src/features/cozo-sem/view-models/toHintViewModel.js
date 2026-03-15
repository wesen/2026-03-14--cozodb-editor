export function toHintViewModel(entity) {
  const payload = entity?.data || {};
  return {
    chips: payload.chips || [],
    code: payload.code || "",
    status: entity?.status || "idle",
    text: payload.text || "",
    warning: payload.warning || "",
  };
}
