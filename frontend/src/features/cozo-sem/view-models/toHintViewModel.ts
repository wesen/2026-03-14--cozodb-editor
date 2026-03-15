import type { SemEntity } from "../../../sem/semProjection";

export interface HintViewModel {
  chips: string[];
  code: string;
  status: string;
  text: string;
  warning: string;
}

export function toHintViewModel(entity: SemEntity | null | undefined): HintViewModel {
  const payload = (entity?.data as Record<string, unknown>) || {};
  return {
    chips: (payload.chips as string[]) || [],
    code: (payload.code as string) || "",
    status: entity?.status || "idle",
    text: (payload.text as string) || "",
    warning: (payload.warning as string) || "",
  };
}
