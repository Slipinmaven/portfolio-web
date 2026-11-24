import hljs from "highlight.js/lib/common";

import { mediaAssetUrl } from "@/features/media/api/media-api";
import { MarkdownContentClient } from "./markdown-content-client";

const mediaUrlPattern =
  /((?:src|href)=)(["'])\/api\/v1\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(content|poster)\2/gi;

const codeBlockPattern =
  /<pre\b([^>]*)>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi;

const literalCodeFencePattern =
  /<p>\s*```(?:([a-z0-9_+#.-]+))?\s*<\/p>\s*(?:<h1\b[^>]*>([\s\S]*?)<\/h1>\s*)?<p>([\s\S]*?)<\/p>\s*<p>\s*```<\/p>/gi;

const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

function decodeCodeEntities(value: string): string {
  return value.replace(
    /&(#x[\da-f]+|#\d+|[a-z][a-z0-9]+);/gi,
    (entity, name: string) => {
      if (name.startsWith("#x")) {
        const codePoint = Number.parseInt(name.slice(2), 16);
        return codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      if (name.startsWith("#")) {
        const codePoint = Number.parseInt(name.slice(1), 10);
        return codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : entity;
      }
      return namedEntities[name.toLowerCase()] ?? entity;
    },
  );
}

function getCodeLanguage(attributes: string): string | null {
  const className = attributes.match(/\bclass=(["'])(.*?)\1/i)?.[2];
  return (
    className?.match(/\blanguage-([a-z0-9_+#.-]+)/i)?.[1].toLowerCase() ?? null
  );
}

function highlightCodeBlock(
  _block: string,
  preAttributes: string,
  codeAttributes: string,
  encodedCode: string,
): string {
  const code = decodeCodeEntities(encodedCode);
  const language = getCodeLanguage(`${preAttributes} ${codeAttributes}`);
  const highlightedCode =
    language && hljs.getLanguage(language)
      ? hljs.highlight(code, { language }).value
      : hljs.highlightAuto(code).value;
  const languageClass = language ? ` language-${language}` : "";
  const languageLabel = language ? language.toUpperCase() : "CODE";
  const alignment = preAttributes.match(
    /\btext-align\s*:\s*(left|right|center|justify)\s*;?/i,
  )?.[1];
  const alignmentStyle = alignment
    ? ` style="text-align: ${alignment.toLowerCase()}"`
    : "";

  return `<div class="markdown-code-block"${alignmentStyle}><div class="markdown-code-toolbar"><span class="markdown-code-language">${languageLabel}</span><button aria-label="Copy code" class="markdown-code-copy" data-markdown-code-copy title="Copy code" type="button"><svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><rect height="13" rx="2" stroke="currentColor" stroke-width="1.7" width="11" x="9" y="8"/><path d="M15 5H6a2 2 0 0 0-2 2v10" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/></svg><span aria-live="polite" data-markdown-code-copy-label>Copy</span></button></div><pre><code class="hljs${languageClass}">${highlightedCode}</code></pre></div>`;
}

export function MarkdownContent({
  html,
}: {
  html: string;
}) {
  const normalizedHtml = html.replace(
    literalCodeFencePattern,
    (_match, language: string | undefined, heading: string | undefined, code: string) => {
      const languageName = language?.toLowerCase() || "code";
      const headingMarkup = heading
        ? `<h2>${heading}</h2>`
        : "";
      const plainCode = decodeCodeEntities(code)
        .replace(/<[^>]+>/g, "")
        .trim();
      const highlightedCode =
        hljs.getLanguage(languageName)
          ? hljs.highlight(plainCode, { language: languageName }).value
          : plainCode
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
      return `${headingMarkup}<pre><code class="language-${languageName}">${highlightedCode}</code></pre>`;
    },
  ).replace(
    /<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi,
    (_match, attributes: string, content: string) =>
      `<h2${attributes}>${content}</h2>`,
  );
  const resolvedHtml = normalizedHtml.replace(
    mediaUrlPattern,
    (_match, attribute: string, quote: string, mediaId: string, resource: string) =>
      `${attribute}${quote}${mediaAssetUrl(
        `/api/v1/media/${mediaId}/${resource}`,
      )}${quote}`,
  );
  const enhancedHtml = resolvedHtml.replace(
    codeBlockPattern,
    highlightCodeBlock,
  );

  return (
    <MarkdownContentClient html={enhancedHtml} />
  );
}
