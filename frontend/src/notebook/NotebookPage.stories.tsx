import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider } from "react-redux";
import { useState } from "react";
import { makeStore } from "../app/store";
import { createNotebookFixture, createNotebookApiHandlers } from "../storybook/notebookApiHandlers";
import { createStaticHintsSocket } from "../storybook/createStaticHintsSocket";
import { NotebookPageContainer } from "./NotebookPage";

function NotebookPageStory({ connected = true }: { connected?: boolean }) {
  const [store] = useState(() => makeStore());

  return (
    <Provider store={store}>
      <NotebookPageContainer
        confirmAction={() => true}
        ws={createStaticHintsSocket(connected)}
      />
    </Provider>
  );
}

const meta = {
  title: "Notebook/NotebookPage",
  component: NotebookPageStory,
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
} satisfies Meta<typeof NotebookPageStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InteractiveNotebook: Story = {};

export const OfflineNotebook: Story = {
  args: {
    connected: false,
  },
};
