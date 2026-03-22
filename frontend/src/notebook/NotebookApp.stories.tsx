import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { NotebookApp } from "./NotebookApp";
import { createCurrentCozoNotebookStore, currentCozoNotebookExperienceConfig } from "./currentCozoConfig";
import { registerCurrentCozoSemHandlers } from "./registerCurrentCozoSemHandlers";
import { createNotebookFixture, createNotebookApiHandlers } from "../storybook/notebookApiHandlers";
import { createStaticHintsSocket } from "../storybook/createStaticHintsSocket";

function EmbeddedNotebookHost() {
  const [store] = useState(() => createCurrentCozoNotebookStore());

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", background: "#c7c7c7" }}>
      <aside style={{ borderRight: "2px solid #000", padding: 16, background: "#efefef" }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>Host Shell</h2>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>
          This story mounts the reusable notebook package inside another app shell rather than using the current app entrypoint.
        </p>
      </aside>
      <NotebookApp
        confirmAction={() => true}
        experienceConfig={currentCozoNotebookExperienceConfig}
        registerSemHandlers={registerCurrentCozoSemHandlers}
        shellConfig={{
          appName: "Embedded Notebook",
          menuItems: ["Host", "Notebook", "Help"],
        }}
        store={store}
        ws={createStaticHintsSocket(true)}
      />
    </div>
  );
}

const meta = {
  title: "Notebook/NotebookApp",
  component: EmbeddedNotebookHost,
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
} satisfies Meta<typeof EmbeddedNotebookHost>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Embedded: Story = {};
