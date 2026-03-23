import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import type { HintResponsePayload, SemThread } from "../sem/semProjection";
import type { CellRuntime, NotebookCell } from "../transport/httpClient";
import { NotebookCellCardView, type NotebookCellCardViewProps } from "./NotebookCellCardView";

const baseCell: NotebookCell = {
  id: "cell_1",
  notebook_id: "nb_1",
  kind: "code",
  source: "?[name, age] := *users{name, age}, age > 30",
  position: 0,
  created_at_ms: Date.now() - 60_000,
  updated_at_ms: Date.now() - 15_000,
};

const markdownCell: NotebookCell = {
  ...baseCell,
  id: "cell_md",
  kind: "markdown",
  source: "## Notes\n\nThis query checks adult users.",
};

const queryRuntime: CellRuntime = {
  run: {
    id: "run_1",
    cell_id: "cell_1",
    notebook_id: "nb_1",
    status: "complete",
    execution_count: 3,
    finished_at_ms: Date.now() - 45_000,
  },
  output: {
    kind: "query_result",
    headers: ["name", "age"],
    rows: [["Ada", 31], ["Grace", 42]],
    took: 7,
  },
};

const errorRuntime: CellRuntime = {
  run: {
    id: "run_2",
    cell_id: "cell_1",
    notebook_id: "nb_1",
    status: "error",
    execution_count: 4,
    finished_at_ms: Date.now() - 12_000,
  },
  output: {
    kind: "error_result",
    display: "Evaluation failed: variable age is not bound.",
    message: "Evaluation failed: variable age is not bound.",
  },
};

const fallbackHint: HintResponsePayload = {
  text: "Try binding `age` in the scan before using it in the predicate.",
  code: "?[name, age] := *users{name, age}, age > 30",
  chips: ["show fixed example"],
  docs: [{ title: "Variables", section: "§1.3", body: "Variables must be bound before they are referenced." }],
};

const semThread = {
  id: "cozo-bundle:storybook-view",
  bundle: {
    id: "cozo-bundle:storybook-view",
    kind: "cozo_bundle",
    anchorLine: 0,
  },
  anchorLine: 0,
  hint: {
    id: "cozo-item:storybook-view:hint:1",
    kind: "cozo_hint",
    status: "complete",
    data: {
      text: "Split the query into an inline rule first.",
      code: "?[adult] := *users{name, age}, age > 30",
    },
  },
  children: [
    {
      id: "cozo-item:storybook-view:query_suggestion:2",
      kind: "cozo_query_suggestion",
      status: "complete",
      data: {
        label: "Add a limit",
        code: "?[name] := *users{name}, :limit 20",
      },
    },
  ],
} as unknown as SemThread;

function noop() {}

function StoryRender(args: NotebookCellCardViewProps) {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [showAIForm, setShowAIForm] = useState(args.showAIForm);
  const [outputCollapsed, setOutputCollapsed] = useState(args.outputCollapsed);

  return (
    <div style={{ width: 840 }}>
      <NotebookCellCardView
        {...args}
        editorRef={editorRef}
        onToggleAIForm={() => setShowAIForm((current) => !current)}
        onToggleOutputCollapsed={() => setOutputCollapsed((current) => !current)}
        outputCollapsed={outputCollapsed}
        showAIForm={showAIForm}
      />
    </div>
  );
}

const meta = {
  title: "Notebook/NotebookCellCardView",
  component: NotebookCellCardView,
  parameters: {
    layout: "padded",
  },
  render: (args) => <StoryRender {...args} />,
  args: {
    aiPrompt: "",
    cell: baseCell,
    cellIndex: 0,
    collapsedThreadIds: {},
    diagnosisFix: null,
    editorRef: { current: null },
    executionCount: queryRuntime.run?.execution_count,
    fallbackHint: null,
    finishedAt: queryRuntime.run?.finished_at_ms,
    isActive: true,
    isDirty: false,
    isEditing: true,
    isStale: false,
    onActivate: noop,
    onAIInputChange: noop,
    onAIInputSubmit: noop,
    onDelete: noop,
    onDiagnose: noop,
    onDiagnosisAddToNotebook: noop,
    onDiagnosisApplyFix: noop,
    onEditorBlur: noop,
    onEditorChange: noop,
    onEditorFocus: noop,
    onEditorKeyDown: noop,
    onHintAddToNotebook: noop,
    onHintChipClick: noop,
    onHintInsert: noop,
    onHintToggleCollapse: noop,
    onInsertCodeBelow: noop,
    onInsertMarkdownBelow: noop,
    onMarkdownPreviewClick: noop,
    onMoveDown: noop,
    onMoveUp: noop,
    onRun: noop,
    onRunAndInsertBelow: noop,
    onThreadAddToNotebook: noop,
    onThreadAskQuestion: noop,
    onThreadDismiss: noop,
    onThreadInsertCode: noop,
    onThreadToggleCollapse: noop,
    onToggleAIForm: noop,
    onToggleOutputCollapsed: noop,
    outputCollapsed: false,
    runtime: queryRuntime,
    showAIForm: false,
    streams: [],
    threads: [],
    wsConnected: true,
  },
} satisfies Meta<typeof NotebookCellCardView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const QueryResult: Story = {};

export const WithFallbackHint: Story = {
  args: {
    fallbackHint,
    runtime: errorRuntime,
  },
};

export const WithDiagnosis: Story = {
  args: {
    diagnosisFix: {
      text: "Bind age in the scan before filtering by it.",
      code: "?[name, age] := *users{name, age}, age > 30",
    },
    runtime: errorRuntime,
  },
};

export const WithSemThread: Story = {
  args: {
    threads: [semThread],
    runtime: queryRuntime,
  },
};

export const MarkdownPreview: Story = {
  args: {
    cell: markdownCell,
    isEditing: false,
    runtime: undefined,
    finishedAt: undefined,
  },
};
