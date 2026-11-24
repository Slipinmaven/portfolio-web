import { mergeAttributes, Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";

import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";
import { mediaAssetUrl } from "@/features/media/api/media-api";

const MEDIA_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const INLINE_VIDEO_MARKDOWN_TITLE = "media-video";

function MediaVideoNodeView({ node, selected, deleteNode }: NodeViewProps) {
  const rawMediaId: unknown = node.attrs.mediaId;
  const mediaId =
    typeof rawMediaId === "string" && MEDIA_ID_PATTERN.test(rawMediaId)
      ? rawMediaId
      : null;
  const title = typeof node.attrs.title === "string" ? node.attrs.title : "";
  const video = useAdminMediaAsset(mediaId ?? "", mediaId ? "content" : null);

  return (
    <NodeViewWrapper
      as="figure"
      className={`inline-media-video-frame my-6 ${selected ? "rounded-xl ring-2 ring-[var(--focus-ring)] ring-offset-2" : ""}`}
    >
      {!mediaId ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          role="alert"
        >
          <p>
            This video reference has no valid media ID. Remove it and insert
            the video again from the media library.
          </p>
          <button
            className="rounded-lg border border-current px-3 py-1.5 font-semibold hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current dark:hover:bg-red-900"
            type="button"
            onClick={deleteNode}
          >
            Remove broken video
          </button>
        </div>
      ) : video.status === "ready" ? (
        <video
          aria-label={title || "Embedded video"}
          className="block max-h-[36rem] w-full rounded-xl bg-black"
          controls
          preload="metadata"
          src={video.url}
        >
          Your browser does not support embedded video.
        </video>
      ) : video.status === "error" ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100" role="alert">
          {video.message}
        </p>
      ) : (
        <div
          className="grid aspect-video place-items-center rounded-xl bg-soft-surface text-sm text-muted"
          role="status"
        >
          Loading video preview...
        </div>
      )}
      {title.trim() && (
        <figcaption className="mt-2 text-sm text-muted">{title}</figcaption>
      )}
    </NodeViewWrapper>
  );
}

export const MediaVideo = Node.create({
  name: "mediaVideo",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  priority: 1001,

  addAttributes() {
    return {
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-media-id"),
        renderHTML: (attributes) =>
          attributes.mediaId ? { "data-media-id": attributes.mediaId } : {},
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("aria-label") ?? "",
        renderHTML: (attributes) =>
          attributes.title ? { "aria-label": attributes.title } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "video[data-media-id]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const rawMediaId: unknown = node.attrs.mediaId;
    const mediaId =
      typeof rawMediaId === "string" && MEDIA_ID_PATTERN.test(rawMediaId)
        ? rawMediaId
        : "";
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        class: "my-6 block max-h-[36rem] w-full rounded-xl bg-black",
        controls: "",
        preload: "metadata",
        src: mediaId
          ? mediaAssetUrl(`/api/v1/media/admin/${mediaId}/content`)
          : "",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MediaVideoNodeView);
  },

  renderMarkdown: (node) => {
    const rawMediaId: unknown = node.attrs?.mediaId;
    if (typeof rawMediaId !== "string" || !MEDIA_ID_PATTERN.test(rawMediaId)) {
      return "";
    }
    const title = String(node.attrs?.title ?? "")
      .replaceAll("\\", "\\\\")
      .replaceAll("]", "\\]");
    return `![${title}](media:${rawMediaId} "${INLINE_VIDEO_MARKDOWN_TITLE}")`;
  },
});
