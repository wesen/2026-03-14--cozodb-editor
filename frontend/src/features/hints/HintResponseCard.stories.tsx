import type { Meta, StoryObj } from "@storybook/react-vite";
import { HintResponseCard } from "./HintResponseCard";

const response = {
  text: "Use **:create** to define the relation first, then insert rows with a second query.",
  code: ":create users {name: String => age: Int}",
  chips: ["insert sample data", "show schema"],
  docs: [
    {
      title: "create",
      section: "§6.1",
      body: "Creates a stored relation and defines its key and value columns.",
    },
    {
      title: "insert",
      section: "§6.3",
      body: "Appends rows into an existing relation.",
    },
  ],
};

const meta = {
  title: "Features/Hints/HintResponseCard",
  component: HintResponseCard,
  args: {
    collapsed: false,
    onAddToNotebook: () => {},
    onChipClick: () => {},
    onInsert: () => {},
    onToggleCollapse: () => {},
    response,
  },
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <div style={{ width: 640 }}>
      <HintResponseCard {...args} />
    </div>
  ),
} satisfies Meta<typeof HintResponseCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Expanded: Story = {};

export const Collapsed: Story = {
  args: {
    collapsed: true,
  },
};

export const WithoutCode: Story = {
  args: {
    response: {
      text: "Try narrowing the query by adding a filter to the existing rule.",
      chips: ["add a filter", "show example"],
      docs: [],
    },
  },
};
