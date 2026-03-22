import type { Meta, StoryObj } from "@storybook/react-vite";
import { CurrentJavaScriptNotebookApp } from "./currentJavaScript";
import { createJavaScriptNotebookApiHandlers } from "../storybook/notebookApiHandlers";
import { createStaticHintsSocket } from "../storybook/createStaticHintsSocket";

const meta = {
  title: "Notebook/CurrentJavaScriptNotebookApp",
  component: CurrentJavaScriptNotebookApp,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        notebook: createJavaScriptNotebookApiHandlers(),
      },
    },
  },
  args: {
    confirmAction: () => true,
    ws: createStaticHintsSocket(true),
  },
} satisfies Meta<typeof CurrentJavaScriptNotebookApp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const Offline: Story = {
  args: {
    shellConfig: {
      appName: "JavaScript Notebook Offline",
    },
    ws: createStaticHintsSocket(false),
  },
};
