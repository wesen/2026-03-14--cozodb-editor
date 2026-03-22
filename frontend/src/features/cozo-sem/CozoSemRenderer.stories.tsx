import type { Meta, StoryObj } from "@storybook/react-vite";
import { CozoSemRenderer } from "./CozoSemRenderer";
import type { SemBundleEntity, SemEntity, SemThread } from "../../sem/semProjection";

const threadWithHintAndChildren = {
  id: "cozo-bundle:storybook-thread",
  bundle: {
    id: "cozo-bundle:storybook-thread",
    kind: "cozo_bundle",
    anchorLine: 2,
  } as unknown as SemBundleEntity,
  anchorLine: 2,
  hint: {
    id: "cozo-item:storybook-thread:hint:1",
    kind: "cozo_hint",
    status: "complete",
    data: {
      text: "Use an inline rule to isolate the subset first.",
      code: "?[name, age] := *users{name, age}, age > 30",
      chips: ["ask about indexes"],
    },
  } as unknown as SemEntity,
  children: [
    {
      id: "cozo-item:storybook-thread:query_suggestion:2",
      kind: "cozo_query_suggestion",
      status: "complete",
      data: {
        label: "Filter down to adults",
        code: "?[name, age] := *users{name, age}, age > 18",
        reason: "Reduces the result set before later joins.",
      },
    } as unknown as SemEntity,
    {
      id: "cozo-item:storybook-thread:doc_ref:3",
      kind: "cozo_doc_ref",
      status: "complete",
      data: {
        title: "Inline rules",
        section: "§2.1",
        body: "Inline rules define returned variables and can be chained with relation scans.",
      },
    } as unknown as SemEntity,
  ],
} as unknown as SemThread;

const childOnlyThread = {
  id: "cozo-bundle:storybook-child-only",
  bundle: {
    id: "cozo-bundle:storybook-child-only",
    kind: "cozo_bundle",
    anchorLine: null,
  } as unknown as SemBundleEntity,
  anchorLine: null,
  hint: null,
  children: [
    {
      id: "cozo-item:storybook-child-only:query_suggestion:2",
      kind: "cozo_query_suggestion",
      status: "complete",
      data: {
        label: "Add a result limit",
        code: "?[name] := *users{name}, :limit 20",
        reason: "Useful while iterating on queries during debugging.",
      },
    } as unknown as SemEntity,
  ],
} as unknown as SemThread;

const meta = {
  title: "Features/SEM/CozoSemRenderer",
  component: CozoSemRenderer,
  args: {
    onAddToNotebook: () => {},
    onAskQuestion: () => {},
    onDismiss: () => {},
    onInsertCode: () => {},
    onToggleCollapse: () => {},
    thread: threadWithHintAndChildren,
  },
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <div style={{ width: 720 }}>
      <CozoSemRenderer {...args} />
    </div>
  ),
} satisfies Meta<typeof CozoSemRenderer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ExpandedThread: Story = {};

export const CollapsedThread: Story = {
  args: {
    collapsed: true,
  },
};

export const ChildOnly: Story = {
  args: {
    thread: childOnlyThread,
  },
};
