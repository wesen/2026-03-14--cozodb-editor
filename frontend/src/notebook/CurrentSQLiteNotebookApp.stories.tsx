import type { Meta, StoryObj } from "@storybook/react-vite";
import { createStaticHintsSocket } from "../storybook/createStaticHintsSocket";
import { createSQLiteNotebookApiHandlers } from "../storybook/notebookApiHandlers";
import { CurrentSQLiteNotebookApp } from "./currentSQLite";

const meta = {
  title: "Notebook/CurrentSQLiteNotebookApp",
  component: CurrentSQLiteNotebookApp,
  parameters: {
    layout: "fullscreen",
    msw: {
      handlers: {
        notebook: createSQLiteNotebookApiHandlers(),
      },
    },
  },
  args: {
    confirmAction: () => true,
    ws: createStaticHintsSocket(true),
  },
} satisfies Meta<typeof CurrentSQLiteNotebookApp>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};

export const Offline: Story = {
  args: {
    shellConfig: {
      appName: "SQLite Notebook Offline",
    },
    ws: createStaticHintsSocket(false),
  },
};
