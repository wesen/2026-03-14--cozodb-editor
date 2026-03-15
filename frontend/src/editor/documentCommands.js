export function updateLine(lines, lineIdx, value) {
  const nextLines = [...lines];
  nextLines[lineIdx] = value;
  return nextLines;
}

export function insertLinesAfter(lines, lineIdx, insertedLines) {
  const nextLines = [...lines];
  nextLines.splice(lineIdx + 1, 0, ...insertedLines);
  return nextLines;
}
