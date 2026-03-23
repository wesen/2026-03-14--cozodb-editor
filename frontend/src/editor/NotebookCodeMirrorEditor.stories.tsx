import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { cozoLanguage, cozoCompletions } from "./codemirror/index.js";
import {
  NotebookCodeMirrorEditor,
  type NotebookCodeMirrorEditorProps,
} from "./NotebookCodeMirrorEditor";

function StoryRender(args: NotebookCodeMirrorEditorProps) {
  const [value, setValue] = useState(args.value);

  return (
    <div style={{ width: 860 }}>
      <NotebookCodeMirrorEditor
        {...args}
        value={value}
        onChange={setValue}
      />
    </div>
  );
}

const meta = {
  title: "Editor/NotebookCodeMirrorEditor",
  component: NotebookCodeMirrorEditor,
  parameters: {
    layout: "padded",
  },
  render: (args) => <StoryRender {...args} />,
  args: {
    autoFocus: false,
    onChange: () => undefined,
    onBlur: () => undefined,
    onFocus: () => undefined,
    onRun: () => undefined,
    onRunAndInsert: () => undefined,
    placeholder: "// Enter code...",
    value: "const answer = 42;\nanswer;",
  },
} satisfies Meta<typeof NotebookCodeMirrorEditor>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Plain: Story = {};

export const CozoConfigured: Story = {
  args: {
    placeholder: "-- Enter Datalog query...",
    value: "?[name, age] := *users{name, age}, age > 30",
    extensions: [
      cozoLanguage,
      cozoLanguage.data.of({ autocomplete: cozoCompletions }),
    ],
  },
};
