export const LLM_START_EVENT = "llm.start";
export const LLM_DELTA_EVENT = "llm.delta";
export const LLM_FINAL_EVENT = "llm.final";
export const LLM_ERROR_EVENT = "llm.error";
export const HINT_RESULT_EVENT = "hint.result";

export const COZO_HINT_PREVIEW_EVENT = "cozo.hint.preview";
export const COZO_HINT_EXTRACTED_EVENT = "cozo.hint.extracted";
export const COZO_HINT_FAILED_EVENT = "cozo.hint.failed";

export const COZO_QUERY_SUGGESTION_PREVIEW_EVENT = "cozo.query_suggestion.preview";
export const COZO_QUERY_SUGGESTION_EXTRACTED_EVENT = "cozo.query_suggestion.extracted";
export const COZO_QUERY_SUGGESTION_FAILED_EVENT = "cozo.query_suggestion.failed";

export const COZO_DOC_REF_PREVIEW_EVENT = "cozo.doc_ref.preview";
export const COZO_DOC_REF_EXTRACTED_EVENT = "cozo.doc_ref.extracted";
export const COZO_DOC_REF_FAILED_EVENT = "cozo.doc_ref.failed";

export const DEFAULT_SEM_EVENT_TYPES = [
  LLM_START_EVENT,
  LLM_DELTA_EVENT,
  LLM_FINAL_EVENT,
  LLM_ERROR_EVENT,
  HINT_RESULT_EVENT,
];

export const COZO_SEM_EVENT_TYPES = [
  COZO_HINT_PREVIEW_EVENT,
  COZO_HINT_EXTRACTED_EVENT,
  COZO_HINT_FAILED_EVENT,
  COZO_QUERY_SUGGESTION_PREVIEW_EVENT,
  COZO_QUERY_SUGGESTION_EXTRACTED_EVENT,
  COZO_QUERY_SUGGESTION_FAILED_EVENT,
  COZO_DOC_REF_PREVIEW_EVENT,
  COZO_DOC_REF_EXTRACTED_EVENT,
  COZO_DOC_REF_FAILED_EVENT,
];

export const PROJECTED_EVENT_TYPES = [
  ...DEFAULT_SEM_EVENT_TYPES,
  ...COZO_SEM_EVENT_TYPES,
];
