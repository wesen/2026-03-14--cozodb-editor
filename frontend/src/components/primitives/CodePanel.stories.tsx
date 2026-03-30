import type { Meta, StoryObj } from "@storybook/react-vite";
import { CodePanel } from "./CodePanel";
import { PillButton } from "./PillButton";

const codeSample = `?[name, age] := *users{name, age}, age > 30`;

const meta = {
  title: "Primitives/CodePanel",
  component: CodePanel,
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <div style={{ width: 520 }}>
      <CodePanel {...args} />
    </div>
  ),
} satisfies Meta<typeof CodePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: codeSample,
  },
};

export const WithAction: Story = {
  args: {
    action: <PillButton tone="accent">copy</PillButton>,
    children: codeSample,
  },
};

export const FixedWhitespace: Story = {
  args: {
    preserveWhitespace: false,
    children: `:create users {name: String => age: Int}`,
  },
};
