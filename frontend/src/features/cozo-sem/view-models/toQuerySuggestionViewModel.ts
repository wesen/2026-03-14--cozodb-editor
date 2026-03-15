import type { SemEntity } from "../../../sem/semProjection";

export interface QuerySuggestionViewModel {
  code: string;
  label: string;
  reason: string;
  status: string;
}

export function toQuerySuggestionViewModel(entity: SemEntity | null | undefined): QuerySuggestionViewModel {
  const payload = (entity?.data as Record<string, unknown>) || {};
  return {
    code: (payload.code as string) || "",
    label: (payload.label as string) || "Suggested query",
    reason: (payload.reason as string) || "",
    status: entity?.status || "idle",
  };
}
