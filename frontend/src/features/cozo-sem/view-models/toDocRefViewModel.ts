import type { SemEntity } from "../../../sem/semProjection";

export interface DocRefViewModel {
  body: string;
  section: string;
  status: string;
  title: string;
  url: string;
}

export function toDocRefViewModel(entity: SemEntity | null | undefined): DocRefViewModel {
  const payload = (entity?.data as Record<string, unknown>) || {};
  return {
    body: (payload.body as string) || "",
    section: (payload.section as string) || "",
    status: entity?.status || "idle",
    title: (payload.title as string) || "Reference",
    url: (payload.url as string) || "",
  };
}
