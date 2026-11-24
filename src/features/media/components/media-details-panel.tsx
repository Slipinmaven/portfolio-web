"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import {
  deleteMedia,
  listMediaUsages,
  updateMedia,
  type MediaItem,
  type MediaUsage,
} from "@/features/media/api/media-api";
import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";
import { useAdminRole } from "@/features/admin/components/admin-role-context";

export function MediaDetailsPanel({
  media,
  onClose,
  onUpdated,
  onDeleted,
}: {
  media: MediaItem;
  onClose: () => void;
  onUpdated: (media: MediaItem) => void;
  onDeleted: (mediaId: string) => void;
}) {
  const [title, setTitle] = useState(media.title ?? "");
  const [altText, setAltText] = useState(media.alt_text ?? "");
  const [links, setLinks] = useState(
    media.links.map((link) => ({ url: link.url, label: link.label ?? "" })),
  );
  const [usages, setUsages] = useState<MediaUsage[] | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const contentPreview = useAdminMediaAsset(media.id, "content");
  const role = useAdminRole();
  const posterPreview = useAdminMediaAsset(
    media.id,
    media.poster_url ? "poster" : null,
  );

  useEffect(() => {
    let active = true;
    void listMediaUsages(media.id)
      .then((items) => {
        if (active) setUsages(items);
      })
      .catch((usageLoadError: unknown) => {
        if (active) {
          setUsageError(
            usageLoadError instanceof Error
              ? usageLoadError.message
              : "Unable to load media usage.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [media.id]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateMedia(media.id, {
        title: title.trim() || null,
        alt_text: altText.trim() || null,
        links: links
          .filter((link) => link.url.trim())
          .map((link, index) => ({
            url: link.url.trim(),
            label: link.label.trim() || null,
            display_order: index,
          })),
      });
      onUpdated(updated);
      setMessage("Media details saved.");
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save media details.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteMedia(media.id);
      onDeleted(media.id);
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this media.",
      );
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <aside
      aria-labelledby="media-details-heading"
      className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="media-details-heading" className="text-lg font-semibold">
            Media details
          </h2>
          <p className="mt-1 break-words text-sm text-muted">
            {media.original_filename}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
            {media.kind.toLowerCase()}
          </span>
          <button
            aria-label="Close media details"
            className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
            type="button"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
        {media.kind === "IMAGE" && contentPreview.status === "ready" ? (
          <Image
            alt={media.alt_text ?? media.title ?? media.original_filename}
            className="max-h-64 w-full object-contain"
            height={media.height ?? 480}
            src={contentPreview.url}
            unoptimized
            width={media.width ?? 640}
          />
        ) : media.kind === "VIDEO" && contentPreview.status === "ready" ? (
          <video
            className="max-h-64 w-full"
            controls
            preload="metadata"
            poster={
              posterPreview.status === "ready" ? posterPreview.url : undefined
            }
            src={contentPreview.url}
          />
        ) : media.kind === "DOCUMENT" && contentPreview.status === "ready" ? (
          <a
            className="flex min-h-32 items-center justify-center px-4 text-sm font-medium underline-offset-4 hover:underline"
            href={contentPreview.url}
            rel="noreferrer"
            target="_blank"
          >
            Open document
          </a>
        ) : contentPreview.status === "error" ? (
          <p className="p-4 text-center text-sm text-red-600" role="alert">
            {contentPreview.message}
          </p>
        ) : (
          <p className="p-4 text-center text-sm text-muted" role="status">
            Loading preview…
          </p>
        )}
        {media.kind === "VIDEO" && posterPreview.status === "error" && (
          <p className="p-3 text-sm text-red-600" role="alert">
            {posterPreview.message}
          </p>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-background p-3 text-xs">
        <div>
          <dt className="text-muted">File size</dt>
          <dd className="mt-1 font-medium">{formatBytes(media.size_bytes)}</dd>
        </div>
        <div>
          <dt className="text-muted">Dimensions</dt>
          <dd className="mt-1 font-medium">
            {media.width && media.height
              ? `${media.width} × ${media.height}`
              : "Not available"}
          </dd>
        </div>
        {media.duration_seconds !== null && (
          <div>
            <dt className="text-muted">Duration</dt>
            <dd className="mt-1 font-medium">
              {media.duration_seconds} seconds
            </dd>
          </div>
        )}
      </dl>

      <form className="mt-5 grid gap-4" onSubmit={handleSave}>
        <label className="grid gap-2 text-sm font-medium">
          Library title
          <input
            className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Alternative text
          <textarea
            className="min-h-24 min-w-0 resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
            maxLength={500}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
          />
          <span className="text-xs font-normal leading-5 text-muted">
            Images used in published projects must have alternative text.
          </span>
        </label>

        <fieldset className="grid min-w-0 gap-3">
          <legend className="text-sm font-medium">External links</legend>
          {links.map((link, index) => (
            <div
              key={`${media.id}-link-${index}`}
              className="grid min-w-0 gap-2 rounded-xl border border-border bg-background p-3"
            >
              <label className="grid gap-1.5 text-xs font-medium text-muted">
                HTTPS URL
                <input
                  className="min-h-11 min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                  placeholder="https://example.com"
                  required
                  type="url"
                  value={link.url}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, url: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted">
                Link label
                <input
                  className="min-h-11 min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                  maxLength={100}
                  value={link.label}
                  onChange={(event) =>
                    setLinks((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <button
                className="min-h-10 justify-self-start rounded-full px-3 text-xs font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
                type="button"
                onClick={() =>
                  setLinks((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Remove link
              </button>
            </div>
          ))}
          <button
            className="min-h-11 justify-self-start rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
            type="button"
            onClick={() =>
              setLinks((current) => [...current, { url: "", label: "" }])
            }
          >
            Add external link
          </button>
        </fieldset>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-foreground" role="status">
            {message}
          </p>
        )}
        <button
          className="min-h-11 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving…" : "Save details"}
        </button>
      </form>

      <section aria-labelledby="media-usages-heading" className="mt-6 border-t border-border pt-5">
        <h3 id="media-usages-heading" className="text-sm font-semibold">
          Where it’s used
        </h3>
        {usageError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {usageError}
          </p>
        ) : usages === null ? (
          <p className="mt-2 text-sm text-muted" role="status">
            Checking usage…
          </p>
        ) : usages.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            This media is not currently in use.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {usages.map((usage) => (
              <li
                key={
                  usage.usage_type === "PROJECT"
                    ? `${usage.project_id}-${usage.role}`
                    : `site-settings-${usage.setting}`
                }
                className="rounded-xl border border-border bg-background p-3"
              >
                {usage.usage_type === "PROJECT" ? (
                  <>
                    <Link
                      className="text-sm font-medium underline-offset-4 hover:underline"
                      href={`/admin/projects/${encodeURIComponent(usage.project_id)}/edit`}
                    >
                      {usage.project_title}
                    </Link>
                    <p className="mt-1 text-xs text-muted">
                      {usage.role.toLowerCase()} · /{usage.project_slug}
                    </p>
                  </>
                ) : (
                  <>
                    {role === "admin" ? (
                      <Link
                        className="text-sm font-medium underline-offset-4 hover:underline"
                        href="/admin/settings"
                      >
                        Site settings
                      </Link>
                    ) : (
                      <p className="text-sm font-medium">Site settings</p>
                    )}
                    <p className="mt-1 text-xs text-muted">{usage.setting}</p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 border-t border-border pt-5">
        {confirmDelete ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
            <p className="font-medium">Delete this media permanently?</p>
            <p className="mt-1 leading-5">
              The file cannot be recovered. Projects or site settings using it
              prevent deletion.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="min-h-10 rounded-full bg-red-700 px-4 py-2 font-medium text-white disabled:opacity-50"
                disabled={isDeleting || (usages?.length ?? 0) > 0}
                type="button"
                onClick={() => void handleDelete()}
              >
                {isDeleting ? "Deleting…" : "Confirm delete"}
              </button>
              <button
                className="min-h-10 rounded-full border border-current px-4 py-2 font-medium"
                disabled={isDeleting}
                type="button"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="min-h-11 rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            disabled={usages === null || usages.length > 0}
            type="button"
            onClick={() => setConfirmDelete(true)}
          >
            Delete media
          </button>
        )}
      </div>
    </aside>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
