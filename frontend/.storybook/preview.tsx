import type { Preview } from "@storybook/react-vite";
import { initialize, mswLoader } from "msw-storybook-addon";
import "../src/index.css";
import "../src/components/primitives/primitives.css";
import "../src/theme/tokens.css";
import "../src/theme/layout.css";
import "../src/theme/cards.css";
import "../src/notebook/notebook.css";

initialize({
  onUnhandledRequest: "bypass",
});

const preview: Preview = {
  decorators: [
    (Story) => (
      <div style={{ minHeight: "100vh", padding: 24, background: "var(--bg-desktop)" }}>
        <Story />
      </div>
    ),
  ],
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
    layout: "centered",
  },
};

export default preview;
