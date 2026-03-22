import type { Meta, StoryObj } from "@storybook/react-vite";
import { PillButton } from "./PillButton";

const meta = {
  title: "Primitives/PillButton",
  component: PillButton,
  args: {
    children: "collapse",
    tone: "neutral",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PillButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Accent: Story = {
  args: {
    children: "copied",
    tone: "accent",
  },
};

export const Danger: Story = {
  args: {
    children: "dismiss",
    tone: "danger",
  },
};
