import { Buffer } from "buffer";
import { Fragment, jsx } from "react/jsx-runtime";
import { pdf, Font, Text, View } from "@react-pdf/renderer";
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
  type StyledText,
} from "@blocknote/core";
import { Packer } from "docx";
import { DOCXExporter, docxDefaultSchemaMappings } from "@blocknote/xl-docx-exporter";
import { PDFExporter, pdfDefaultSchemaMappings } from "@blocknote/xl-pdf-exporter";
import malgunRegular from "@/assets/fonts/malgun.ttf";
import malgunBold from "@/assets/fonts/malgunbd.ttf";

const schema = BlockNoteSchema.create({
  blockSpecs: defaultBlockSpecs,
  inlineContentSpecs: defaultInlineContentSpecs,
  styleSpecs: defaultStyleSpecs,
});

const PIXELS_PER_POINT = 0.75;
const FONT_SIZE = 16;

const customPdfMappings: typeof pdfDefaultSchemaMappings = {
  ...pdfDefaultSchemaMappings,
  blockMapping: {
    ...pdfDefaultSchemaMappings.blockMapping,
    codeBlock: (block: any) => {
      const textContent = Array.isArray(block.content)
        ? (block.content as StyledText<any>[])
            .map((item) => (typeof item?.text === "string" ? item.text : ""))
            .join("")
        : "";

      const lines = textContent.split("\n").map((line, index) => {
        const indent = line.match(/^\s*/)?.[0].length || 0;
        return jsx(
          Text,
          {
            style: {
              marginLeft: indent * 9.5 * PIXELS_PER_POINT,
              fontFamily: "Malgun Gothic",
            },
            children: line.trimStart() || jsx(Fragment, { children: "\u00A0" }),
          },
          `line_${index}${block.id ?? ""}`,
        );
      });

      return jsx(
        View,
        {
          wrap: false,
          style: {
            padding: 24 * PIXELS_PER_POINT,
            border: "1px solid #000000",
            lineHeight: 1.25,
            fontSize: FONT_SIZE * PIXELS_PER_POINT,
            fontFamily: "Malgun Gothic",
          },
          children: lines,
        },
        `codeBlock${block.id ?? ""}`,
      );
    },
  },
  styleMapping: {
    ...pdfDefaultSchemaMappings.styleMapping,
    code: (val: any) => {
      if (!val) return {};
      return {
        fontFamily: "Malgun Gothic",
      };
    },
  },
};

const pdfExporter = new PDFExporter(schema, customPdfMappings);
const docxExporter = new DOCXExporter(schema, docxDefaultSchemaMappings);

pdfExporter.styles.page.fontFamily = "Malgun Gothic";

let fontsRegistered = false;
const INLINE_BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "toggleListItem",
  "quote",
  "codeBlock",
]);

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeInlineContent(content: unknown): any[] {
  if (typeof content === "string") {
    return content
      ? [{ type: "text", text: content, styles: {} }]
      : [];
  }

  if (Array.isArray(content)) {
    return content.flatMap((item) => {
      const normalized = normalizeInlineContent(item);
      return normalized.length > 0 ? normalized : [];
    });
  }

  if (!isRecord(content)) return [];

  if (content.type === "text") {
    return [
      {
        type: "text",
        text: typeof content.text === "string" ? content.text : "",
        styles: isRecord(content.styles) ? content.styles : {},
      },
    ];
  }

  if (content.type === "link") {
    const nested = normalizeInlineContent(content.content);
    return nested.length > 0
      ? [
          {
            ...content,
            content: nested,
          },
        ]
      : [];
  }

  return [
    {
      ...content,
    },
  ];
}

function normalizeBlock(block: unknown): any | null {
  if (!isRecord(block) || typeof block.type !== "string") return null;

  const next: Record<string, any> = {
    type: block.type,
    props: isRecord(block.props) ? { ...block.props } : {},
    children: Array.isArray(block.children) ? block.children.map((child) => normalizeBlock(child)).filter(Boolean) : [],
  };

  if (block.content !== undefined) {
    const normalizedContent = normalizeInlineContent(block.content);
    next.content = normalizedContent;
  } else if (INLINE_BLOCK_TYPES.has(next.type)) {
    next.content = [];
  }

  if (next.type === "heading" && typeof next.props.level !== "number") {
    next.props.level = 1;
  }

  return next;
}

function normalizeBlocks(blocks: any[]) {
  return blocks.map((block) => normalizeBlock(block)).filter(Boolean);
}

function prependTitleBlock(blocks: any[], title: string) {
  const trimmedTitle = title.trim();
  const normalizedBlocks = normalizeBlocks(blocks);

  if (!trimmedTitle) {
    return normalizedBlocks;
  }

  return [
    {
      type: "heading",
      props: {
        level: 1,
      },
      content: [
        {
          type: "text",
          text: trimmedTitle,
          styles: {},
        },
      ],
      children: [],
    },
    {
      type: "paragraph",
      props: {},
      content: [],
      children: [],
    },
    {
      type: "divider",
      props: {},
      children: [],
    },
    ...normalizedBlocks,
  ];
}

function registerFonts() {
  if (fontsRegistered) return;

  Font.register({
    family: "Malgun Gothic",
    fonts: [
      { src: malgunRegular, fontWeight: 400 },
      { src: malgunBold, fontWeight: 700 },
    ],
  });

  Font.register({
    family: "GeistMono",
    fonts: [
      { src: malgunRegular, fontWeight: 400 },
      { src: malgunBold, fontWeight: 700 },
    ],
  });

  fontsRegistered = true;
}

function sanitizeFileName(name: string) {
  return name.trim().replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").slice(0, 120) || "document";
}

export async function exportDocumentPdf(blocks: any[], title: string) {
  registerFonts();
  const documentNode = await pdfExporter.toReactPDFDocument(prependTitleBlock(blocks, title));
  const blob = await pdf(documentNode).toBlob();
  return {
    blob,
    fileName: `${sanitizeFileName(title)}.pdf`,
  };
}

export async function exportDocumentDocx(blocks: any[], title: string) {
  if (!globalThis.Buffer) {
    globalThis.Buffer = Buffer;
  }

  const documentNode = await docxExporter.toDocxJsDocument(prependTitleBlock(blocks, title), {
    locale: "ko-KR",
    sectionOptions: {},
    documentOptions: {},
  });
  const blob = await Packer.toBlob(documentNode);
  return {
    blob,
    fileName: `${sanitizeFileName(title)}.docx`,
  };
}
