export interface NotebookShellConfig {
  appName: string;
  menuItems: string[];
  shortcutHint: string;
}

export const defaultNotebookShellConfig: NotebookShellConfig = {
  appName: "CozoDB Notebook",
  menuItems: ["File", "Edit", "Cell", "Runtime"],
  shortcutHint: "j/k nav | Enter edit | Shift+Enter run+advance | Alt/Ctrl+Enter run+new | a +code | m +md | x delete",
};

export function mergeNotebookShellConfig(overrides: Partial<NotebookShellConfig> = {}): NotebookShellConfig {
  return {
    ...defaultNotebookShellConfig,
    ...overrides,
    menuItems: overrides.menuItems ?? defaultNotebookShellConfig.menuItems,
  };
}
