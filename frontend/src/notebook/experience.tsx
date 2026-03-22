import type { PropsWithChildren } from "react";
import { NotebookExperienceContext, defaultNotebookExperienceConfig, type NotebookExperienceConfig } from "./experienceConfig";

export function NotebookExperienceProvider({
  children,
  value,
}: PropsWithChildren<{
  value?: Partial<NotebookExperienceConfig>;
}>) {
  const resolvedValue: NotebookExperienceConfig = {
    ...defaultNotebookExperienceConfig,
    ...value,
    SemThreadRenderer: value?.SemThreadRenderer ?? defaultNotebookExperienceConfig.SemThreadRenderer,
  };

  return (
    <NotebookExperienceContext.Provider value={resolvedValue}>
      {children}
    </NotebookExperienceContext.Provider>
  );
}
