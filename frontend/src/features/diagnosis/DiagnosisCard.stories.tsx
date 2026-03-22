import type { Meta, StoryObj } from "@storybook/react-vite";
import { DiagnosisCard } from "./DiagnosisCard";

const meta = {
  title: "Features/Diagnosis/DiagnosisCard",
  component: DiagnosisCard,
  args: {
    diagnosing: false,
    error: "Evaluation failed: variable age is not bound in this clause.",
    fix: null,
  },
  parameters: {
    layout: "padded",
  },
  render: (args) => (
    <div style={{ width: 640 }}>
      <DiagnosisCard {...args} />
    </div>
  ),
} satisfies Meta<typeof DiagnosisCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const AwaitingDiagnosis: Story = {
  args: {
    onDiagnose: () => {},
  },
};

export const WithSuggestedFix: Story = {
  args: {
    fix: {
      text: "Bind age in the relation scan before using it in the filter.",
      code: "?[name, age] := *users{name, age}, age > 30",
    },
    onAddToNotebook: () => {},
    onApplyFix: () => {},
  },
};

export const SuggestionWithoutCode: Story = {
  args: {
    fix: {
      text: "This relation may not exist yet. Confirm the schema or create the relation first.",
    },
  },
};
