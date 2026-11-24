"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import {
  listAllManagedMedia,
  type MediaItem,
} from "@/features/media/api/media-api";
import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";
import {
  addProjectMedia,
  listProjectMedia,
  removeProjectMedia,
  reorderProjectMedia,
  updateProjectMedia,
  type ProjectMediaItem,
  type ProjectMediaRole,
} from "@/features/projects/api/project-media-api";
import type { ProjectStatus } from "@/features/projects/api/projects-api";

const ROLES: Array<{
  value: ProjectMediaRole;
  label: string;
  description: string;
}> = [
  { value: "COVER", label: "Cover", description: "Main project image" },
  { value: "GALLERY", label: "Gallery", description: "Images and videos" },
  {
    value: "ATTACHMENT",
    label: "Downloads",
    description: "PDF and ZIP files",
  },
];
const MEDIA_PICKER_PAGE_SIZE = 24;

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | {
      requestId: string;
      status: "ready";
      media: ProjectMediaItem[];
      library: MediaItem[];
    };

export function ProjectMediaEditor({
  projectId,
  projectStatus,
}: {
  projectId: string;
  projectStatus: ProjectStatus;
}) {
  const [reload, setReload] = useState(0);
  const requestId = `${projectId}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState = useMemo<LoadState>(
    () =>
      state.requestId === requestId
        ? state
        : { requestId, status: "loading" },
    [requestId, state],
  );
  const [role, setRole] = useState<ProjectMediaRole>("COVER");
  const [mediaId, setMediaId] = useState("");
  const [caption, setCaption] = useState("");
  const [search, setSearch] = useState("");
  const [visibleMediaCount, setVisibleMediaCount] = useState(
    MEDIA_PICKER_PAGE_SIZE,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([listProjectMedia(projectId), listAllManagedMedia()])
      .then(([media, library]) => {
        if (active) setState({ requestId, status: "ready", media, library });
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setState({
          requestId,
          status: "error",
          message:
            loadError instanceof Error
              ? loadError.message
              : "Unable to load project media.",
        });
      });
    return () => {
      active = false;
    };
  }, [projectId, reload, requestId]);

  const availableMedia = useMemo(() => {
    if (visibleState.status !== "ready") return [];
    const assigned = new Set(
      visibleState.media
        .filter((item) => item.role === role)
        .map((item) => item.media_id),
    );
    const normalizedSearch = search.trim().toLowerCase();
    return visibleState.library.filter((item) => {
      if (assigned.has(item.id)) return false;
      if (role === "COVER" && item.kind !== "IMAGE") return false;
      if (role === "GALLERY" && item.kind === "DOCUMENT") return false;
      if (role === "ATTACHMENT" && item.kind !== "DOCUMENT") return false;
      if (!normalizedSearch) return true;
      return `${item.title ?? ""} ${item.original_filename}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [role, search, visibleState]);

  const selectedMedia =
    visibleState.status === "ready"
      ? visibleState.library.find((item) => item.id === mediaId) ?? null
      : null;
  const hasCover =
    visibleState.status === "ready" &&
    visibleState.media.some((item) => item.role === "COVER");
  const needsAltText =
    projectStatus === "PUBLISHED" &&
    selectedMedia?.kind === "IMAGE" &&
    !selectedMedia.alt_text;

  async function refreshAssignments() {
    const media = await listProjectMedia(projectId);
    setState((current) =>
      current.status === "ready" ? { ...current, media } : current,
    );
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mediaId || needsAltText) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const currentItems =
        visibleState.status === "ready"
          ? visibleState.media.filter((item) => item.role === role)
          : [];
      const displayOrder =
        currentItems.reduce(
          (highest, item) => Math.max(highest, item.display_order),
          -1,
        ) + 1;
      await addProjectMedia(projectId, {
        media_id: mediaId,
        role,
        display_order: displayOrder,
        caption: caption.trim() || null,
      });
      setMediaId("");
      setCaption("");
      await refreshAssignments();
      setMessage("Media added to the project.");
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to add media to this project.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(item: ProjectMediaItem) {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await removeProjectMedia(projectId, item);
      await refreshAssignments();
      setMessage("Media removed from the project. The library file is unchanged.");
    } catch (removeError: unknown) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove this project assignment.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCaptionSave(
    item: ProjectMediaItem,
    nextCaption: string,
  ) {
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProjectMedia(projectId, item, {
        caption: nextCaption.trim() || null,
      });
      await refreshAssignments();
      setMessage("Caption saved.");
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this caption.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function moveItem(item: ProjectMediaItem, direction: -1 | 1) {
    if (item.role === "INLINE") return;
    if (visibleState.status !== "ready") return;
    const peers = visibleState.media
      .filter((candidate) => candidate.role === item.role)
      .sort(
        (left, right) =>
          left.display_order - right.display_order ||
          left.media_id.localeCompare(right.media_id),
      );
    const index = peers.findIndex((candidate) => candidate.media_id === item.media_id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= peers.length) return;
    const reordered = [...peers];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    setIsSaving(true);
    setError(null);
    try {
      const updated = await reorderProjectMedia(
        projectId,
        item.role,
        reordered.map((entry) => entry.media_id),
      );
      setState((current) =>
        current.status === "ready" ? { ...current, media: updated } : current,
      );
    } catch (reorderError: unknown) {
      setError(
        reorderError instanceof Error
          ? reorderError.message
          : "Unable to reorder project media.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="project-media-heading"
      className="rounded-2xl border border-border bg-surface p-4 sm:p-6 lg:p-7"
    >
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
          Project presentation
        </p>
        <h2
          id="project-media-heading"
          className="mt-2 text-xl font-semibold tracking-tight"
        >
          Project media
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Add a cover, order gallery items, and attach downloadable documents.
          Removing an assignment does not delete the file from your shared
          library.
        </p>
      </div>

      {visibleState.status === "loading" && (
        <p className="py-8 text-center text-sm text-muted" role="status">
          Loading project media…
        </p>
      )}
      {visibleState.status === "error" && (
        <div className="py-6 text-center">
          <p className="text-sm text-red-600" role="alert">
            {visibleState.message}
          </p>
          <button
            className="mt-3 min-h-11 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-background"
            type="button"
            onClick={() => setReload((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {visibleState.status === "ready" && (
        <>
          <form
            className="mt-5 overflow-hidden rounded-2xl border border-border bg-background"
            onSubmit={handleAdd}
          >
            <div className="border-b border-border p-4 sm:p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">Add project media</h3>
                  <p className="mt-1 text-sm text-muted">
                    Choose where the file should appear.
                  </p>
                </div>
                <Link
                  className="text-sm font-medium underline-offset-4 hover:underline"
                  href="/admin/media"
                >
                  Open media library
                </Link>
              </div>

              <div
                aria-label="Media placement"
                className="mt-4 grid grid-cols-3 gap-2"
                role="group"
              >
                {ROLES.map((option) => (
                  <button
                    key={option.value}
                    aria-pressed={role === option.value}
                    className={`min-h-16 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                      role === option.value
                        ? "border-foreground bg-surface"
                        : "border-border hover:bg-surface"
                    }`}
                    type="button"
                    onClick={() => {
                      setRole(option.value);
                      setMediaId("");
                      setCaption("");
                      setVisibleMediaCount(MEDIA_PICKER_PAGE_SIZE);
                    }}
                  >
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium">
                  Find a file
                  <input
                    className="min-h-11 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                    placeholder="Search by title or filename"
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setVisibleMediaCount(MEDIA_PICKER_PAGE_SIZE);
                    }}
                  />
                </label>
                <p className="pb-2 text-xs text-muted" aria-live="polite">
                  {availableMedia.length} available
                </p>
              </div>

              {hasCover && role === "COVER" && (
                <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50">
                  A cover is already assigned. Remove it below before choosing
                  another.
                </p>
              )}

              {availableMedia.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-8 text-center">
                  <p className="text-sm font-medium">
                    {search.trim()
                      ? "No files match your search"
                      : hasCover && role === "COVER"
                        ? "A cover is already assigned"
                      : `No ${role === "COVER" ? "images" : role === "GALLERY" ? "images or videos" : "documents"} available`}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {hasCover && role === "COVER" && !search.trim()
                      ? "Remove the current cover below before choosing another."
                      : "Upload a file in the media library, then come back to add it here."}
                  </p>
                  {!(hasCover && role === "COVER" && !search.trim()) && (
                    <Link
                      className="mt-3 inline-flex min-h-10 items-center rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
                      href="/admin/media"
                    >
                      Go to media library
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="mt-4 grid max-h-[28rem] grid-cols-2 gap-3 overflow-y-auto p-0.5 sm:grid-cols-3 xl:grid-cols-4">
                  {availableMedia.slice(0, visibleMediaCount).map((item) => (
                    <li key={item.id} className="min-w-0">
                      <MediaPickerCard
                        media={item}
                        selected={mediaId === item.id}
                        disabled={isSaving || (hasCover && role === "COVER")}
                        onSelect={() => setMediaId(item.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {availableMedia.length > visibleMediaCount && (
                <button
                  className="mt-3 min-h-10 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
                  type="button"
                  onClick={() =>
                    setVisibleMediaCount(
                      (current) => current + MEDIA_PICKER_PAGE_SIZE,
                    )
                  }
                >
                  Show more files (
                  {availableMedia.length - visibleMediaCount} remaining)
                </button>
              )}

              {selectedMedia && (
                <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="grid min-w-0 gap-1.5 text-sm font-medium">
                    Caption <span className="font-normal text-muted">(optional)</span>
                    <input
                      className="min-h-11 min-w-0 rounded-lg border border-border bg-surface px-3 text-sm font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                      maxLength={300}
                      placeholder="Describe this item in this project"
                      value={caption}
                      onChange={(event) => setCaption(event.target.value)}
                    />
                  </label>
                  <button
                    className="min-h-11 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSaving || needsAltText}
                    type="submit"
                  >
                    {isSaving ? "Adding…" : "Add to project"}
                  </button>
                </div>
              )}

              {needsAltText && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  Add alternative text in the media library before assigning
                  this image to a published project.
                </p>
              )}
            </div>
          </form>

          <div className="mt-6 grid gap-5">
            {ROLES.map((itemRole) => {
              const items = visibleState.media
                .filter((item) => item.role === itemRole.value)
                .sort(
                  (left, right) =>
                    left.display_order - right.display_order ||
                    left.media_id.localeCompare(right.media_id),
                );
              return (
                <section key={itemRole.value} aria-label={itemRole.label}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{itemRole.label}</h3>
                    <span className="text-xs text-muted">
                      {items.length} assigned
                    </span>
                  </div>
                  {items.length === 0 ? (
                    <p className="mt-2 rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
                      No {itemRole.label.toLowerCase()} assigned.
                    </p>
                  ) : (
                    <ul className="mt-3 grid gap-3">
                      {items.map((item, index) => (
                        <ProjectMediaRow
                          key={`${item.media_id}-${item.role}-${item.caption ?? ""}`}
                          item={item}
                          index={index}
                          count={items.length}
                          disabled={isSaving}
                          onCaptionSave={handleCaptionSave}
                          onMove={moveItem}
                          onRemove={handleRemove}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-4 text-sm text-foreground" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function MediaPickerCard({
  media,
  selected,
  disabled,
  onSelect,
}: {
  media: MediaItem;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const previewType =
    media.kind === "IMAGE"
      ? "content"
      : media.kind === "VIDEO" && media.poster_url
        ? "poster"
        : null;
  const preview = useAdminMediaAsset(media.id, previewType);
  const label = media.title || media.original_filename;
  const extension = media.original_filename.split(".").pop()?.slice(0, 4);

  return (
    <button
      aria-label={`Select ${label}, ${media.kind.toLowerCase()}, ${formatBytes(media.size_bytes)}`}
      aria-pressed={selected}
      className={`group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-foreground bg-surface ring-1 ring-foreground"
          : "border-border bg-surface hover:border-muted"
      }`}
      disabled={disabled}
      type="button"
      onClick={onSelect}
    >
      <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-soft-surface">
        {preview.status === "ready" && previewType ? (
          <Image
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
            height={media.height ?? 240}
            src={preview.url}
            unoptimized
            width={media.width ?? 320}
          />
        ) : media.kind === "DOCUMENT" ? (
          <span className="grid size-12 place-items-center rounded-xl border border-border bg-background text-xs font-bold uppercase text-muted">
            {extension || "FILE"}
          </span>
        ) : preview.status === "loading" ? (
          <span className="text-xs text-muted" role="status">
            Loading preview…
          </span>
        ) : (
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            {media.kind === "VIDEO" ? "Video" : "Preview unavailable"}
          </span>
        )}
        {selected && (
          <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
            ✓
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col p-3">
        <span className="truncate text-sm font-medium">{label}</span>
        <span className="mt-1 truncate text-xs text-muted">
          {media.kind.toLowerCase()} · {formatBytes(media.size_bytes)}
        </span>
        {media.kind === "IMAGE" && !media.alt_text && (
          <span className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            Alt text missing
          </span>
        )}
      </span>
    </button>
  );
}

function ProjectMediaRow({
  item,
  index,
  count,
  disabled,
  onCaptionSave,
  onMove,
  onRemove,
}: {
  item: ProjectMediaItem;
  index: number;
  count: number;
  disabled: boolean;
  onCaptionSave: (item: ProjectMediaItem, caption: string) => Promise<void>;
  onMove: (item: ProjectMediaItem, direction: -1 | 1) => Promise<void>;
  onRemove: (item: ProjectMediaItem) => Promise<void>;
}) {
  const [caption, setCaption] = useState(item.caption ?? "");
  const showPreview = item.kind === "IMAGE" || Boolean(item.poster_url);
  const preview = useAdminMediaAsset(
    item.media_id,
    item.kind === "VIDEO"
      ? item.poster_url
        ? "poster"
        : null
      : item.kind === "IMAGE"
        ? "content"
        : null,
  );
  const captionChanged = caption.trim() !== (item.caption ?? "");

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex min-w-0 gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-soft-surface sm:size-24">
          {showPreview && preview.status === "ready" ? (
            <Image
              alt=""
              className="h-full w-full object-cover"
              height={item.height ?? 180}
              src={preview.url}
              unoptimized
              width={item.width ?? 240}
            />
          ) : showPreview && preview.status === "loading" ? (
            <span className="text-[10px] text-muted" role="status">
              Loading…
            </span>
          ) : (
            <span className="px-1 text-center text-[10px] font-medium uppercase text-muted">
              {item.kind === "VIDEO"
                ? "Video"
                : item.kind === "IMAGE"
                  ? "Preview unavailable"
                  : "Document"}
            </span>
          )}
          {item.kind === "VIDEO" && (
            <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
              Video
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 flex-1 break-words text-sm font-semibold">
              {item.title || item.original_filename}
            </p>
            <span className="rounded-full bg-soft-surface px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {item.kind.toLowerCase()}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            {item.width && item.height
              ? `${item.width} × ${item.height}`
              : item.original_filename}
          </p>

          <div className="mt-3">
            <label
              className="mb-1.5 block text-xs font-medium text-muted"
              htmlFor={`project-caption-${item.media_id}`}
            >
              Project caption
            </label>
            <div className="flex min-w-0 flex-wrap gap-2">
              <input
                id={`project-caption-${item.media_id}`}
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={300}
                placeholder="Add a caption for this project"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
              {captionChanged && (
                <button
                  className="min-h-10 rounded-lg bg-foreground px-3 text-xs font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled}
                  type="button"
                  onClick={() => void onCaptionSave(item, caption)}
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-soft-surface/40 px-3 py-2.5 sm:px-4">
        {count > 1 ? (
          <div className="flex items-center gap-2">
            <span className="mr-1 text-xs font-medium text-muted">
              Order {index + 1} of {count}
            </span>
            <button
              aria-label={`Move item ${index + 1} up`}
              className="grid size-9 place-items-center rounded-lg border border-border bg-background text-base font-semibold hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled || index === 0}
              title="Move up"
              type="button"
              onClick={() => void onMove(item, -1)}
            >
              ↑
            </button>
            <button
              aria-label={`Move item ${index + 1} down`}
              className="grid size-9 place-items-center rounded-lg border border-border bg-background text-base font-semibold hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
              disabled={disabled || index === count - 1}
              title="Move down"
              type="button"
              onClick={() => void onMove(item, 1)}
            >
              ↓
            </button>
          </div>
        ) : (
          <span className="text-xs text-muted">Project media</span>
        )}
        <button
          className="min-h-9 rounded-lg px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950"
          disabled={disabled}
          type="button"
          onClick={() => void onRemove(item)}
        >
          Remove assignment
        </button>
      </div>
    </li>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
