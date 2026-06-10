function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeInlineContent(content: unknown): any {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.flatMap((item) => {
      const normalized = normalizeInlineContent(item);
      return normalized === null || normalized === undefined ? [] : [normalized];
    });
  }

  if (!isRecord(content)) return null;

  if (content.type === "text") {
    return {
      type: "text",
      text: typeof content.text === "string" ? content.text : "",
      styles: isRecord(content.styles) ? content.styles : {},
    };
  }

  if (content.type === "link") {
    const nested = normalizeInlineContent(content.content);
    return nested
      ? {
          ...content,
          content: nested,
        }
      : null;
  }

  if (content.type === "tableContent") {
    const rows = Array.isArray(content.rows)
      ? content.rows
          .map((row) => {
            if (!isRecord(row) || !Array.isArray(row.cells)) return null;
            return {
              ...row,
              cells: row.cells
                .map((cell) => normalizeInlineContent(cell))
                .filter((cell) => cell !== null && cell !== undefined),
            };
          })
          .filter((row) => row !== null && row !== undefined)
      : [];

    return {
      type: "tableContent",
      columnWidths: Array.isArray(content.columnWidths) ? content.columnWidths : [],
      rows,
    };
  }

  if (typeof content.type === "string") {
    const next: Record<string, any> = { ...content };
    if (!isRecord(next.props)) next.props = {};
    if (next.content !== undefined) {
      const normalizedContent = normalizeInlineContent(next.content);
      if (normalizedContent !== null) {
        next.content = normalizedContent;
      } else {
        delete next.content;
      }
    }
    if (Array.isArray(next.children)) {
      next.children = next.children
        .map((child: unknown) => normalizeBlock(child, ""))
        .filter((child: unknown) => child !== null && child !== undefined);
    }
    return next;
  }

  return null;
}

export function normalizeBlock(block: unknown, fallbackText: string): any | null {
  if (!isRecord(block) || typeof block.type !== "string") return null;

  const next: Record<string, any> = {
    type: block.type,
    props: isRecord(block.props) ? { ...block.props } : {},
  };

  if (block.content !== undefined) {
    const normalizedContent = normalizeInlineContent(block.content);
    if (normalizedContent !== null) {
      next.content = normalizedContent;
    }
  }

  if (Array.isArray(block.children)) {
    next.children = block.children
      .map((child) => normalizeBlock(child, fallbackText))
      .filter((child) => child !== null && child !== undefined);
  }

  if (
    (next.type === "paragraph" ||
      next.type === "heading" ||
      next.type === "bulletListItem" ||
      next.type === "numberedListItem" ||
      next.type === "checkListItem" ||
      next.type === "toggleListItem" ||
      next.type === "quote" ||
      next.type === "codeBlock") &&
    next.content === undefined
  ) {
    next.content = fallbackText || "";
  }

  if (next.type === "heading") {
    if (!isRecord(next.props)) next.props = {};
    if (typeof next.props.level !== "number") next.props.level = 1;
  }

  return next;
}

export function toBlockNoteBlocks(content: unknown, fallbackText = "") {
  if (!Array.isArray(content) || content.length === 0) {
    return [{ type: "paragraph", content: fallbackText || "" }] as any[];
  }

  const normalized = content
    .map((block) => normalizeBlock(block, fallbackText))
    .filter(Boolean);

  if (normalized.length > 0) return normalized as any[];

  return [{ type: "paragraph", content: fallbackText || "" }] as any[];
}
