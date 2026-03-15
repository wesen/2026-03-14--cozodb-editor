/**
 * Lightweight markdown-to-HTML renderer for notebook markdown cells.
 * Supports: headers, bold, italic, inline code, code blocks, lists, links, paragraphs.
 * No external dependencies.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<code class="mac-md-code">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function renderMarkdown(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inList = false;

  for (const line of lines) {
    // Code block fences
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        out.push(`<pre class="mac-md-pre"><code>${escapeHtml(codeBlockLines.join("\n"))}</code></pre>`);
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      if (inList) { out.push("</ul>"); inList = false; }
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headerMatch) {
      if (inList) { out.push("</ul>"); inList = false; }
      const level = headerMatch[1]!.length;
      out.push(`<h${level} class="mac-md-h">${renderInline(headerMatch[2]!)}</h${level}>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[\s]*[-*]\s+(.*)/);
    if (ulMatch) {
      if (!inList) { out.push('<ul class="mac-md-ul">'); inList = true; }
      out.push(`<li>${renderInline(ulMatch[1]!)}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^[\s]*\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inList) { out.push('<ul class="mac-md-ul">'); inList = true; }
      out.push(`<li>${renderInline(olMatch[1]!)}</li>`);
      continue;
    }

    // Paragraph
    if (inList) { out.push("</ul>"); inList = false; }
    out.push(`<p class="mac-md-p">${renderInline(line)}</p>`);
  }

  if (inCodeBlock) {
    out.push(`<pre class="mac-md-pre"><code>${escapeHtml(codeBlockLines.join("\n"))}</code></pre>`);
  }
  if (inList) { out.push("</ul>"); }

  return out.join("\n");
}
