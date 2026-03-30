import type { Meta, StoryObj } from "@storybook/react-vite";
import { MacButton } from "./MacButton";

const meta = {
  title: "Primitives/MacButton",
  component: MacButton,
  args: {
    children: "Run query",
    disabled: false,
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MacButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    children: "Kernel offline",
    disabled: true,
  },
};

export const LongLabel: Story = {
  args: {
    children: "Insert suggestion into a new cell",
  },
};
