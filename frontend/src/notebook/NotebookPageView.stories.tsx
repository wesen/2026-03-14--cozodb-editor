import type { Meta, StoryObj } from "@storybook/react-vite";
import { MacButton } from "../components/primitives";
import { NotebookPageView } from "./NotebookPageView";

function StoryCell({ label, kind }: { kind: "code" | "markdown"; label: string }) {
  return (
    <div className="mac-window mac-cell-card is-active" style={{ marginBottom: 12 }}>
      <div className="mac-window__titlebar">
        <div className="mac-window__titlebar-left">
          <span className="mac-window__close" />
          <span className="mac-cell-label">{kind.toUpperCase()}</span>
        </div>
      </div>
      <div className="mac-cell-body">
        <div className={kind === "markdown" ? "mac-md-preview" : "mac-cell-editor"} style={{ minHeight: 48 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

const meta = {
  title: "Notebook/NotebookPageView",
  component: NotebookPageView,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    error: null,
    loading: false,
    notebook: {
      id: "nb_1",
      title: "Notebook Shell",
      created_at_ms: 1_000,
      updated_at_ms: 2_000,
    },
    onClearNotebook: () => {},
    onCreateCodeCell: () => {},
    onCreateMarkdownCell: () => {},
    onPersistTitle: () => {},
    onResetKernel: () => {},
    renderedCells: (
      <div className="mac-notebook-stack">
        <StoryCell kind="markdown" label="## Notes" />
        <StoryCell kind="code" label="?[name] := *users{name}" />
      </div>
    ),
    titleKey: "nb_1:2000",
    wsConnected: true,
  },
} satisfies Meta<typeof NotebookPageView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullShell: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
    notebook: null,
    renderedCells: null,
  },
};

export const ErrorState: Story = {
  args: {
    error: "Failed to load notebook",
    notebook: null,
    renderedCells: null,
  },
};

export const EmptyNotebook: Story = {
  args: {
    renderedCells: (
      <div className="mac-empty-state">
        <div className="mac-empty-state__icon">&#9000;</div>
        <div className="mac-empty-state__text">No cells yet.</div>
        <div className="mac-empty-state__actions mac-notebook-empty-actions">
          <MacButton>New Code Cell</MacButton>
          <MacButton>New Markdown Cell</MacButton>
        </div>
      </div>
    ),
  },
};
