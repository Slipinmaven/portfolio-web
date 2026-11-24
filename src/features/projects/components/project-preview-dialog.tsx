"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import type { ProjectMediaItem } from "@/features/projects/api/project-media-api";
import { AdminMarkdownPreview } from "@/features/posts/components/admin-markdown-preview";
import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";

export type ProjectPreviewCheck = {
  label: string;
  ready: boolean;
  detail?: string;
};

export function ProjectPreviewDialog({
  open,
  onClose,
  title,
  slug,
  shortDescription,
  overview,
  overviewHtml,
  overviewPreviewLoading,
  overviewPreviewError,
  developmentStatus,
  status,
  isFeatured,
  githubUrl,
  demoUrl,
  categories,
  tags,
  checks,
  media,
  mediaLoading,
  mediaError,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  slug: string;
  shortDescription: string;
  overview: string;
  overviewHtml: string;
  overviewPreviewLoading: boolean;
  overviewPreviewError: string | null;
  developmentStatus: string;
  status: string;
  isFeatured: boolean;
  githubUrl: string;
  demoUrl: string;
  categories: string[];
  tags: string[];
  checks: ProjectPreviewCheck[];
  media: ProjectMediaItem[];
  mediaLoading: boolean;
  mediaError: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cover = media.find((item) => item.role === "COVER");
  const gallery = media
    .filter((item) => item.role === "GALLERY")
    .sort(
      (left, right) =>
        left.display_order - right.display_order ||
        left.media_id.localeCompare(right.media_id),
    );
  const attachments = media
    .filter((item) => item.role === "ATTACHMENT")
    .sort(
      (left, right) =>
        left.display_order - right.display_order ||
        left.media_id.localeCompare(right.media_id),
    );
  const demoLink = safeExternalUrl(demoUrl);
  const githubLink = safeExternalUrl(githubUrl);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="project-preview-heading"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-6xl overflow-y-auto rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur sm:px-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Preview · unsaved changes
          </p>
          <h2
            id="project-preview-heading"
            className="mt-1 text-lg font-semibold"
          >
            Visitor view
          </h2>
        </div>
        <button
          aria-label="Close project preview"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors hover:bg-surface hover:text-foreground"
          type="button"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <article className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
              {readableStatus(status)}
            </span>
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
              {readableStatus(developmentStatus)}
            </span>
            {isFeatured && (
              <span className="rounded-full border border-accent/50 bg-accent/15 px-3 py-1 text-xs font-medium">
                Featured
              </span>
            )}
          </div>

          <p className="mt-4 text-sm text-muted">
            {categories.length > 0 ? categories.join(" · ") : "Uncategorized"}
          </p>
          <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
            {title.trim() || "Project title"}
          </h1>
          <p className="mt-3 max-w-3xl whitespace-pre-wrap text-lg leading-7 text-muted">
            {shortDescription.trim() || "Your short description will appear here."}
          </p>

          {cover ? (
            <PreviewMedia item={cover} variant="cover" />
          ) : (
            <div className="mt-6 grid min-h-52 place-items-center rounded-2xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
              No cover image assigned
            </div>
          )}

          <section className="mt-7">
            <h3 className="text-lg font-semibold">About this project</h3>
            {overviewPreviewLoading ? (
              <p className="mt-3 text-sm text-muted" role="status">
                Rendering overview…
              </p>
            ) : overviewPreviewError ? (
              <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
                {overviewPreviewError}
              </p>
            ) : overview.trim() ? (
              <div className="mt-3">
                <AdminMarkdownPreview html={overviewHtml} />
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No detailed overview added.
              </p>
            )}
          </section>

          {gallery.length > 0 && (
            <section className="mt-7">
              <h3 className="text-lg font-semibold">Gallery</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {gallery.map((item) => (
                  <li key={`${item.media_id}-${item.role}`}>
                    <PreviewMedia item={item} variant="gallery" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {attachments.length > 0 && (
            <section className="mt-7">
              <h3 className="text-lg font-semibold">Downloads</h3>
              <ul className="mt-3 grid gap-2">
                {attachments.map((item) => (
                  <li
                    key={`${item.media_id}-${item.role}`}
                    className="rounded-xl border border-border bg-surface px-4 py-3"
                  >
                    <p className="break-words text-sm font-medium">
                      {item.title || item.original_filename}
                    </p>
                    {item.caption && (
                      <p className="mt-1 text-sm leading-6 text-muted">
                        {item.caption}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tags.length > 0 && (
            <ul aria-label="Project tags" className="mt-7 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-surface px-3 py-1 text-xs text-muted"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          {(githubUrl.trim() || demoUrl.trim()) && (
            <div className="mt-7 flex flex-wrap gap-3">
              {demoUrl.trim() && (
                demoLink ? (
                  <a
                    className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background underline-offset-4 hover:underline"
                    href={demoLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Live demo
                  </a>
                ) : (
                  <span className="rounded-full border border-dashed border-border px-5 py-3 text-sm text-muted">
                    Live demo URL needs fixing
                  </span>
                )
              )}
              {githubUrl.trim() && (
                githubLink ? (
                  <a
                    className="rounded-full border border-border px-5 py-3 text-sm font-medium underline-offset-4 hover:underline"
                    href={githubLink}
                    rel="noreferrer"
                    target="_blank"
                  >
                    GitHub repository
                  </a>
                ) : (
                  <span className="rounded-full border border-dashed border-border px-5 py-3 text-sm text-muted">
                    GitHub URL needs fixing
                  </span>
                )
              )}
            </div>
          )}
          <p className="mt-5 break-all text-xs text-muted">
            Preview URL: /projects/{slug.trim() || "project-slug"}
          </p>
        </article>

        <aside
          aria-labelledby="project-preview-checks-heading"
          className="h-fit rounded-2xl border border-border bg-surface p-4 sm:p-5"
        >
          <h3
            id="project-preview-checks-heading"
            className="text-base font-semibold"
          >
            Before publishing
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            These checks help catch missing project information. Previewing
            doesn’t save or publish your changes.
          </p>
          {mediaLoading ? (
            <p className="mt-4 text-sm text-muted" role="status">
              Checking assigned media…
            </p>
          ) : mediaError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {mediaError}
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {checks.map((check) => (
                <li key={check.label} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
                      check.ready
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                    }`}
                  >
                    {check.ready ? "✓" : "!"}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {check.label}
                    </span>
                    {check.detail && (
                      <span className="mt-0.5 block text-xs leading-5 text-muted">
                        {check.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted">
            The cover image is optional. This preview is an editor-side
            approximation; the live page may use the portfolio site’s final
            layout and theme.
          </p>
        </aside>
      </div>
    </dialog>
  );
}

function PreviewMedia({
  item,
  variant,
}: {
  item: ProjectMediaItem;
  variant: "cover" | "gallery";
}) {
  const isVideo = item.kind === "VIDEO";
  const asset = useAdminMediaAsset(
    item.media_id,
    isVideo ? "content" : item.kind === "IMAGE" ? "content" : null,
  );
  const poster = useAdminMediaAsset(
    item.media_id,
    isVideo && item.poster_url ? "poster" : null,
  );
  const className =
    variant === "cover"
      ? "mt-6 max-h-[32rem] w-full rounded-2xl border border-border bg-surface object-contain"
      : "aspect-video w-full rounded-xl border border-border bg-surface object-contain";

  if (asset.status === "loading") {
    return (
      <div
        className={`${className} grid min-h-36 place-items-center text-sm text-muted`}
        role="status"
      >
        Loading media preview…
      </div>
    );
  }
  if (asset.status === "error") {
    return (
      <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100" role="alert">
        {asset.message}
      </p>
    );
  }
  if (asset.status === "disabled") {
    return (
      <p className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        Preview unavailable for this media type.
      </p>
    );
  }
  if (isVideo) {
    return (
      <video
        className={className}
        controls
        preload="metadata"
        poster={poster.status === "ready" ? poster.url : undefined}
        src={asset.url}
      >
        Video preview
      </video>
    );
  }
  if (item.kind === "IMAGE") {
    return (
      <Image
        alt={item.alt_text || ""}
        className={className}
        height={item.height ?? 720}
        src={asset.url}
        unoptimized
        width={item.width ?? 1280}
      />
    );
  }
  return (
    <p className="mt-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
      {item.title || item.original_filename}
    </p>
  );
}

function readableStatus(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
