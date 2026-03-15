export interface HintCardDoc {
  title: string;
  section: string;
  body: string;
}

export interface HintCardViewModel {
  chips: string[];
  code: string;
  docs: HintCardDoc[];
  previewText: string;
  text: string;
}

interface HintResponse {
  text?: string;
  code?: string;
  chips?: string[];
  docs?: HintCardDoc[];
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function toHintCardViewModel(response: HintResponse | null | undefined): HintCardViewModel {
  const text = response?.text || "";

  return {
    chips: normalizeArray<string>(response?.chips),
    code: response?.code || "",
    docs: normalizeArray<HintCardDoc>(response?.docs),
    previewText: text.replace(/\*\*/g, "").slice(0, 60),
    text,
  };
}
