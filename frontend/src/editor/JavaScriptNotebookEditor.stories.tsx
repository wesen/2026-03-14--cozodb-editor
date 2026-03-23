import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ComponentProps } from "react";
import { JavaScriptNotebookEditor } from "./JavaScriptNotebookEditor";

function StoryRender({ value: initialValue, ...args }: ComponentProps<typeof JavaScriptNotebookEditor>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div style={{ width: 860 }}>
      <JavaScriptNotebookEditor
        {...args}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

const meta = {
  title: "Editor/JavaScriptNotebookEditor",
  component: JavaScriptNotebookEditor,
  parameters: {
    layout: "padded",
  },
  render: (args) => <StoryRender {...args} />,
  args: {
    autoFocus: false,
    onBlur: () => undefined,
    onChange: () => undefined,
    onFocus: () => undefined,
    onRun: () => undefined,
    onRunAndInsert: () => undefined,
    placeholder: "// Enter JavaScript...",
    value: `const users = [
  { name: "Ada", age: 31 },
  { name: "Grace", age: 42 },
];

users.filter((user) => user.age > 35);`,
  },
} satisfies Meta<typeof JavaScriptNotebookEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AsyncExample: Story = {
  args: {
    value: `async function loadUsers() {
  return Promise.resolve([{ name: "Ada" }, { name: "Grace" }]);
}

const users = await loadUsers();
users.map((user) => user.name);`,
  },
};
