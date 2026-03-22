import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  COZO_DOC_REF_EXTRACTED_EVENT,
  COZO_HINT_EXTRACTED_EVENT,
  COZO_QUERY_SUGGESTION_EXTRACTED_EVENT,
  HINT_RESULT_EVENT,
} from "../sem/semEventTypes";
import type { SemEvent } from "../transport/hintsSocket";
import type { CellRuntime, NotebookDocument } from "../transport/httpClient";
import { type NotebookStoryStateOptions } from "../storybook/createNotebookStoryStore";
import { NotebookStoryProvider } from "../storybook/notebookStoryStore";
import { NotebookCellCard } from "./NotebookCellCard";
import type { NotebookCellCardProps } from "./NotebookCellCard";

const document: NotebookDocument = {
  notebook: {
    id: "nb_1",
    title: "Notebook",
    created_at_ms: 1_000,
    updated_at_ms: 2_000,
  },
  cells: [
    {
      id: "cell_1",
      notebook_id: "nb_1",
      kind: "code",
      source: "?[name, age] := *users{name, age}, age > 30",
      position: 0,
      created_at_ms: 1_000,
      updated_at_ms: 2_000,
    },
  ],
  runtime: {},
};

const queryRuntime: Record<string, CellRuntime> = {
  cell_1: {
    run: {
      id: "run_query",
      cell_id: "cell_1",
      notebook_id: "nb_1",
      status: "complete",
      execution_count: 2,
      finished_at_ms: Date.now() - 20_000,
    },
    output: {
      kind: "query_result",
      headers: ["name", "age"],
      rows: [["Ada", 31], ["Grace", 42]],
      took: 4,
    },
  },
};

const errorRuntime: Record<string, CellRuntime> = {
  cell_1: {
    run: {
      id: "run_error",
      cell_id: "cell_1",
      notebook_id: "nb_1",
      status: "error",
      execution_count: 3,
      finished_at_ms: Date.now() - 10_000,
    },
    output: {
      kind: "error_result",
      display: "Evaluation failed: variable age is not bound.",
      message: "Evaluation failed: variable age is not bound.",
    },
  },
};

const fallbackHintEvents: SemEvent[] = [
  {
    type: HINT_RESULT_EVENT,
    id: "hint-cell-1",
    data: {
      ownerCellId: "cell_1",
      text: "Bind `age` before filtering.",
      code: "?[name, age] := *users{name, age}, age > 30",
      chips: ["show fixed example"],
    },
  },
];

const semThreadEvents: SemEvent[] = [
  {
    type: COZO_HINT_EXTRACTED_EVENT,
    id: "cozo-item:storybook-thread:hint:1",
    stream_id: "storybook-thread",
    data: {
      bundleId: "storybook-thread",
      itemId: "cozo-item:storybook-thread:hint:1",
      ownerCellId: "cell_1",
      ordinal: 1,
      data: {
        text: "Use an inline rule to isolate the subset first.",
        code: "?[name, age] := *users{name, age}, age > 30",
      },
    },
  },
  {
    type: COZO_QUERY_SUGGESTION_EXTRACTED_EVENT,
    id: "cozo-item:storybook-thread:query:2",
    stream_id: "storybook-thread",
    data: {
      bundleId: "storybook-thread",
      itemId: "cozo-item:storybook-thread:query:2",
      ownerCellId: "cell_1",
      ordinal: 2,
      data: {
        label: "Add a limit",
        code: "?[name] := *users{name}, :limit 20",
        reason: "Useful while iterating on the query.",
      },
    },
  },
  {
    type: COZO_DOC_REF_EXTRACTED_EVENT,
    id: "cozo-item:storybook-thread:doc:3",
    stream_id: "storybook-thread",
    data: {
      bundleId: "storybook-thread",
      itemId: "cozo-item:storybook-thread:doc:3",
      ownerCellId: "cell_1",
      ordinal: 3,
      data: {
        title: "Inline rules",
        section: "§2.1",
        body: "Inline rules define returned variables and can be chained with relation scans.",
      },
    },
  },
];

const diagnosisEvents: SemEvent[] = [
  {
    type: HINT_RESULT_EVENT,
    id: "diag-storybook",
    data: {
      ownerCellId: "cell_1",
      text: "Bind age in the relation scan before filtering.",
      code: "?[name, age] := *users{name, age}, age > 30",
    },
  },
];

interface NotebookCellCardStoryProps extends NotebookCellCardProps {
  storyOptions: NotebookStoryStateOptions;
}

function NotebookCellCardStory({ storyOptions, ...args }: NotebookCellCardStoryProps) {
  return (
    <div style={{ width: 840 }}>
      <NotebookStoryProvider options={storyOptions}>
        <NotebookCellCard {...args} />
      </NotebookStoryProvider>
    </div>
  );
}

const meta = {
  title: "Notebook/NotebookCellCard",
  component: NotebookCellCardStory,
  parameters: {
    layout: "padded",
  },
  args: {
    cellId: "cell_1",
    cellIndex: 0,
    onAskAI: () => {},
    onDiagnose: () => {},
    onRunAndInsertBelow: () => {},
    wsConnected: true,
    storyOptions: {
      activeCellId: "cell_1",
      document,
      runtimeByCell: queryRuntime,
    },
  },
} satisfies Meta<NotebookCellCardStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ConnectedQueryResult: Story = {};

export const ConnectedFallbackHint: Story = {
  args: {
    storyOptions: {
      activeCellId: "cell_1",
      document,
      runtimeByCell: errorRuntime,
      semEvents: fallbackHintEvents,
    },
  },
};

export const ConnectedSemThread: Story = {
  args: {
    storyOptions: {
      activeCellId: "cell_1",
      document,
      runtimeByCell: queryRuntime,
      semEvents: semThreadEvents,
    },
  },
};

export const ConnectedDiagnosis: Story = {
  args: {
    storyOptions: {
      activeCellId: "cell_1",
      document,
      runtimeByCell: errorRuntime,
      semEvents: diagnosisEvents,
    },
  },
};
