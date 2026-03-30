import type { Meta, StoryObj } from "@storybook/react-vite";
import { SectionLabel } from "./SectionLabel";

const meta = {
  title: "Primitives/SectionLabel",
  component: SectionLabel,
  args: {
    children: "AI Assistant",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SectionLabel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Accent: Story = {
  render: (args) => <SectionLabel {...args} style={{ color: "var(--accent)" }} />,
};
