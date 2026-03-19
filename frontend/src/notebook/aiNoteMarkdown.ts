interface DiagnosisNoteInput {
  error: string;
  fixCode?: string;
  fixText: string;
}

interface HintDoc {
  body: string;
  section?: string;
  title: string;
}

interface HintNoteInput {
  chips?: string[];
  code?: string;
  docs?: HintDoc[];
  heading: string;
  text: string;
}

interface QuerySuggestionNoteInput {
  code: string;
  label: string;
  reason?: string;
}

function trimTrailingWhitespace(value: string): string {
  return value.trim().replace(/\n{3,}/g, "\n\n");
}

export function buildDiagnosisMarkdownNote({ error, fixCode, fixText }: DiagnosisNoteInput): string {
  const sections = [
    "## AI Suggested Fix",
    "",
    "### Error",
    error.trim(),
    "",
    "### Suggested fix",
    fixText.trim(),
  ];

  if (fixCode?.trim()) {
    sections.push("", "```cozoscript", fixCode.trim(), "```");
  }

  return trimTrailingWhitespace(sections.join("\n"));
}

export function buildHintMarkdownNote({ chips = [], code, docs = [], heading, text }: HintNoteInput): string {
  const sections = [
    `## ${heading}`,
    "",
    text.trim(),
  ];

  if (code?.trim()) {
    sections.push("", "```cozoscript", code.trim(), "```");
  }

  if (chips.length > 0) {
    sections.push("", "### Follow-up prompts");
    for (const chip of chips) {
      sections.push(`- ${chip}`);
    }
  }

  if (docs.length > 0) {
    sections.push("", "### References");
    for (const doc of docs) {
      const title = doc.section ? `${doc.title} ${doc.section}` : doc.title;
      sections.push(`- **${title}**: ${doc.body.trim()}`);
    }
  }

  return trimTrailingWhitespace(sections.join("\n"));
}

export function buildQuerySuggestionMarkdownNote({ code, label, reason }: QuerySuggestionNoteInput): string {
  const sections = [
    "## Query Suggestion",
    "",
    `**${label.trim()}**`,
  ];

  if (reason?.trim()) {
    sections.push("", reason.trim());
  }

  sections.push("", "```cozoscript", code.trim(), "```");

  return trimTrailingWhitespace(sections.join("\n"));
}
