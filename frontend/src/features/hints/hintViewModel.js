function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function toHintCardViewModel(response) {
  const text = response?.text || "";

  return {
    chips: normalizeArray(response?.chips),
    code: response?.code || "",
    docs: normalizeArray(response?.docs),
    previewText: text.replace(/\*\*/g, "").slice(0, 60),
    text,
  };
}
