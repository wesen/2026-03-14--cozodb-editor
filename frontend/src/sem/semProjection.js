import {
  COZO_DOC_REF_EXTRACTED_EVENT,
  COZO_DOC_REF_FAILED_EVENT,
  COZO_DOC_REF_PREVIEW_EVENT,
  COZO_HINT_EXTRACTED_EVENT,
  COZO_HINT_FAILED_EVENT,
  COZO_HINT_PREVIEW_EVENT,
  COZO_QUERY_SUGGESTION_EXTRACTED_EVENT,
  COZO_QUERY_SUGGESTION_FAILED_EVENT,
  COZO_QUERY_SUGGESTION_PREVIEW_EVENT,
  HINT_RESULT_EVENT,
  LLM_DELTA_EVENT,
  LLM_ERROR_EVENT,
  LLM_FINAL_EVENT,
  LLM_START_EVENT,
} from "./semEventTypes";

export const ENTITY_KIND_LLM_TEXT_STREAM = "llm_text_stream";
export const ENTITY_KIND_COZO_HINT = "cozo_hint";
export const ENTITY_KIND_COZO_QUERY_SUGGESTION = "cozo_query_suggestion";
export const ENTITY_KIND_COZO_DOC_REF = "cozo_doc_ref";
export const ENTITY_KIND_LEGACY_HINT = "legacy_hint";
export const ENTITY_KIND_DIAGNOSIS = "diagnosis";

const COZO_EVENT_KIND_BY_TYPE = {
  [COZO_HINT_PREVIEW_EVENT]: ENTITY_KIND_COZO_HINT,
  [COZO_HINT_EXTRACTED_EVENT]: ENTITY_KIND_COZO_HINT,
  [COZO_HINT_FAILED_EVENT]: ENTITY_KIND_COZO_HINT,
  [COZO_QUERY_SUGGESTION_PREVIEW_EVENT]: ENTITY_KIND_COZO_QUERY_SUGGESTION,
  [COZO_QUERY_SUGGESTION_EXTRACTED_EVENT]: ENTITY_KIND_COZO_QUERY_SUGGESTION,
  [COZO_QUERY_SUGGESTION_FAILED_EVENT]: ENTITY_KIND_COZO_QUERY_SUGGESTION,
  [COZO_DOC_REF_PREVIEW_EVENT]: ENTITY_KIND_COZO_DOC_REF,
  [COZO_DOC_REF_EXTRACTED_EVENT]: ENTITY_KIND_COZO_DOC_REF,
  [COZO_DOC_REF_FAILED_EVENT]: ENTITY_KIND_COZO_DOC_REF,
};

function appendOrder(order, entityId) {
  if (order.includes(entityId)) {
    return order;
  }

  return [...order, entityId];
}

function extractCanonicalId(event) {
  if (!event?.type) {
    return null;
  }

  if (event.type.startsWith("cozo.")) {
    return event.data?.itemId || event.id || null;
  }

  return event.id || null;
}

function extractStructuredPayload(event) {
  return event?.data?.data || null;
}

function extractAnchorLine(event) {
  const payload = extractStructuredPayload(event);
  const line = payload?.anchor?.line;
  return Number.isInteger(line) && line >= 0 ? line : null;
}

function extractLLMDelta(event) {
  if (typeof event?.data === "string") {
    return event.data;
  }

  if (typeof event?.data?.delta === "string") {
    return event.data.delta;
  }

  return "";
}

function extractLLMFinalText(event) {
  if (typeof event?.data === "string") {
    return event.data;
  }

  if (typeof event?.data?.text === "string") {
    return event.data.text;
  }

  if (typeof event?.data?.cumulative === "string") {
    return event.data.cumulative;
  }

  return "";
}

function kindForEvent(event, entityId) {
  if (!event?.type) {
    return ENTITY_KIND_LLM_TEXT_STREAM;
  }

  if (event.type === HINT_RESULT_EVENT) {
    return entityId?.startsWith("diag-") ? ENTITY_KIND_DIAGNOSIS : ENTITY_KIND_LEGACY_HINT;
  }

  return COZO_EVENT_KIND_BY_TYPE[event.type] || ENTITY_KIND_LLM_TEXT_STREAM;
}

function createEntity(event, entityId) {
  return {
    id: entityId,
    kind: kindForEvent(event, entityId),
    status: "idle",
    text: "",
    finalText: "",
    response: null,
    data: null,
    error: null,
    anchorLine: null,
    transient: false,
  };
}

function ensureEntity(state, event, entityId) {
  return state.entities[entityId] || createEntity(event, entityId);
}

function projectCozoEntity(entity, event, status) {
  return {
    ...entity,
    kind: kindForEvent(event, entity.id),
    status,
    data: extractStructuredPayload(event),
    error: event?.data?.error || null,
    anchorLine: extractAnchorLine(event),
    transient: Boolean(event?.data?.transient),
  };
}

function isCozoKind(kind) {
  return (
    kind === ENTITY_KIND_COZO_HINT
    || kind === ENTITY_KIND_COZO_QUERY_SUGGESTION
    || kind === ENTITY_KIND_COZO_DOC_REF
  );
}

function trimTrailingDisplayWhitespace(text) {
  return typeof text === "string" ? text.replace(/[ \t\r\n]+$/u, "") : "";
}

function getOrderedSemEntities(state, predicate) {
  return state.order
    .map((entityId) => state.entities[entityId])
    .filter((entity) => isCozoKind(entity?.kind) && predicate(entity));
}

function buildSemThreads(entities) {
  const threads = [];
  let currentThread = null;

  entities.forEach((entity) => {
    if (entity.kind === ENTITY_KIND_COZO_HINT) {
      currentThread = {
        id: entity.id,
        hint: entity,
        children: [],
        anchorLine: entity.anchorLine ?? null,
      };
      threads.push(currentThread);
      return;
    }

    if (currentThread) {
      currentThread.children.push(entity);
      return;
    }

    threads.push({
      id: entity.id,
      hint: null,
      children: [entity],
      anchorLine: entity.anchorLine ?? null,
    });
  });

  return threads;
}

export function createSemProjectionState() {
  return {
    entities: {},
    order: [],
  };
}

export function applySemEvent(state, event) {
  if (!event?.type) {
    return state;
  }

  const entityId = extractCanonicalId(event);
  if (!entityId) {
    return state;
  }

  const entity = ensureEntity(state, event, entityId);
  const nextOrder = appendOrder(state.order, entityId);
  let nextEntity = entity;

  switch (event.type) {
    case LLM_START_EVENT:
      nextEntity = {
        ...entity,
        kind: ENTITY_KIND_LLM_TEXT_STREAM,
        status: "streaming",
        text: "",
        finalText: "",
      };
      break;
    case LLM_DELTA_EVENT:
      nextEntity = {
        ...entity,
        kind: ENTITY_KIND_LLM_TEXT_STREAM,
        status: "streaming",
        text: `${entity.text || ""}${extractLLMDelta(event)}`,
      };
      break;
    case LLM_FINAL_EVENT:
      nextEntity = {
        ...entity,
        kind: ENTITY_KIND_LLM_TEXT_STREAM,
        status: "complete",
        finalText: trimTrailingDisplayWhitespace(extractLLMFinalText(event)),
      };
      break;
    case LLM_ERROR_EVENT:
      nextEntity = {
        ...entity,
        status: "error",
      };
      break;
    case HINT_RESULT_EVENT:
      nextEntity = {
        ...entity,
        kind: kindForEvent(event, entityId),
        response: event.data || null,
        status: "complete",
      };
      break;
    case COZO_HINT_PREVIEW_EVENT:
    case COZO_QUERY_SUGGESTION_PREVIEW_EVENT:
    case COZO_DOC_REF_PREVIEW_EVENT:
      nextEntity = projectCozoEntity(entity, event, "preview");
      break;
    case COZO_HINT_EXTRACTED_EVENT:
    case COZO_QUERY_SUGGESTION_EXTRACTED_EVENT:
    case COZO_DOC_REF_EXTRACTED_EVENT:
      nextEntity = projectCozoEntity(entity, event, "complete");
      break;
    case COZO_HINT_FAILED_EVENT:
    case COZO_QUERY_SUGGESTION_FAILED_EVENT:
    case COZO_DOC_REF_FAILED_EVENT:
      nextEntity = projectCozoEntity(entity, event, "error");
      break;
    default:
      return state;
  }

  return {
    entities: {
      ...state.entities,
      [entityId]: nextEntity,
    },
    order: nextOrder,
  };
}

export function getStreamingEntries(state) {
  return state.order
    .map((entityId) => state.entities[entityId])
    .filter((entity) => entity?.kind === ENTITY_KIND_LLM_TEXT_STREAM && entity?.status === "streaming")
    .map((entity) => [entity.id, trimTrailingDisplayWhitespace(entity.text)]);
}

export function getCompletedHintEntries(state) {
  return state.order
    .map((entityId) => state.entities[entityId])
    .filter((entity) => entity?.kind === ENTITY_KIND_LEGACY_HINT && entity?.status === "complete" && entity.response)
    .map((entity) => [entity.id, entity.response]);
}

export function getInlineSemEntities(state, lineIdx) {
  return getOrderedSemEntities(state, (entity) => entity?.anchorLine === lineIdx);
}

export function getTrailingSemEntities(state) {
  return getOrderedSemEntities(state, (entity) => entity?.anchorLine == null);
}

export function getInlineSemThreads(state, lineIdx) {
  return buildSemThreads(getInlineSemEntities(state, lineIdx));
}

export function getTrailingSemThreads(state) {
  return buildSemThreads(getTrailingSemEntities(state));
}

export function getAllSemThreads(state) {
  return buildSemThreads(getOrderedSemEntities(state, () => true));
}
