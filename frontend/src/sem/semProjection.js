function createEntity(event) {
  return {
    id: event.id,
    kind: event.id?.startsWith("diag-") ? "diagnosis" : "hint",
    response: null,
    status: "idle",
    text: "",
  };
}

function ensureEntity(state, event) {
  return state.entities[event.id] || createEntity(event);
}

function appendOrder(order, entityId) {
  if (order.includes(entityId)) {
    return order;
  }

  return [...order, entityId];
}

export function createSemProjectionState() {
  return {
    entities: {},
    order: [],
  };
}

export function applySemEvent(state, event) {
  if (!event?.id || !event?.type) {
    return state;
  }

  const entity = ensureEntity(state, event);
  const nextOrder = appendOrder(state.order, entity.id);
  let nextEntity = entity;

  switch (event.type) {
    case "llm.start":
      nextEntity = {
        ...entity,
        status: "streaming",
        text: "",
      };
      break;
    case "llm.delta":
      nextEntity = {
        ...entity,
        status: "streaming",
        text: `${entity.text || ""}${event.data || ""}`,
      };
      break;
    case "hint.result":
      nextEntity = {
        ...entity,
        response: event.data || null,
        status: "complete",
      };
      break;
    case "llm.error":
      nextEntity = {
        ...entity,
        status: "error",
      };
      break;
    default:
      return state;
  }

  return {
    entities: {
      ...state.entities,
      [nextEntity.id]: nextEntity,
    },
    order: nextOrder,
  };
}

export function getStreamingEntries(state) {
  return state.order
    .map((entityId) => state.entities[entityId])
    .filter((entity) => entity?.status === "streaming")
    .map((entity) => [entity.id, entity.text]);
}

export function getCompletedHintEntries(state) {
  return state.order
    .map((entityId) => state.entities[entityId])
    .filter((entity) => entity?.kind === "hint" && entity?.status === "complete" && entity.response)
    .map((entity) => [entity.id, entity.response]);
}
