"use client";

/* eslint-disable @next/next/no-img-element -- Authenticated admin previews use local object URLs. */

import { mergeAttributes } from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { Image } from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";
import {
  forgetPendingMediaUpload,
  listAllManagedMedia,
  mediaAssetUrl,
  type MediaItem,
  type MediaKind,
} from "@/features/media/api/media-api";
import { MediaUploadForm } from "@/features/media/components/media-upload-form";
import type { PostAttachment } from "@/features/posts/api/post-types";
import {
  normalizeTextAlignment,
  TextAlignment,
  TEXT_ALIGNMENTS,
  type TextAlignmentValue,
} from "@/features/posts/components/text-alignment-extension";
import {
  INLINE_VIDEO_MARKDOWN_TITLE,
  MediaVideo,
} from "@/features/posts/components/inline-video-extension";

const MEDIA_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMAGE_LAYOUT_TITLE_PATTERN =
  /^media-layout:width=(\d{1,3});align=(left|center|right)$/;
const MIN_IMAGE_WIDTH = 20;
const EDITOR_STARTER_KIT = StarterKit.configure({ codeBlock: false });
const LOWLIGHT = createLowlight(common);
const CODE_BLOCK = CodeBlockLowlight.configure({ lowlight: LOWLIGHT });

type ImageAlignment = "left" | "center" | "right";

type ImageLayout = {
  width: number;
  alignment: ImageAlignment;
};

function normalizeImageWidth(value: unknown): number {
  const width =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(width)) return 100;
  return Math.min(100, Math.max(MIN_IMAGE_WIDTH, Math.round(width)));
}

function normalizeImageAlignment(value: unknown): ImageAlignment {
  return value === "left" || value === "right" ? value : "center";
}

function parseImageLayoutTitle(value: unknown): ImageLayout | null {
  if (typeof value !== "string") return null;
  const match = IMAGE_LAYOUT_TITLE_PATTERN.exec(value);
  if (!match) return null;
  const width = Number(match[1]);
  if (width < MIN_IMAGE_WIDTH || width > 100) return null;
  return {
    width,
    alignment: normalizeImageAlignment(match[2]),
  };
}

function imageLayoutTitle({ width, alignment }: ImageLayout): string {
  return `media-layout:width=${width};align=${alignment}`;
}

function imageLayoutStyle(width: number, alignment: ImageAlignment): string {
  const margins: Record<ImageAlignment, [string, string]> = {
    left: ["0", "auto"],
    center: ["auto", "auto"],
    right: ["auto", "0"],
  };
  const [marginLeft, marginRight] = margins[alignment];
  return `width: ${width}%; display: block; margin-left: ${marginLeft}; margin-right: ${marginRight}; height: auto;`;
}

function imageWidthFromPointer(
  event: ReactPointerEvent<HTMLButtonElement>,
  start: { clientX: number; width: number; containerWidth: number },
): number {
  const delta = ((event.clientX - start.clientX) / start.containerWidth) * 100;
  return Math.min(100, Math.max(MIN_IMAGE_WIDTH, start.width + delta));
}

function AuthenticatedMediaPreview({
  mediaId,
  alt,
  className,
}: {
  mediaId: string;
  alt: string;
  className: string;
}) {
  const preview = useAdminMediaAsset(mediaId, "content");
  if (preview.status === "ready") {
    // The blob URL comes from an authenticated request; a plain img avoids sending it through Next's image optimizer.
    return <img alt={alt} className={className} src={preview.url} />;
  }
  if (preview.status === "error") {
    return (
      <span
        aria-label={alt || "Image preview unavailable"}
        className={`${className} flex items-center justify-center bg-soft-surface text-xs text-muted`}
        role="img"
      >
        Preview unavailable
      </span>
    );
  }
  return (
    <span
      aria-label="Loading image preview"
      className={`${className} animate-pulse bg-soft-surface`}
      role="img"
    />
  );
}

function MediaImageNodeView({
  editor,
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const rawMediaId: unknown = node.attrs.mediaId;
  const mediaId =
    typeof rawMediaId === "string" && MEDIA_ID_PATTERN.test(rawMediaId)
      ? rawMediaId
      : null;
  const alt = typeof node.attrs.alt === "string" ? node.attrs.alt : "";
  const source = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const width = normalizeImageWidth(node.attrs.mediaWidth);
  const alignment = normalizeImageAlignment(node.attrs.mediaAlignment);
  const alignmentClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[alignment];
  const [previewWidth, setPreviewWidth] = useState<number | null>(null);
  const resizeStart = useRef<{
    pointerId: number;
    clientX: number;
    width: number;
    containerWidth: number;
  } | null>(null);
  const currentWidth = previewWidth ?? width;

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const containerWidth = editor.view.dom.getBoundingClientRect().width;
    if (containerWidth <= 0) return;
    resizeStart.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      width,
      containerWidth,
    };
    setPreviewWidth(width);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updateResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = resizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    setPreviewWidth(imageWidthFromPointer(event, start));
  }

  function finishResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = resizeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    updateAttributes({
      mediaWidth: normalizeImageWidth(imageWidthFromPointer(event, start)),
    });
    resizeStart.current = null;
    setPreviewWidth(null);
  }

  function cancelResize() {
    resizeStart.current = null;
    setPreviewWidth(null);
  }

  return (
    <NodeViewWrapper as="figure" className="my-6 w-full">
      <div className={alignmentClass}>
        <div
          className="relative inline-block max-w-full align-top"
          style={{ width: `${currentWidth}%` }}
        >
          {mediaId ? (
            <AuthenticatedMediaPreview
              alt={alt}
              className="block h-auto w-full rounded-xl"
              mediaId={mediaId}
            />
          ) : (
            <img
              alt={alt}
              className="block h-auto w-full rounded-xl"
              src={source}
            />
          )}
          {selected && (
            <button
              aria-label="Drag to resize image"
              className="absolute -bottom-3 -right-3 grid size-8 touch-none cursor-ew-resize place-items-center rounded-full border border-border bg-surface text-foreground shadow-md"
              title="Drag to resize"
              type="button"
              onPointerCancel={cancelResize}
              onPointerDown={startResize}
              onPointerMove={updateResize}
              onPointerUp={finishResize}
            >
              <svg
                aria-hidden="true"
                className="size-4"
                fill="none"
                viewBox="0 0 16 16"
              >
                <path
                  d="M3 8h10M3 8l2-2M3 8l2 2m8-2-2-2m2 2-2 2"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
      {selected && (
        <div className="mx-auto mt-3 flex w-fit flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm">
          <div
            aria-label="Image alignment"
            className="flex items-center gap-1"
            role="group"
          >
            {(["left", "center", "right"] as const).map((value) => (
              <button
                key={value}
                aria-label={`Align image ${value}`}
                aria-pressed={alignment === value}
                className={`${toolbarButtonClass(alignment === value)} min-h-9 px-2.5 text-xs capitalize`}
                type="button"
                onClick={() => updateAttributes({ mediaAlignment: value })}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="flex min-w-36 items-center gap-2 text-xs text-muted">
            Width
            <input
              aria-label="Image width"
              className="w-24 accent-[var(--focus-ring)]"
              max={100}
              min={MIN_IMAGE_WIDTH}
              type="range"
              value={currentWidth}
              onChange={(event) => {
                const nextWidth = normalizeImageWidth(
                  Number(event.currentTarget.value),
                );
                updateAttributes({ mediaWidth: nextWidth });
              }}
            />
            <output className="w-10 text-right text-foreground">
              {currentWidth}%
            </output>
          </label>
        </div>
      )}
    </NodeViewWrapper>
  );
}

const createMediaImageExtension = (allowInlineVideo: boolean) =>
  Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-media-id"),
        renderHTML: (attributes) =>
          attributes.mediaId ? { "data-media-id": attributes.mediaId } : {},
      },
      mediaWidth: {
        default: 100,
        parseHTML: (element) =>
          normalizeImageWidth(element.getAttribute("data-media-width")),
        renderHTML: (attributes) => ({
          "data-media-width": String(normalizeImageWidth(attributes.mediaWidth)),
        }),
      },
      mediaAlignment: {
        default: "center",
        parseHTML: (element) =>
          normalizeImageAlignment(
            element.getAttribute("data-media-alignment"),
          ),
        renderHTML: (attributes) => ({
          "data-media-alignment": normalizeImageAlignment(
            attributes.mediaAlignment,
          ),
        }),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const mediaId = HTMLAttributes["data-media-id"];
    const width = normalizeImageWidth(HTMLAttributes["data-media-width"]);
    const alignment = normalizeImageAlignment(
      HTMLAttributes["data-media-alignment"],
    );
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        src:
          typeof mediaId === "string" && MEDIA_ID_PATTERN.test(mediaId)
            ? mediaAssetUrl(`/api/v1/media/admin/${mediaId}/content`)
            : HTMLAttributes.src,
        style: imageLayoutStyle(width, alignment),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaImageNodeView);
  },

  parseMarkdown: (token, helpers) => {
    const mediaId =
      typeof token.href === "string" &&
      token.href.startsWith("media:") &&
      MEDIA_ID_PATTERN.test(token.href.slice("media:".length))
        ? token.href.slice("media:".length)
        : null;
    if (
      allowInlineVideo &&
      token.title === INLINE_VIDEO_MARKDOWN_TITLE &&
      mediaId
    ) {
      return helpers.createNode("mediaVideo", {
        mediaId,
        title: token.text,
      });
    }
    const layout = parseImageLayoutTitle(token.title);
    return helpers.createNode("image", {
      src: token.href,
      title: layout ? null : token.title,
      alt: token.text,
      mediaId,
      mediaWidth: layout?.width ?? 100,
      mediaAlignment: layout?.alignment ?? "center",
    });
  },

  renderMarkdown: (node) => {
    const alt = String(node.attrs?.alt ?? "")
      .replaceAll("\\", "\\\\")
      .replaceAll("]", "\\]");
    const mediaId = node.attrs?.mediaId;
    const source =
      typeof mediaId === "string" && MEDIA_ID_PATTERN.test(mediaId)
        ? `media:${mediaId}`
        : String(node.attrs?.src ?? "");
    const width = normalizeImageWidth(node.attrs?.mediaWidth);
    const alignment = normalizeImageAlignment(node.attrs?.mediaAlignment);
    const title =
      width !== 100 || alignment !== "center"
        ? imageLayoutTitle({ width, alignment })
        : String(node.attrs?.title ?? "");
    const titleSuffix = title
      ? ` "${title.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`
      : "";
    return `![${alt}](${source}${titleSuffix})`;
  },
  }).configure({
    inline: false,
    allowBase64: false,
    HTMLAttributes: {
      class: "my-6 h-auto max-w-full rounded-xl",
    },
  });

const POST_EDITOR_EXTENSIONS = [
  EDITOR_STARTER_KIT,
  CODE_BLOCK,
  TextAlignment,
  createMediaImageExtension(false),
  Markdown,
];

const PROJECT_EDITOR_EXTENSIONS = [
  EDITOR_STARTER_KIT,
  CODE_BLOCK,
  TextAlignment,
  MediaVideo,
  createMediaImageExtension(true),
  Markdown,
];

const CODE_LANGUAGES = [
  { value: "bash", label: "Bash" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "typescript", label: "TypeScript" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
];

type PickerMode = "image" | "video" | "download" | "attachment";

function attachmentFromMedia(media: MediaItem): PostAttachment {
  return {
    media_id: media.id,
    title: media.title,
    original_filename: media.original_filename,
    mime_type: media.mime_type,
    size_bytes: media.size_bytes,
    file_url: media.file_url,
  };
}

function toolbarButtonClass(isActive = false): string {
  return `inline-flex min-h-9 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-40 ${
    isActive
      ? "border-accent/40 bg-accent/10 text-foreground"
      : "border-transparent text-muted hover:border-border hover:bg-surface hover:text-foreground"
  }`;
}

export function PostRichTextEditor({
  body,
  attachments: providedAttachments = [],
  inlineMediaKinds = ["IMAGE"],
  onBodyChange,
  onAttachmentsChange,
  showAttachments = true,
  editorLabel = "Post content",
  placeholderText = "Start writing your post. Add a heading, paste text, or use the toolbar to format your content.",
}: {
  body: string;
  attachments?: PostAttachment[];
  inlineMediaKinds?: readonly MediaKind[];
  onBodyChange: (body: string) => void;
  onAttachmentsChange?: (attachments: PostAttachment[]) => void;
  showAttachments?: boolean;
  editorLabel?: string;
  placeholderText?: string;
}) {
  const attachments = providedAttachments;
  const extensions = inlineMediaKinds.includes("VIDEO")
    ? PROJECT_EDITOR_EXTENSIONS
    : POST_EDITOR_EXTENSIONS;
  const onBodyChangeRef = useRef(onBodyChange);
  const mediaPickerTitleId = useId();
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    onBodyChangeRef.current = onBodyChange;
  }, [onBodyChange]);

  const editor = useEditor({
    extensions,
    content: body,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "markdown-content prose-editor text-base leading-7 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]",
        "aria-label": editorLabel,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onBodyChangeRef.current(currentEditor.getMarkdown());
    },
  });
  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isBold: currentEditor?.isActive("bold") ?? false,
      isItalic: currentEditor?.isActive("italic") ?? false,
      isStrike: currentEditor?.isActive("strike") ?? false,
      isCode: currentEditor?.isActive("code") ?? false,
      isHeading2: currentEditor?.isActive("heading", { level: 2 }) ?? false,
      isHeading3: currentEditor?.isActive("heading", { level: 3 }) ?? false,
      isBulletList: currentEditor?.isActive("bulletList") ?? false,
      isOrderedList: currentEditor?.isActive("orderedList") ?? false,
      isBlockquote: currentEditor?.isActive("blockquote") ?? false,
      isCodeBlock: currentEditor?.isActive("codeBlock") ?? false,
      codeBlockLanguage: currentEditor?.isActive("codeBlock")
        ? String(currentEditor.getAttributes("codeBlock").language ?? "")
        : "",
      isLink: currentEditor?.isActive("link") ?? false,
      alignment: currentEditor?.isActive("textAlignment")
        ? normalizeTextAlignment(
            currentEditor.getAttributes("textAlignment").alignment,
          )
        : "left",
    }),
  });
  const active = editorState ?? {
    isBold: false,
    isItalic: false,
    isStrike: false,
    isCode: false,
    isHeading2: false,
    isHeading3: false,
    isBulletList: false,
    isOrderedList: false,
    isBlockquote: false,
    isCodeBlock: false,
    codeBlockLanguage: "",
    isLink: false,
    alignment: "left" as TextAlignmentValue,
  };

  useEffect(() => {
    if (editor && editor.getMarkdown() !== body) {
      editor.commands.setContent(body, { contentType: "markdown" });
    }
  }, [body, editor]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (pickerMode && !dialog.open) dialog.showModal();
    if (!pickerMode && dialog.open) dialog.close();
  }, [pickerMode]);

  useEffect(() => {
    if (!pickerMode) return;
    let active = true;
    void listAllManagedMedia()
      .then((items) => {
        if (active) setMedia(items);
      })
      .catch((error: unknown) => {
        if (active) {
          setMediaError(
            error instanceof Error
              ? error.message
              : "Unable to load media from the library.",
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingMedia(false);
      });
    return () => {
      active = false;
    };
  }, [pickerMode]);

  const allowedKind: MediaKind =
    pickerMode === "image"
      ? "IMAGE"
      : pickerMode === "video"
        ? "VIDEO"
        : "DOCUMENT";
  const visibleMedia = media.filter((item) => {
    const query = search.trim().toLowerCase();
    return (
      item.kind === allowedKind &&
      (!query ||
        item.original_filename.toLowerCase().includes(query) ||
        (item.title ?? "").toLowerCase().includes(query))
    );
  });

  function closePicker() {
    setPickerMode(null);
    setUploadOpen(false);
    setSelectedMedia(null);
    setSelectedLabel("");
    setSelectionError(null);
    setSearch("");
  }

  function openPicker(mode: PickerMode) {
    setMediaError(null);
    setIsLoadingMedia(true);
    setPickerMode(mode);
  }

  function insertSelectedMedia() {
    if (!editor || !selectedMedia || !pickerMode || pickerMode === "attachment") {
      return;
    }
    if (!selectedLabel.trim()) {
      setSelectionError(
        pickerMode === "image"
          ? "Add alternative text for this image."
          : "Add descriptive text for this media.",
      );
      return;
    }
    const label = selectedLabel.trim();
    const chain = editor.chain().focus();
    if (pickerMode === "image") {
      chain
        .insertContent({
          type: "image",
          attrs: {
            src: `media:${selectedMedia.id}`,
            mediaId: selectedMedia.id,
            alt: label,
            mediaWidth: 100,
            mediaAlignment: "center",
          },
        })
        .run();
    } else if (pickerMode === "video") {
      chain
        .insertContent({
          type: "mediaVideo",
          attrs: { mediaId: selectedMedia.id, title: label },
        })
        .run();
    } else {
      chain
        .insertContent({
          type: "text",
          text: label,
          marks: [
            {
              type: "link",
              attrs: { href: `media:${selectedMedia.id}` },
            },
          ],
        })
        .run();
    }
    closePicker();
  }

  function toggleAttachment(item: MediaItem) {
    if (!onAttachmentsChange) return;
    const selected = attachments.some(
      (attachment) => attachment.media_id === item.id,
    );
    onAttachmentsChange(
      selected
        ? attachments.filter((attachment) => attachment.media_id !== item.id)
        : [...attachments, attachmentFromMedia(item)],
    );
  }

  function handleUploaded(item: MediaItem, uploadId: string) {
    forgetPendingMediaUpload(uploadId);
    setMedia((current) => [
      item,
      ...current.filter((existing) => existing.id !== item.id),
    ]);
    setUploadOpen(false);
    if (pickerMode === "attachment" && item.kind === "DOCUMENT") {
      if (!onAttachmentsChange) return;
      onAttachmentsChange([
        ...attachments.filter(
          (attachment) => attachment.media_id !== item.id,
        ),
        attachmentFromMedia(item),
      ]);
    } else if (
      (pickerMode === "image" && item.kind === "IMAGE") ||
      (pickerMode === "video" && item.kind === "VIDEO") ||
      (pickerMode === "download" && item.kind === "DOCUMENT")
    ) {
      setSelectedMedia(item);
      setSelectedLabel(
        pickerMode === "image"
          ? item.alt_text ?? ""
          : item.title ?? item.original_filename,
      );
      setSelectionError(null);
    } else {
      setMediaError(
        "The uploaded file type does not match the selected media type.",
      );
    }
  }

  function insertLink() {
    if (!editor) return;
    setLinkError(null);
    const url = window.prompt("Enter a link URL");
    if (!url) return;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        setLinkError("Links must use http or https.");
        return;
      }
      editor.chain().focus().setLink({ href: parsed.toString() }).run();
    } catch {
      setLinkError("Enter a valid http or https URL.");
    }
  }

  function setTextAlignment(alignment: TextAlignmentValue) {
    if (!editor) return;
    if (editor.isActive("textAlignment")) {
      const chain = editor.chain().focus();
      if (alignment === "left") {
        chain.lift("textAlignment").run();
      } else {
        chain.updateAttributes("textAlignment", { alignment }).run();
      }
      return;
    }
    if (alignment !== "left") {
      editor.chain().focus().wrapIn("textAlignment", { alignment }).run();
    }
  }

  return (
    <div className="grid gap-5">
      <section
        aria-label="Writing tools"
        className="overflow-hidden rounded-2xl border border-border bg-background"
      >
        <div
          aria-label="Text formatting"
          className="flex flex-wrap items-center gap-2 border-b border-border bg-surface p-2 sm:p-3 sm:px-4"
          role="group"
        >
          <div
            aria-label="Text style"
            className="flex max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background p-1"
            role="group"
          >
            <button
              aria-label="Bold"
              aria-pressed={active.isBold}
              className={`${toolbarButtonClass(active.isBold)} font-bold`}
              disabled={!editor}
              title="Bold"
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              B
            </button>
            <button
              aria-label="Italic"
              aria-pressed={active.isItalic}
              className={`${toolbarButtonClass(active.isItalic)} italic`}
              disabled={!editor}
              title="Italic"
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              I
            </button>
            <button
              aria-label="Strikethrough"
              aria-pressed={active.isStrike}
              className={toolbarButtonClass(active.isStrike)}
              disabled={!editor}
              title="Strikethrough"
              type="button"
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              S
            </button>
            <button
              aria-label="Inline code"
              aria-pressed={active.isCode}
              className={toolbarButtonClass(active.isCode)}
              disabled={!editor}
              title="Inline code"
              type="button"
              onClick={() => editor?.chain().focus().toggleCode().run()}
            >
              {"</>"}
            </button>
          </div>

          <span aria-hidden="true" className="hidden h-7 w-px bg-border sm:block" />

          <div
            aria-label="Text alignment"
            className="flex max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background p-1"
            role="group"
          >
            {TEXT_ALIGNMENTS.map((alignment) => (
              <button
                key={alignment}
                aria-label={`Align text ${alignment}`}
                aria-pressed={active.alignment === alignment}
                className={`${toolbarButtonClass(active.alignment === alignment)} capitalize`}
                disabled={!editor}
                title={`Align text ${alignment}`}
                type="button"
                onClick={() => setTextAlignment(alignment)}
              >
                {alignment}
              </button>
            ))}
          </div>

          <span aria-hidden="true" className="hidden h-7 w-px bg-border sm:block" />

          <div
            aria-label="Headings"
            className="flex max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background p-1"
            role="group"
          >
            {([2, 3] as const).map((level) => (
              <button
                key={level}
                aria-label={`Heading ${level}`}
                aria-pressed={level === 2 ? active.isHeading2 : active.isHeading3}
                className={toolbarButtonClass(
                  level === 2 ? active.isHeading2 : active.isHeading3,
                )}
                disabled={!editor}
                title={`Heading ${level}`}
                type="button"
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level }).run()
                }
              >
                H{level}
              </button>
            ))}
          </div>

          <span aria-hidden="true" className="hidden h-7 w-px bg-border sm:block" />

          <div
            aria-label="Blocks"
            className="flex max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background p-1"
            role="group"
          >
            <button
              aria-label="Bulleted list"
              aria-pressed={active.isBulletList}
              className={toolbarButtonClass(active.isBulletList)}
              disabled={!editor}
              title="Bulleted list"
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              Bulleted
            </button>
            <button
              aria-label="Numbered list"
              aria-pressed={active.isOrderedList}
              className={toolbarButtonClass(active.isOrderedList)}
              disabled={!editor}
              title="Numbered list"
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              Numbered
            </button>
            <button
              aria-label="Block quote"
              aria-pressed={active.isBlockquote}
              className={toolbarButtonClass(active.isBlockquote)}
              disabled={!editor}
              title="Block quote"
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              Quote
            </button>
            <button
              aria-label="Code block"
              aria-pressed={active.isCodeBlock}
              className={toolbarButtonClass(active.isCodeBlock)}
              disabled={!editor}
              title="Code block"
              type="button"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              Code
            </button>
            {active.isCodeBlock && (
              <select
                aria-label="Code language"
                className="min-h-9 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                value={active.codeBlockLanguage}
                onChange={(event) =>
                  editor
                    ?.chain()
                    .focus()
                    .updateAttributes("codeBlock", {
                      language: event.target.value || null,
                    })
                    .run()
                }
              >
                <option value="">Plain text</option>
                {CODE_LANGUAGES.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}
              </select>
            )}
            <button
              aria-label="Horizontal divider"
              className={toolbarButtonClass()}
              disabled={!editor}
              title="Insert a divider"
              type="button"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            >
              Divider
            </button>
          </div>

          <span aria-hidden="true" className="hidden h-7 w-px bg-border sm:block" />

          <div
            aria-label="Links and media"
            className="flex max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background p-1"
            role="group"
          >
            <button
              aria-label="Add link"
              aria-pressed={active.isLink}
              className={toolbarButtonClass(active.isLink)}
              disabled={!editor}
              title="Add link"
              type="button"
              onClick={insertLink}
            >
              Link
            </button>
            <button
              aria-label="Remove link"
              className={toolbarButtonClass()}
              disabled={!active.isLink}
              title="Remove link"
              type="button"
              onClick={() => editor?.chain().focus().unsetLink().run()}
            >
              Unlink
            </button>
            {inlineMediaKinds.includes("IMAGE") && (
              <button
                className={`${toolbarButtonClass()} border-transparent bg-foreground text-background hover:bg-foreground/90 hover:text-background`}
                disabled={!editor}
                title="Insert an image from the media library"
                type="button"
                onClick={() => openPicker("image")}
              >
                + Image
              </button>
            )}
            {inlineMediaKinds.includes("VIDEO") && (
              <button
                className={toolbarButtonClass()}
                disabled={!editor}
                title="Insert a video from the media library"
                type="button"
                onClick={() => openPicker("video")}
              >
                + Video
              </button>
            )}
            {inlineMediaKinds.includes("DOCUMENT") && (
              <button
                className={toolbarButtonClass()}
                disabled={!editor}
                title="Insert a downloadable document link"
                type="button"
                onClick={() => openPicker("download")}
              >
                + File link
              </button>
            )}
          </div>

          <div className="ml-auto flex max-w-full flex-wrap items-center gap-0.5 rounded-xl border border-border bg-background p-1">
            <button
              aria-label="Undo"
              className={toolbarButtonClass()}
              disabled={!editor?.can().undo()}
              title="Undo"
              type="button"
              onClick={() => editor?.chain().focus().undo().run()}
            >
              Undo
            </button>
            <button
              aria-label="Redo"
              className={toolbarButtonClass()}
              disabled={!editor?.can().redo()}
              title="Redo"
              type="button"
              onClick={() => editor?.chain().focus().redo().run()}
            >
              Redo
            </button>
          </div>
        </div>
        <div className="relative bg-background">
          {editor?.isEmpty && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0"
            >
              <p className="editor-placeholder mx-auto max-w-[72ch] px-6 py-6 text-muted sm:px-10">
                {placeholderText}
              </p>
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </section>
      {linkError && (
        <p className="-mt-3 text-sm text-red-600" role="alert">
          {linkError}
        </p>
      )}

      {showAttachments && onAttachmentsChange && (
        <section
          aria-labelledby="post-attachments-title"
          className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
        >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-muted">
              <svg
                aria-hidden="true"
                className="size-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
                <path
                  d="M14 4v4h4M8.5 12h6M8.5 15.5h4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 id="post-attachments-title" className="text-sm font-semibold">
                  Document downloads
                </h3>
                <span className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted">
                  {attachments.length} attached
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                PDFs and ZIP files appear after the published post.
              </p>
            </div>
          </div>
          <button
            className="min-h-10 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-soft-surface"
            type="button"
            onClick={() => openPicker("attachment")}
          >
            Add document
          </button>
        </div>
        {attachments.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {attachments.map((attachment) => (
              <li
                key={attachment.media_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {attachment.title || attachment.original_filename}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {attachment.mime_type} ·{" "}
                    {Math.max(1, Math.round(attachment.size_bytes / 1024))} KB
                  </span>
                </span>
                <button
                  aria-label={`Remove ${attachment.original_filename}`}
                  className="min-h-10 shrink-0 rounded-lg border border-border px-3 text-sm font-medium text-muted transition-colors hover:bg-soft-surface hover:text-foreground"
                  type="button"
                  onClick={() =>
                    onAttachmentsChange(
                      attachments.filter(
                        (item) => item.media_id !== attachment.media_id,
                      ),
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-border bg-background px-4 py-7 text-center">
            <p className="text-sm font-medium">No downloads attached</p>
            <p className="mt-1 max-w-md text-xs leading-5 text-muted">
              Attach a PDF or ZIP if readers need a file alongside this post.
            </p>
          </div>
        )}
        </section>
      )}

      {pickerMode &&
        typeof document !== "undefined" &&
        createPortal(
          <dialog
            ref={dialogRef}
            aria-labelledby={mediaPickerTitleId}
            className="m-auto max-h-[90vh] w-[min(48rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-border bg-surface p-0 text-foreground shadow-2xl backdrop:bg-black/50"
            onCancel={closePicker}
          >
        <div className="grid gap-5 p-5 sm:p-7">
          <header className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Media library
              </p>
              <h2
                id={mediaPickerTitleId}
                className="mt-2 text-xl font-semibold"
              >
                {pickerMode === "image"
                  ? "Choose an image"
                  : pickerMode === "video"
                    ? "Choose a video"
                    : pickerMode === "download" || pickerMode === "attachment"
                      ? "Choose documents"
                      : "Choose media"}
              </h2>
            </div>
            <button
              aria-label="Close media picker"
              className="min-h-10 rounded-full border border-border px-4 text-sm"
              type="button"
              onClick={closePicker}
            >
              Close
            </button>
          </header>

          <label className="grid gap-1.5 text-sm font-medium">
            Search media
            <input
              className="min-h-11 rounded-xl border border-border bg-background px-3 font-normal"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <button
            className="min-h-11 w-fit rounded-full border border-border px-4 text-sm font-medium hover:bg-background"
            type="button"
            onClick={() => setUploadOpen((current) => !current)}
          >
            {uploadOpen ? "Choose from library" : "Upload a new file"}
          </button>

          {uploadOpen && pickerMode && (
            <MediaUploadForm
              allowedKinds={[allowedKind]}
              hasPendingUploads={false}
              onClose={() => setUploadOpen(false)}
              onUploaded={handleUploaded}
              onUploadStarted={() => undefined}
            />
          )}

          {mediaError && (
            <p className="text-sm text-red-600" role="alert">
              {mediaError}
            </p>
          )}
          {isLoadingMedia ? (
            <p className="py-8 text-center text-sm text-muted" role="status">
              Loading media…
            </p>
          ) : !uploadOpen ? (
            visibleMedia.length > 0 ? (
              <ul className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
                {visibleMedia.map((item) => {
                  const isSelected = selectedMedia?.id === item.id;
                  const isSelectedAttachment = attachments.some(
                    (attachment) => attachment.media_id === item.id,
                  );
                  return (
                    <li key={item.id}>
                      {pickerMode === "attachment" ? (
                        <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2 hover:bg-background">
                          <input
                            checked={isSelectedAttachment}
                            className="size-4 accent-foreground"
                            type="checkbox"
                            onChange={() => toggleAttachment(item)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.title || item.original_filename}
                            </span>
                            <span className="mt-1 block text-xs text-muted">
                              {item.mime_type} ·{" "}
                              {Math.max(1, Math.round(item.size_bytes / 1024))} KB
                            </span>
                          </span>
                        </label>
                      ) : (
                        <button
                          aria-pressed={isSelected}
                          className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                            isSelected
                              ? "border-foreground"
                              : "border-border hover:bg-background"
                          }`}
                          type="button"
                          onClick={() => {
                            setSelectedMedia(item);
                            setSelectedLabel(
                              pickerMode === "image"
                                ? item.alt_text ?? ""
                                : item.title ?? item.original_filename,
                            );
                            setSelectionError(null);
                          }}
                        >
                          {item.kind === "IMAGE" ? (
                            <AuthenticatedMediaPreview
                              alt=""
                              className="size-14 shrink-0 rounded-lg object-cover"
                              mediaId={item.id}
                            />
                          ) : (
                            <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-border bg-surface text-[10px] font-semibold text-muted">
                              {item.kind === "VIDEO" ? "VIDEO" : "FILE"}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {item.title || item.original_filename}
                            </span>
                            <span className="mt-1 block text-xs text-muted">
                              {item.kind === "VIDEO" && item.duration_seconds
                                ? `${item.duration_seconds} seconds`
                                : item.width && item.height
                                ? `${item.width} × ${item.height}`
                                : item.mime_type}
                            </span>
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                No matching{" "}
                {allowedKind === "IMAGE"
                  ? "images"
                  : allowedKind === "VIDEO"
                    ? "videos"
                    : "documents"}
                .
              </p>
            )
          ) : null}

          {pickerMode !== "attachment" &&
            pickerMode !== null &&
            selectedMedia &&
            !uploadOpen && (
            <div className="grid gap-3 rounded-2xl border border-border bg-background p-4">
              <label className="grid gap-1.5 text-sm font-medium">
                {pickerMode === "image"
                  ? "Alternative text"
                  : pickerMode === "video"
                    ? "Video title"
                    : "Download link text"}
                <input
                  autoFocus
                  className="min-h-11 rounded-lg border border-border bg-surface px-3 font-normal"
                  maxLength={500}
                  value={selectedLabel}
                  onChange={(event) => {
                    setSelectedLabel(event.target.value);
                    setSelectionError(null);
                  }}
                />
                <span className="text-xs font-normal text-muted">
                  {pickerMode === "image"
                    ? "Describe the image for readers using assistive technology."
                    : pickerMode === "video"
                      ? "Give the embedded video a clear accessible title."
                      : "This text becomes the downloadable document link."}
                </span>
              </label>
              {selectionError && (
                <p className="text-sm text-red-600" role="alert">
                  {selectionError}
                </p>
              )}
              <button
                className="min-h-11 w-fit rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-50"
                disabled={!selectedLabel.trim()}
                type="button"
                onClick={insertSelectedMedia}
              >
                {pickerMode === "image"
                  ? "Insert image"
                  : pickerMode === "video"
                    ? "Insert video"
                    : "Insert download link"}
              </button>
            </div>
          )}

          {pickerMode === "attachment" && !uploadOpen && (
            <button
              className="min-h-11 w-fit rounded-full bg-foreground px-5 text-sm font-medium text-background"
              type="button"
              onClick={closePicker}
            >
              Done
            </button>
          )}
        </div>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
