import {
  ENTITY_KIND_COZO_DOC_REF,
  ENTITY_KIND_COZO_HINT,
  ENTITY_KIND_COZO_QUERY_SUGGESTION,
} from "../../sem/semProjection";
import { DocRefCard } from "./widgets/DocRefCard";
import { HintCard } from "./widgets/HintCard";
import { QuerySuggestionCard } from "./widgets/QuerySuggestionCard";
import { toDocRefViewModel } from "./view-models/toDocRefViewModel";
import { toHintViewModel } from "./view-models/toHintViewModel";
import { toQuerySuggestionViewModel } from "./view-models/toQuerySuggestionViewModel";

export function CozoSemRenderer({ entity, onAskQuestion, onInsertCode }) {
  if (!entity) {
    return null;
  }

  switch (entity.kind) {
    case ENTITY_KIND_COZO_HINT:
      return (
        <HintCard
          entity={entity}
          onAskQuestion={onAskQuestion}
          onInsertCode={onInsertCode}
          viewModel={toHintViewModel(entity)}
        />
      );
    case ENTITY_KIND_COZO_QUERY_SUGGESTION:
      return (
        <QuerySuggestionCard
          entity={entity}
          onInsertCode={onInsertCode}
          viewModel={toQuerySuggestionViewModel(entity)}
        />
      );
    case ENTITY_KIND_COZO_DOC_REF:
      return <DocRefCard entity={entity} viewModel={toDocRefViewModel(entity)} />;
    default:
      return null;
  }
}
