import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { NotebookApp } from "./NotebookApp";
import { createCurrentCozoNotebookStore, currentCozoNotebookExperienceConfig } from "./currentCozoConfig";
import {
  createCurrentJavaScriptNotebookStore,
  currentJavaScriptNotebookExperienceConfig,
} from "./currentJavaScriptConfig";
import {
  createCurrentSQLiteNotebookStore,
  currentSQLiteNotebookExperienceConfig,
} from "./currentSQLiteConfig";
import { registerCurrentCozoSemHandlers } from "./registerCurrentCozoSemHandlers";
import { registerDefaultNotebookSemHandlers } from "./semHandlers";
import {
  createJavaScriptNotebookApiHandlers,
  createNotebookFixture,
  createNotebookApiHandlers,
  createSQLiteNotebookApiHandlers,
  createSQLiteNotebookFixture,
} from "../storybook/notebookApiHandlers";
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

function EmbeddedJavaScriptNotebookHost() {
  const [store] = useState(() => createCurrentJavaScriptNotebookStore());

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", background: "#c7c7c7" }}>
      <aside style={{ borderRight: "2px solid #000", padding: 16, background: "#efefef" }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>JS Host Shell</h2>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>
          This story mounts the reusable notebook package with the JavaScript preset, without the current Cozo app wrapper.
        </p>
      </aside>
      <NotebookApp
        confirmAction={() => true}
        experienceConfig={currentJavaScriptNotebookExperienceConfig}
        registerSemHandlers={registerDefaultNotebookSemHandlers}
        shellConfig={{
          appName: "Embedded JavaScript Notebook",
          menuItems: ["Host", "Notebook", "Runtime"],
        }}
        store={store}
        ws={createStaticHintsSocket(true)}
      />
    </div>
  );
}

function EmbeddedSQLiteNotebookHost() {
  const [store] = useState(() => createCurrentSQLiteNotebookStore());

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "220px minmax(0, 1fr)", background: "#c7c7c7" }}>
      <aside style={{ borderRight: "2px solid #000", padding: 16, background: "#efefef" }}>
        <h2 style={{ marginBottom: 12, fontSize: 18 }}>SQLite Host Shell</h2>
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>
          This story mounts the reusable notebook package with the SQLite preset inside another host shell.
        </p>
      </aside>
      <NotebookApp
        confirmAction={() => true}
        experienceConfig={currentSQLiteNotebookExperienceConfig}
        registerSemHandlers={registerDefaultNotebookSemHandlers}
        shellConfig={{
          appName: "Embedded SQLite Notebook",
          menuItems: ["Host", "Notebook", "Schema"],
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

export const EmbeddedJavaScript: Story = {
  render: () => <EmbeddedJavaScriptNotebookHost />,
  parameters: {
    msw: {
      handlers: {
        notebook: createJavaScriptNotebookApiHandlers(),
      },
    },
  },
};

export const EmbeddedSQLite: Story = {
  render: () => <EmbeddedSQLiteNotebookHost />,
  parameters: {
    msw: {
      handlers: {
        notebook: createSQLiteNotebookApiHandlers({
          document: createSQLiteNotebookFixture(),
        }),
      },
    },
  },
};
