import type { Meta, StoryObj } from "@storybook/react-vite";
import { CurrentCozoNotebookApp } from "./currentCozo";
import { createNotebookFixture, createNotebookApiHandlers } from "../storybook/notebookApiHandlers";
import { createStaticHintsSocket } from "../storybook/createStaticHintsSocket";

const meta = {
  title: "Notebook/CurrentCozoNotebookApp",
  component: CurrentCozoNotebookApp,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        notebook: createNotebookApiHandlers({
          document: createNotebookFixture(),
        }),
      },
    },
  },
  args: {
    confirmAction: () => true,
    ws: createStaticHintsSocket(true),
  },
} satisfies Meta<typeof CurrentCozoNotebookApp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const Offline: Story = {
  args: {
    shellConfig: {
      appName: "CozoDB Notebook Offline",
    },
    ws: createStaticHintsSocket(false),
  },
};
