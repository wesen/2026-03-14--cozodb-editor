import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActionRow } from "./ActionRow";
import { MacButton } from "./MacButton";
import { PillButton } from "./PillButton";

const meta = {
  title: "Primitives/ActionRow",
  component: ActionRow,
  parameters: {
    layout: "padded",
  },
  render: () => (
    <ActionRow>
      <MacButton>Run</MacButton>
      <MacButton>Insert</MacButton>
      <PillButton>Optional tag</PillButton>
    </ActionRow>
  ),
} satisfies Meta<typeof ActionRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WrapsOnSmallWidth: Story = {
  render: () => (
    <div style={{ width: 220 }}>
      <ActionRow>
        <MacButton>Run</MacButton>
        <MacButton>Insert below</MacButton>
        <MacButton>Add to notebook</MacButton>
        <PillButton>Semantic helper</PillButton>
      </ActionRow>
    </div>
  ),
};
