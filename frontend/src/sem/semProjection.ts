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
import type { SemEvent } from "../transport/hintsSocket";

export const ENTITY_KIND_LLM_TEXT_STREAM = "llm_text_stream" as const;
export const ENTITY_KIND_COZO_BUNDLE = "cozo_bundle" as const;
export const ENTITY_KIND_COZO_HINT = "cozo_hint" as const;
export const ENTITY_KIND_COZO_QUERY_SUGGESTION = "cozo_query_suggestion" as const;
export const ENTITY_KIND_COZO_DOC_REF = "cozo_doc_ref" as const;
export const ENTITY_KIND_DIAGNOSIS = "diagnosis" as const;

export type EntityKind =
  | typeof ENTITY_KIND_LLM_TEXT_STREAM
  | typeof ENTITY_KIND_COZO_BUNDLE
  | typeof ENTITY_KIND_COZO_HINT
  | typeof ENTITY_KIND_COZO_QUERY_SUGGESTION
  | typeof ENTITY_KIND_COZO_DOC_REF
  | typeof ENTITY_KIND_DIAGNOSIS;

export type EntityStatus = "idle" | "streaming" | "preview" | "complete" | "error";

export interface SemEntity {
  id: string;
  kind: EntityKind;
  status: EntityStatus;
  text: string;
  finalText: string;
  response: Record<string, unknown> | null;
  data: Record<string, unknown> | null;
  error: string | null;
  anchorLine: number | null;
  transient: boolean;
  parentId: string | null;
  bundleId: string | null;
  ordinal: number | null;
  mode: string | null;
  notebookId: string | null;
  ownerCellId: string | null;
  runId: string | null;
}

export interface SemBundleEntity {
  id: string;
  kind: typeof ENTITY_KIND_COZO_BUNDLE;
  status: EntityStatus;
  anchorLine: number | null;
  bundleId: string | null;
  mode: string | null;
  error: string | null;
  notebookId: string | null;
  ownerCellId: string | null;
  runId: string | null;
}

export type ProjectedEntity = SemEntity | SemBundleEntity;

export interface SemProjectionState {
  entities: Record<string, ProjectedEntity>;
  order: string[];
}

export interface SemThread {
  id: string;
  bundle: SemBundleEntity;
  hint: SemEntity | null;
  children: SemEntity[];
  anchorLine: number | null;
  ownerCellId?: string;
  notebookId?: string;
  runId?: string;
}

export interface HintResponsePayload {
  text?: string;
  code?: string | null;
  chips?: string[];
  docs?: Array<{ title: string; section?: string; body: string }>;
  warning?: string | null;
}

const COZO_EVENT_KIND_BY_TYPE: Record<string, EntityKind> = {
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

function appendOrder(order: string[], entityId: string): string[] {
  if (order.includes(entityId)) {
    return order;
  }

  return [...order, entityId];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getEventData(event: SemEvent): Record<string, any> | null {
  if (typeof event?.data === "object" && event.data !== null) {
    return event.data as Record<string, unknown>;
  }
  return null;
}

function extractCanonicalId(event: SemEvent): string | null {
  if (!event?.type) {
    return null;
  }

  const data = getEventData(event);

  if (event.type.startsWith("cozo.")) {
    return (data?.itemId as string) || event.id || null;
  }

  return event.id || null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractStructuredPayload(event: SemEvent): Record<string, any> | null {
  const data = getEventData(event);
  return (data?.data as Record<string, unknown>) || null;
}

function extractAnchorLine(event: SemEvent): number | null {
  const data = getEventData(event);
  const eventAnchorLine = (data?.anchor as Record<string, unknown>)?.line;
  if (Number.isInteger(eventAnchorLine) && (eventAnchorLine as number) >= 0) {
    return eventAnchorLine as number;
  }

  const payload = extractStructuredPayload(event);
  const line = (payload?.anchor as Record<string, unknown>)?.line;
  return Number.isInteger(line) && (line as number) >= 0 ? (line as number) : null;
}

function extractCozoBundleId(event: SemEvent): string | null {
  if (!event?.type?.startsWith("cozo.")) {
    return null;
  }

  const data = getEventData(event);
  if (typeof data?.bundleId === "string" && (data.bundleId as string).trim() !== "") {
    return (data.bundleId as string).trim();
  }

  if (typeof event?.stream_id === "string" && event.stream_id.trim() !== "") {
    return event.stream_id.trim();
  }

  return null;
}

function extractCozoParentId(event: SemEvent): string | null {
  const data = getEventData(event);
  if (typeof data?.parentId === "string" && (data.parentId as string).trim() !== "") {
    return (data.parentId as string).trim();
  }

  const bundleId = extractCozoBundleId(event);
  return bundleId ? `cozo-bundle:${bundleId}` : null;
}

function extractCozoOrdinal(event: SemEvent): number | null {
  const data = getEventData(event);
  const ordinal = data?.ordinal;
  if (Number.isInteger(ordinal) && (ordinal as number) > 0) {
    return ordinal as number;
  }

  const itemId = extractCanonicalId(event);
  if (typeof itemId !== "string") {
    return null;
  }

  const suffix = itemId.split(":").at(-1);
  const parsed = Number.parseInt(suffix || "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function extractCozoMode(event: SemEvent): string | null {
  const data = getEventData(event);
  return typeof data?.mode === "string" && (data.mode as string).trim() !== "" ? (data.mode as string).trim() : null;
}

function extractNotebookId(event: SemEvent): string | null {
  const data = getEventData(event);
  return typeof data?.notebookId === "string" && (data.notebookId as string).trim() !== "" ? (data.notebookId as string).trim() : null;
}

function extractOwnerCellId(event: SemEvent): string | null {
  const data = getEventData(event);
  return typeof data?.ownerCellId === "string" && (data.ownerCellId as string).trim() !== "" ? (data.ownerCellId as string).trim() : null;
}

function extractRunId(event: SemEvent): string | null {
  const data = getEventData(event);
  return typeof data?.runId === "string" && (data.runId as string).trim() !== "" ? (data.runId as string).trim() : null;
}

function extractLLMDelta(event: SemEvent): string {
  if (typeof event?.data === "string") {
    return event.data;
  }

  const data = getEventData(event);
  if (typeof data?.delta === "string") {
    return data.delta as string;
  }

  return "";
}

function extractLLMFinalText(event: SemEvent): string {
  if (typeof event?.data === "string") {
    return event.data;
  }

  const data = getEventData(event);
  if (typeof data?.text === "string") {
    return data.text as string;
  }

  if (typeof data?.cumulative === "string") {
    return data.cumulative as string;
  }

  return "";
}

function kindForEvent(event: SemEvent, entityId: string | null): EntityKind {
  if (!event?.type) {
    return ENTITY_KIND_LLM_TEXT_STREAM;
  }

  if (event.type === HINT_RESULT_EVENT) {
    return entityId?.startsWith("diag-") ? ENTITY_KIND_DIAGNOSIS : ENTITY_KIND_LLM_TEXT_STREAM;
  }

  return COZO_EVENT_KIND_BY_TYPE[event.type] || ENTITY_KIND_LLM_TEXT_STREAM;
}

function createEntity(event: SemEvent, entityId: string): SemEntity {
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
    parentId: null,
    bundleId: null,
    ordinal: null,
    mode: null,
    notebookId: null,
    ownerCellId: null,
    runId: null,
  };
}

function ensureEntity(state: SemProjectionState, event: SemEvent, entityId: string): SemEntity {
  return (state.entities[entityId] as SemEntity) || createEntity(event, entityId);
}

function createBundleEntity(bundleEntityId: string): SemBundleEntity {
  return {
    id: bundleEntityId,
    kind: ENTITY_KIND_COZO_BUNDLE,
    status: "idle",
    anchorLine: null,
    bundleId: null,
    mode: null,
    error: null,
    notebookId: null,
    ownerCellId: null,
    runId: null,
  };
}

function projectCozoEntity(entity: SemEntity, event: SemEvent, status: EntityStatus): SemEntity {
  const anchorLine = extractAnchorLine(event);
  const parentId = extractCozoParentId(event);
  const bundleId = extractCozoBundleId(event);
  const ordinal = extractCozoOrdinal(event);
  const mode = extractCozoMode(event);
  const notebookId = extractNotebookId(event);
  const ownerCellId = extractOwnerCellId(event);
  const runId = extractRunId(event);
  const data = getEventData(event);

  return {
    ...entity,
    kind: kindForEvent(event, entity.id),
    status,
    data: extractStructuredPayload(event),
    error: (data?.error as string) || null,
    anchorLine: anchorLine ?? entity.anchorLine,
    transient: Boolean(data?.transient),
    parentId: parentId ?? entity.parentId,
    bundleId: bundleId ?? entity.bundleId,
    ordinal: ordinal ?? entity.ordinal,
    mode: mode ?? entity.mode,
    notebookId: notebookId ?? entity.notebookId,
    ownerCellId: ownerCellId ?? entity.ownerCellId,
    runId: runId ?? entity.runId,
  };
}

function projectBundleEntity(bundle: SemBundleEntity, event: SemEvent, status: EntityStatus): SemBundleEntity {
  const anchorLine = extractAnchorLine(event);
  const bundleId = extractCozoBundleId(event);
  const mode = extractCozoMode(event);
  const notebookId = extractNotebookId(event);
  const ownerCellId = extractOwnerCellId(event);
  const runId = extractRunId(event);
  const data = getEventData(event);

  return {
    ...bundle,
    kind: ENTITY_KIND_COZO_BUNDLE,
    status,
    anchorLine: anchorLine ?? bundle.anchorLine,
    bundleId: bundleId ?? bundle.bundleId,
    mode: mode ?? bundle.mode,
    error: (data?.error as string) || null,
    notebookId: notebookId ?? bundle.notebookId,
    ownerCellId: ownerCellId ?? bundle.ownerCellId,
    runId: runId ?? bundle.runId,
  };
}

function isCozoLeafKind(kind: string | undefined): boolean {
  return (
    kind === ENTITY_KIND_COZO_HINT
    || kind === ENTITY_KIND_COZO_QUERY_SUGGESTION
    || kind === ENTITY_KIND_COZO_DOC_REF
  );
}

function trimTrailingDisplayWhitespace(text: string | undefined): string {
  return typeof text === "string" ? text.replace(/[ \t\r\n]+$/u, "") : "";
}

function getOrderedSemEntities(state: SemProjectionState, predicate: (entity: SemEntity) => boolean): SemEntity[] {
  return state.order
    .map((entityId) => state.entities[entityId])
    .filter((entity): entity is SemEntity => isCozoLeafKind(entity?.kind) && predicate(entity as SemEntity));
}

function getOrderedCozoBundles(state: SemProjectionState, predicate: (bundle: SemBundleEntity) => boolean): SemBundleEntity[] {
  return state.order
    .map((entityId) => state.entities[entityId])
    .filter((entity): entity is SemBundleEntity => entity?.kind === ENTITY_KIND_COZO_BUNDLE && predicate(entity as SemBundleEntity));
}

function getBundleChildren(state: SemProjectionState, bundleEntityId: string): SemEntity[] {
  return Object.values(state.entities)
    .filter((entity): entity is SemEntity => (entity as SemEntity)?.parentId === bundleEntityId && isCozoLeafKind(entity?.kind))
    .sort((left, right) => (left.ordinal ?? 0) - (right.ordinal ?? 0));
}

function buildBundleThread(state: SemProjectionState, bundle: SemBundleEntity): SemThread {
  const children = getBundleChildren(state, bundle.id);
  const hint = children.find((entity) => entity.kind === ENTITY_KIND_COZO_HINT) || null;
  const ownerCellId = bundle.ownerCellId ?? hint?.ownerCellId ?? null;
  const notebookId = bundle.notebookId ?? hint?.notebookId ?? null;
  const runId = bundle.runId ?? hint?.runId ?? null;

  return {
    id: bundle.id,
    bundle,
    hint,
    children: hint ? children.filter((entity) => entity.id !== hint.id) : children,
    anchorLine: bundle.anchorLine ?? null,
    ...(ownerCellId ? { ownerCellId } : {}),
    ...(notebookId ? { notebookId } : {}),
    ...(runId ? { runId } : {}),
  };
}

export function createSemProjectionState(): SemProjectionState {
  return {
    entities: {},
    order: [],
  };
}

export function applySemEvent(state: SemProjectionState, event: SemEvent): SemProjectionState {
  if (!event?.type) {
    return state;
  }

  const entityId = extractCanonicalId(event);
  if (!entityId) {
    return state;
  }

  const entity = ensureEntity(state, event, entityId);
  let nextOrder = appendOrder(state.order, entityId);
  let nextEntity: SemEntity = entity;
  let nextEntities: Record<string, ProjectedEntity> = state.entities;
  const data = getEventData(event);

  switch (event.type) {
    case LLM_START_EVENT:
      nextEntity = {
        ...entity,
        kind: ENTITY_KIND_LLM_TEXT_STREAM,
        status: "streaming",
        text: "",
        finalText: "",
        notebookId: extractNotebookId(event) ?? entity.notebookId,
        ownerCellId: extractOwnerCellId(event) ?? entity.ownerCellId,
        runId: extractRunId(event) ?? entity.runId,
      };
      break;
    case LLM_DELTA_EVENT:
      nextEntity = {
        ...entity,
        kind: ENTITY_KIND_LLM_TEXT_STREAM,
        status: "streaming",
        text: `${entity.text || ""}${extractLLMDelta(event)}`,
        notebookId: extractNotebookId(event) ?? entity.notebookId,
        ownerCellId: extractOwnerCellId(event) ?? entity.ownerCellId,
        runId: extractRunId(event) ?? entity.runId,
      };
      break;
    case LLM_FINAL_EVENT:
      nextEntity = {
        ...entity,
        kind: ENTITY_KIND_LLM_TEXT_STREAM,
        status: "complete",
        finalText: trimTrailingDisplayWhitespace(extractLLMFinalText(event)),
        notebookId: extractNotebookId(event) ?? entity.notebookId,
        ownerCellId: extractOwnerCellId(event) ?? entity.ownerCellId,
        runId: extractRunId(event) ?? entity.runId,
      };
      break;
    case LLM_ERROR_EVENT:
      nextEntity = {
        ...entity,
        status: "error",
        notebookId: extractNotebookId(event) ?? entity.notebookId,
        ownerCellId: extractOwnerCellId(event) ?? entity.ownerCellId,
        runId: extractRunId(event) ?? entity.runId,
      };
      break;
    case HINT_RESULT_EVENT:
      if (!entityId.startsWith("diag-") && !extractOwnerCellId(event)) {
        return state;
      }
      nextEntity = {
        ...entity,
        kind: entityId.startsWith("diag-") ? ENTITY_KIND_DIAGNOSIS : ENTITY_KIND_LLM_TEXT_STREAM,
        response: (data as Record<string, unknown>) || null,
        status: "complete",
        notebookId: extractNotebookId(event) ?? entity.notebookId,
        ownerCellId: extractOwnerCellId(event) ?? entity.ownerCellId,
        runId: extractRunId(event) ?? entity.runId,
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

  nextEntities = {
    ...nextEntities,
    [entityId]: nextEntity,
  };

  if (event.type.startsWith("cozo.")) {
    const bundleEntityId = extractCozoParentId(event);
    if (bundleEntityId) {
      const bundle = (state.entities[bundleEntityId] as SemBundleEntity) || createBundleEntity(bundleEntityId);
      nextEntities[bundleEntityId] = projectBundleEntity(bundle, event, nextEntity.status);
      nextOrder = appendOrder(nextOrder, bundleEntityId);
    }
  }

  return {
    entities: nextEntities,
    order: nextOrder,
  };
}

export function getStreamingEntries(state: SemProjectionState): [string, string][] {
  return state.order
    .map((entityId) => state.entities[entityId] as SemEntity | undefined)
    .filter((entity): entity is SemEntity => entity?.kind === ENTITY_KIND_LLM_TEXT_STREAM && entity?.status === "streaming" && !entity?.ownerCellId)
    .map((entity) => [entity.id, trimTrailingDisplayWhitespace(entity.text)]);
}

export function getStreamingEntriesForCell(state: SemProjectionState, ownerCellId: string): [string, string][] {
  return state.order
    .map((entityId) => state.entities[entityId] as SemEntity | undefined)
    .filter((entity): entity is SemEntity => entity?.kind === ENTITY_KIND_LLM_TEXT_STREAM && entity?.status === "streaming" && entity?.ownerCellId === ownerCellId)
    .map((entity) => [entity.id, trimTrailingDisplayWhitespace(entity.text)]);
}

export function getInlineSemEntities(state: SemProjectionState, lineIdx: number): SemEntity[] {
  return getOrderedSemEntities(state, (entity) => !entity?.ownerCellId && entity?.anchorLine === lineIdx);
}

export function getTrailingSemEntities(state: SemProjectionState): SemEntity[] {
  return getOrderedSemEntities(state, (entity) => !entity?.ownerCellId && entity?.anchorLine == null);
}

export function getInlineSemThreads(state: SemProjectionState, lineIdx: number): SemThread[] {
  return getOrderedCozoBundles(state, (bundle) => !bundle?.ownerCellId && bundle?.anchorLine === lineIdx).map((bundle) => buildBundleThread(state, bundle));
}

export function getTrailingSemThreads(state: SemProjectionState): SemThread[] {
  return getOrderedCozoBundles(state, (bundle) => !bundle?.ownerCellId && bundle?.anchorLine == null).map((bundle) => buildBundleThread(state, bundle));
}

export function getAllSemThreads(state: SemProjectionState): SemThread[] {
  return getOrderedCozoBundles(state, () => true).map((bundle) => buildBundleThread(state, bundle));
}

export function getSemThreadsForCell(state: SemProjectionState, ownerCellId: string): SemThread[] {
  return getOrderedCozoBundles(state, (bundle) => bundle?.ownerCellId === ownerCellId).map((bundle) => buildBundleThread(state, bundle));
}

export function getHintResponseForCell(state: SemProjectionState, ownerCellId: string): HintResponsePayload | null {
  const entity = [...state.order]
    .reverse()
    .map((entityId) => state.entities[entityId] as SemEntity | undefined)
    .find((candidate) =>
      candidate?.kind === ENTITY_KIND_LLM_TEXT_STREAM
      && candidate?.ownerCellId === ownerCellId
      && candidate?.status === "complete"
      && candidate?.response
    );

  if (!entity?.response) {
    return null;
  }

  return entity.response as HintResponsePayload;
}

export function getDiagnosisForCell(state: SemProjectionState, ownerCellId: string): SemEntity | null {
  const entity = [...state.order]
    .reverse()
    .map((entityId) => state.entities[entityId] as SemEntity | undefined)
    .find((candidate) =>
      candidate?.kind === ENTITY_KIND_DIAGNOSIS
      && candidate?.ownerCellId === ownerCellId
      && candidate?.status === "complete"
      && candidate?.response
    );

  return entity || null;
}
