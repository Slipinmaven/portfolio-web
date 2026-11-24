import { createBlockMarkdownSpec, mergeAttributes, Node } from "@tiptap/core";

export const TEXT_ALIGNMENTS = ["left", "center", "right"] as const;
export type TextAlignmentValue = (typeof TEXT_ALIGNMENTS)[number];

export function normalizeTextAlignment(value: unknown): TextAlignmentValue {
  return value === "center" || value === "right" ? value : "left";
}

const alignmentMarkdown = createBlockMarkdownSpec({
  nodeName: "textAlignment",
  defaultAttributes: { alignment: "center" },
  allowedAttributes: ["alignment"],
  parseAttributes: (value) => {
    const match = /^\s*alignment="(left|center|right)"\s*$/.exec(value);
    return { alignment: match?.[1] ?? "center" };
  },
});

export const TextAlignment = Node.create({
  name: "textAlignment",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      alignment: {
        default: "center",
        parseHTML: (element) =>
          normalizeTextAlignment(element.getAttribute("data-text-alignment")),
        renderHTML: (attributes) => ({
          "data-text-alignment": normalizeTextAlignment(attributes.alignment),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-text-alignment]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const alignment = normalizeTextAlignment(node.attrs.alignment);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        style: `text-align: ${alignment};`,
      }),
      0,
    ];
  },

  markdownTokenName: "textAlignment",
  markdownTokenizer: alignmentMarkdown.markdownTokenizer,
  parseMarkdown: alignmentMarkdown.parseMarkdown,
  renderMarkdown: alignmentMarkdown.renderMarkdown,
});
