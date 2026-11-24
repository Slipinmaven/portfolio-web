"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ApiResponseError } from "@/lib/api/api-errors";
import {
  deleteMedia,
  MEDIA_ENDPOINT_NOT_FOUND_MESSAGE,
  forgetPendingMediaUpload,
  getMediaStorageSummary,
  getManagedMedia,
  getMediaUploadJob,
  listPendingMediaUploads,
  listManagedMedia,
  type MediaItem,
  type MediaKind,
  type MediaListResponse,
  type MediaStorageSummary,
} from "@/features/media/api/media-api";
import { MediaDetailsPanel } from "@/features/media/components/media-details-panel";
import { MediaUploadForm } from "@/features/media/components/media-upload-form";
import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";

const PAGE_SIZE = 24;
const UPLOAD_JOB_NOT_FOUND_GRACE_MS = 30_000;
const MEDIA_FILTERS: Array<{ value: "" | MediaKind; label: string }> = [
  { value: "", label: "All media" },
  { value: "IMAGE", label: "Images" },
  { value: "DOCUMENT", label: "Documents" },
  { value: "VIDEO", label: "Videos" },
];

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; data: MediaListResponse };

type StorageLoadState =
  | { requestId: number; status: "loading" }
  | { requestId: number; status: "error"; message: string }
  | { requestId: number; status: "ready"; data: MediaStorageSummary };

const STORAGE_CATEGORY_LABELS: Record<MediaKind, string> = {
  IMAGE: "Images",
  DOCUMENT: "Documents",
  VIDEO: "Videos",
};

const STORAGE_CATEGORY_COLORS: Record<MediaKind, string> = {
  IMAGE: "bg-sky-500",
  DOCUMENT: "bg-violet-500",
  VIDEO: "bg-amber-500",
};

export function MediaLibraryPage() {
  const [offset, setOffset] = useState(0);
  const [kind, setKind] = useState<"" | MediaKind>("");
  const [unusedOnly, setUnusedOnly] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [openingStorageFileId, setOpeningStorageFileId] = useState<string | null>(
    null,
  );
  const [storageFileError, setStorageFileError] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [pendingUploadIds, setPendingUploadIds] = useState<string[]>([]);
  const [isRestoringUploads, setIsRestoringUploads] = useState(true);
  const [uploadRecoveryMessage, setUploadRecoveryMessage] = useState<
    string | null
  >(null);
  const [uploadRecoveryError, setUploadRecoveryError] = useState<string | null>(
    null,
  );
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    uploadId: string;
    uploaded: MediaItem;
    existing: MediaItem;
  } | null>(null);
  const [isChoosingExisting, setIsChoosingExisting] = useState(false);
  const uploadDialogRef = useRef<HTMLDialogElement>(null);
  const duplicateDialogRef = useRef<HTMLDialogElement>(null);
  const selectedDetailsRef = useRef<HTMLDivElement>(null);
  const scrollToDetailsRef = useRef(false);
  const uploadNotFoundSinceRef = useRef(new Map<string, number>());
  const requestId = `${offset}:${kind}:${query}:${unusedOnly}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const [storageState, setStorageState] = useState<StorageLoadState>({
    requestId: reload,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };
  const visibleStorageState: StorageLoadState =
    storageState.requestId === reload
      ? storageState
      : { requestId: reload, status: "loading" };

  useEffect(() => {
    const dialog = uploadDialogRef.current;
    if (!dialog) return;
    if (isUploadOpen && !dialog.open) dialog.showModal();
    if (!isUploadOpen && dialog.open) dialog.close();
  }, [isUploadOpen]);

  useEffect(() => {
    const dialog = duplicateDialogRef.current;
    if (!dialog) return;
    if (duplicatePrompt && !dialog.open) dialog.showModal();
    if (!duplicatePrompt && dialog.open) dialog.close();
  }, [duplicatePrompt]);

  useEffect(() => {
    if (!selected || !scrollToDetailsRef.current) return;
    scrollToDetailsRef.current = false;
    window.requestAnimationFrame(() => {
      selectedDetailsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [selected]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setPendingUploadIds(listPendingMediaUploads());
      } catch (error: unknown) {
        setUploadRecoveryError(
          error instanceof Error
            ? error.message
            : "Unable to restore the previous upload status.",
        );
      } finally {
        setIsRestoringUploads(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (pendingUploadIds.length === 0) return;
    let active = true;
    let timer: number | undefined;

    async function checkPendingUploads() {
      await Promise.all(
        pendingUploadIds.map(async (uploadId) => {
          try {
            const job = await getMediaUploadJob(uploadId);
            if (!active || job.status === "PROCESSING") return;

            if (
              job.status === "SUCCEEDED" &&
              job.media.duplicate_checksum &&
              job.media.duplicate_media_id
            ) {
              const existing = await getManagedMedia(
                job.media.duplicate_media_id,
              );
              if (!active) return;
              setSelected(job.media);
              setReload((current) => current + 1);
              setDuplicatePrompt({
                uploadId,
                uploaded: job.media,
                existing,
              });
              setPendingUploadIds((current) =>
                current.filter((id) => id !== uploadId),
              );
              setUploadRecoveryError(null);
              setUploadRecoveryMessage(null);
              return;
            }

            forgetPendingMediaUpload(uploadId);
            uploadNotFoundSinceRef.current.delete(uploadId);
            setPendingUploadIds((current) =>
              current.filter((id) => id !== uploadId),
            );
            if (job.status === "SUCCEEDED") {
              setSelected(job.media);
              setReload((current) => current + 1);
              setUploadRecoveryError(null);
              setUploadRecoveryMessage(
                `Upload completed: ${job.media.original_filename}.`,
              );
            } else {
              setUploadRecoveryMessage(null);
              setUploadRecoveryError(
                "The server could not process this upload. Select the file and try again.",
              );
            }
          } catch (error: unknown) {
            if (!active) return;
            if (error instanceof ApiResponseError && error.status === 404) {
              const now = Date.now();
              const notFoundSince =
                uploadNotFoundSinceRef.current.get(uploadId) ?? now;
              uploadNotFoundSinceRef.current.set(uploadId, notFoundSince);
              if (now - notFoundSince < UPLOAD_JOB_NOT_FOUND_GRACE_MS) return;

              uploadNotFoundSinceRef.current.delete(uploadId);
              forgetPendingMediaUpload(uploadId);
              setPendingUploadIds((current) =>
                current.filter((id) => id !== uploadId),
              );
              setUploadRecoveryError(
                "No server-side upload was found. The transfer may have been interrupted; select the file and try again.",
              );
              return;
            }
            setUploadRecoveryError(
              error instanceof Error
                ? `Unable to check upload status: ${error.message}`
                : "Unable to check upload status. Please try again.",
            );
          }
        }),
      );

      if (active) {
        timer = window.setTimeout(() => {
          void checkPendingUploads();
        }, 2000);
      }
    }

    void checkPendingUploads();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [pendingUploadIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setOffset(0);
      setQuery(queryInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    let active = true;
    void listManagedMedia({
      offset,
      limit: PAGE_SIZE,
      kind: kind || undefined,
      query,
      unusedOnly,
    })
      .then((data) => {
        if (active) setState({ requestId, status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof ApiResponseError && error.status === 404
            ? MEDIA_ENDPOINT_NOT_FOUND_MESSAGE
            : error instanceof Error
              ? error.message
              : "Unable to load the media library. Please try again.";
        setState({
          requestId,
          status: "error",
          message,
        });
      });

    return () => {
      active = false;
    };
  }, [offset, kind, query, unusedOnly, reload, requestId]);

  useEffect(() => {
    let active = true;
    void getMediaStorageSummary()
      .then((data) => {
        if (active) setStorageState({ requestId: reload, status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStorageState({
          requestId: reload,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load storage usage. Please try again.",
        });
      });

    return () => {
      active = false;
    };
  }, [reload]);

  function refreshLibrary(media?: MediaItem) {
    if (media) setSelected(media);
    setReload((current) => current + 1);
  }

  function trackUpload(uploadId: string) {
    setUploadRecoveryMessage(null);
    setUploadRecoveryError(null);
    setDuplicatePrompt(null);
    setPendingUploadIds((current) =>
      current.includes(uploadId) ? current : [...current, uploadId],
    );
  }

  function finishUpload(media: MediaItem, uploadId: string) {
    uploadNotFoundSinceRef.current.delete(uploadId);
    refreshLibrary(media);
    if (media.duplicate_checksum && media.duplicate_media_id) {
      setUploadRecoveryMessage(null);
      void getManagedMedia(media.duplicate_media_id)
        .then((existing) => {
          setDuplicatePrompt({ uploadId, uploaded: media, existing });
          setPendingUploadIds((current) =>
            current.filter((id) => id !== uploadId),
          );
        })
        .catch((error: unknown) => {
          setUploadRecoveryError(
            error instanceof Error
              ? `The matching file was found, but its details couldn’t be loaded: ${error.message}`
              : "The matching file was found, but its details couldn’t be loaded.",
          );
        });
      return;
    }
    forgetPendingMediaUpload(uploadId);
    setPendingUploadIds((current) =>
      current.filter((id) => id !== uploadId),
    );
    if (media.duplicate_checksum) {
      setUploadRecoveryError(
        "This upload matches existing media, but the matching item could not be identified. The new copy was kept.",
      );
      return;
    }
    setUploadRecoveryMessage(`Upload completed: ${media.original_filename}.`);
  }

  async function handleUseExistingDuplicate() {
    if (!duplicatePrompt) return;
    setIsChoosingExisting(true);
    setUploadRecoveryError(null);
    try {
      await deleteMedia(duplicatePrompt.uploaded.id);
      forgetPendingMediaUpload(duplicatePrompt.uploadId);
      setSelected(duplicatePrompt.existing);
      setReload((current) => current + 1);
      setDuplicatePrompt(null);
      setUploadRecoveryMessage(
        `Using the existing file. The newly uploaded copy of ${duplicatePrompt.uploaded.original_filename} was removed.`,
      );
    } catch (error: unknown) {
      setUploadRecoveryError(
        error instanceof Error
          ? error.message
          : "Unable to remove the new copy. It was kept in the library.",
      );
    } finally {
      setIsChoosingExisting(false);
    }
  }

  function keepDuplicateCopy() {
    if (!duplicatePrompt) return;
    const filename = duplicatePrompt.uploaded.original_filename;
    forgetPendingMediaUpload(duplicatePrompt.uploadId);
    setSelected(duplicatePrompt.uploaded);
    setReload((current) => current + 1);
    setDuplicatePrompt(null);
    setUploadRecoveryMessage(`Keeping a separate copy of ${filename}.`);
  }

  function updateSelected(media: MediaItem) {
    setSelected(media);
    setReload((current) => current + 1);
  }

  async function openLargestFile(mediaId: string) {
    setOpeningStorageFileId(mediaId);
    setStorageFileError(null);
    try {
      const media = await getManagedMedia(mediaId);
      scrollToDetailsRef.current = true;
      setSelected(media);
    } catch (error: unknown) {
      setStorageFileError(
        error instanceof Error
          ? error.message
          : "Unable to load this file’s details.",
      );
    } finally {
      setOpeningStorageFileId(null);
    }
  }

  function removeSelected(mediaId: string) {
    setSelected((current) => (current?.id === mediaId ? null : current));
    setReload((current) => current + 1);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
            Your assets
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Media library
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            Keep the images, documents, and videos used across your projects in
            one place. Select an item to preview it, update its details, or see
            where it appears.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={
            isRestoringUploads ||
            pendingUploadIds.length > 0 ||
            duplicatePrompt !== null
          }
          type="button"
          onClick={() => setIsUploadOpen(true)}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          Upload media
        </button>
      </header>

      <dialog
        ref={uploadDialogRef}
        aria-labelledby="media-upload-heading"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60"
        onCancel={(event) => {
          event.preventDefault();
          setIsUploadOpen(false);
        }}
        onClose={() => setIsUploadOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsUploadOpen(false);
        }}
      >
        <MediaUploadForm
          onClose={() => setIsUploadOpen(false)}
          onUploadStarted={trackUpload}
          onUploaded={finishUpload}
          hasPendingUploads={
            pendingUploadIds.length > 0 || duplicatePrompt !== null
          }
        />
      </dialog>

      {pendingUploadIds.length > 0 && (
        <p
          className="mt-6 rounded-xl border border-border bg-surface p-4 text-sm"
          role="status"
        >
          An upload is still processing on the server. This page can be
          refreshed safely; it will reconnect to the same upload. Wait for it
          to finish before starting another upload.
        </p>
      )}
      {uploadRecoveryError && (
        <p
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
          role="alert"
        >
          {uploadRecoveryError}
        </p>
      )}
      {duplicatePrompt && (
        <dialog
          ref={duplicateDialogRef}
          aria-labelledby="media-duplicate-heading"
          className="m-auto w-[calc(100vw-2rem)] max-w-lg rounded-2xl border border-amber-300 bg-amber-50 p-0 text-amber-950 shadow-2xl backdrop:bg-black/60 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50"
          onCancel={(event) => {
            event.preventDefault();
            keepDuplicateCopy();
          }}
        >
          <div className="grid gap-5 p-6 sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200">
                Possible duplicate
              </p>
              <h2
                id="media-duplicate-heading"
                className="mt-2 text-lg font-semibold"
              >
                This file is already in your library
              </h2>
              <p className="mt-2 text-sm leading-6">
                {duplicatePrompt.uploaded.original_filename} matches{" "}
                {duplicatePrompt.existing.title ||
                  duplicatePrompt.existing.original_filename}
                . Choose whether to use the existing item or keep this upload.
              </p>
            </div>
            <div className="rounded-xl border border-amber-300/70 bg-white/50 p-3 text-sm dark:border-amber-800 dark:bg-black/10">
              <p className="font-medium">Use existing</p>
              <p className="mt-1 text-xs leading-5">
                Removes only the newly uploaded copy. The existing library item
                is kept.
              </p>
            </div>
            {uploadRecoveryError && (
              <p className="text-sm" role="alert">
                {uploadRecoveryError}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                className="min-h-11 rounded-full border border-current px-5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isChoosingExisting}
                type="button"
                onClick={keepDuplicateCopy}
              >
                Keep both
              </button>
              <button
                className="min-h-11 rounded-full bg-amber-950 px-5 py-2 text-sm font-medium text-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-50 dark:text-amber-950"
                disabled={isChoosingExisting}
                type="button"
                onClick={() => void handleUseExistingDuplicate()}
              >
                {isChoosingExisting ? "Removing copy…" : "Use existing"}
              </button>
            </div>
          </div>
        </dialog>
      )}
      {uploadRecoveryMessage && (
        <div
          className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm"
          role="status"
        >
          <p>{uploadRecoveryMessage}</p>
          <button
            aria-label="Dismiss upload message"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-background hover:text-foreground"
            type="button"
            onClick={() => setUploadRecoveryMessage(null)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}

      <StorageOverview
        state={visibleStorageState}
        selectedMediaId={selected?.id ?? null}
        openingFileId={openingStorageFileId}
        error={storageFileError}
        onOpenFile={(mediaId) => void openLargestFile(mediaId)}
        onRetry={() => setReload((current) => current + 1)}
      />

      <div
        className={`mt-6 grid min-w-0 gap-6 ${
          selected
            ? "xl:grid-cols-[minmax(0,1.65fr)_minmax(21rem,0.9fr)] xl:items-start"
            : ""
        }`}
      >
        <section
          aria-labelledby="media-library-heading"
          className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="media-library-heading" className="text-lg font-semibold">
                Library
              </h2>
              <p className="mt-1 text-sm text-muted">
                {visibleState.status === "ready"
                  ? `${visibleState.data.total} asset${visibleState.data.total === 1 ? "" : "s"}`
                  : "Browse and manage your uploaded files"}
              </p>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(12rem,1fr)_auto_auto]">
              <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted">
                Find a file
                <input
                  className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                  placeholder="Name or title"
                  type="search"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted">
                Media type
                <select
                  className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                  value={kind}
                  onChange={(event) => {
                    setOffset(0);
                    setKind(event.target.value as "" | MediaKind);
                  }}
                >
                  {MEDIA_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-medium text-muted">
                Project usage
                <select
                  className="min-h-11 min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                  value={unusedOnly ? "unused" : "all"}
                  onChange={(event) => {
                    setOffset(0);
                    setSelected(null);
                    setUnusedOnly(event.target.value === "unused");
                  }}
                >
                  <option value="all">All files</option>
                  <option value="unused">Unused · largest first</option>
                </select>
                <span className="sr-only">
                  Unused files have no project assignment.
                </span>
              </label>
            </div>
          </div>

          {visibleState.status === "loading" && (
            <p className="py-12 text-center text-sm text-muted" role="status">
              Loading your library…
            </p>
          )}

          {visibleState.status === "error" && (
            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h3 className="font-semibold">We couldn’t load your library</h3>
                <p className="mt-1 text-sm leading-6">{visibleState.message}</p>
              </div>
              <button
                className="min-h-11 shrink-0 rounded-full border border-current px-5 py-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                type="button"
                onClick={() => setReload((current) => current + 1)}
              >
                Try again
              </button>
            </div>
          )}

          {visibleState.status === "ready" &&
            visibleState.data.media.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-base font-medium">
                  {unusedOnly && !query && !kind
                    ? "No unused media"
                    : query || kind || unusedOnly
                    ? "No files match your search"
                    : "Your media library is empty"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {unusedOnly && !query && !kind
                    ? "Every file is currently assigned to a project."
                    : query || kind || unusedOnly
                    ? "Try a different name or media type to find what you’re looking for."
                    : "Add an image, document, or video to start building your project library."}
                </p>
                {query || kind || unusedOnly ? (
                  <button
                    className="mt-5 min-h-11 rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-background"
                    type="button"
                    onClick={() => {
                      setQueryInput("");
                      setQuery("");
                      setKind("");
                      setUnusedOnly(false);
                      setOffset(0);
                    }}
                  >
                    Clear filters
                  </button>
                ) : (
                  <button
                    className="mt-5 min-h-11 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85"
                    type="button"
                    onClick={() => setIsUploadOpen(true)}
                  >
                    Upload your first file
                  </button>
                )}
              </div>
            )}

          {visibleState.status === "ready" &&
            visibleState.data.media.length > 0 && (
              <>
                <ul
                  className={`mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 ${
                    selected
                      ? "2xl:grid-cols-3"
                      : "xl:grid-cols-3 2xl:grid-cols-4"
                  }`}
                >
                  {visibleState.data.media.map((media) => (
                    <li key={media.id} className="min-w-0">
                      <MediaCard
                        media={media}
                        selected={selected?.id === media.id}
                        onSelect={() => setSelected(media)}
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted">
                    Showing {visibleState.data.offset + 1}–
                    {Math.min(
                      visibleState.data.offset +
                        visibleState.data.media.length,
                      visibleState.data.total,
                    )}{" "}
                    of {visibleState.data.total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="min-h-11 flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                      disabled={visibleState.data.offset === 0}
                      type="button"
                      onClick={() =>
                        setOffset(
                          Math.max(visibleState.data.offset - PAGE_SIZE, 0),
                        )
                      }
                    >
                      Previous
                    </button>
                    <button
                      className="min-h-11 flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                      disabled={
                        visibleState.data.offset +
                          visibleState.data.media.length >=
                        visibleState.data.total
                      }
                      type="button"
                      onClick={() =>
                        setOffset(
                          visibleState.data.offset + visibleState.data.limit,
                        )
                      }
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
        </section>

        {selected && (
          <div ref={selectedDetailsRef} className="min-w-0 scroll-mt-6">
            <MediaDetailsPanel
              key={`${selected.id}:${selected.updated_at}`}
              media={selected}
              onClose={() => setSelected(null)}
              onDeleted={removeSelected}
              onUpdated={updateSelected}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StorageOverview({
  state,
  selectedMediaId,
  openingFileId,
  error,
  onOpenFile,
  onRetry,
}: {
  state: StorageLoadState;
  selectedMediaId: string | null;
  openingFileId: string | null;
  error: string | null;
  onOpenFile: (mediaId: string) => void;
  onRetry: () => void;
}) {
  const summary = state.status === "ready" ? state.data : null;
  const largestFileSize = summary?.largest_files[0]?.size_bytes ?? 0;
  const hasLocalStorageMetrics = summary?.storage_provider === "local";

  return (
    <section
      aria-labelledby="media-storage-heading"
      className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Media library
          </p>
          <h2 id="media-storage-heading" className="mt-1 text-lg font-semibold">
            Storage overview
          </h2>
        </div>
        {summary && hasLocalStorageMetrics && (
          <p className="text-xs text-muted">
            {formatBytes(summary.filesystem_free_bytes)} free of{" "}
            {formatBytes(summary.filesystem_total_bytes)} on the media volume
          </p>
        )}
      </div>
      {summary?.storage_provider === "local" ? (
        <p className="mt-1 text-xs text-muted">
          Free space is measured on the filesystem storing media and may differ
          from a hosting provider’s quota.
        </p>
      ) : summary?.storage_provider === "supabase" ? (
        <p className="mt-1 text-xs text-muted">
          Supabase quota and exact usage (including video posters) are in the
          Supabase dashboard.
        </p>
      ) : null}

      {state.status === "loading" && (
        <p className="mt-4 text-sm text-muted" role="status">
          Loading storage usage…
        </p>
      )}

      {hasLocalStorageMetrics && summary?.is_low_storage && (
        <div
          className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50"
          role="alert"
        >
          <p className="font-semibold">Low media storage</p>
          <p className="mt-1 leading-5">
            Only {formatBytes(summary.filesystem_free_bytes)} (
            {summary.filesystem_free_percent.toFixed(1)}%) is free. The warning
            threshold is {summary.warning_threshold_free_percent}% free. Remove
            unused files or add storage, checking each file’s usage first.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert">{state.message}</p>
          <button
            className="min-h-11 shrink-0 rounded-full border border-current px-4 py-2 font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            type="button"
            onClick={onRetry}
          >
            Try again
          </button>
        </div>
      )}

      {summary && (
        <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <div className="flex items-end justify-between gap-4 rounded-xl bg-foreground px-5 py-4 text-background">
              <div>
                <p className="text-xs font-medium text-background/70">
                  {summary.storage_provider === "supabase"
                    ? "Catalogued file size"
                    : "Total used"}
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {formatBytes(summary.size_bytes)}
                </p>
              </div>
              <span className="mb-1 shrink-0 rounded-full bg-background/15 px-3 py-1 text-xs font-medium">
                {summary.item_count}{" "}
                {summary.item_count === 1 ? "file" : "files"}
              </span>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold">By type</h3>
              <ul className="mt-3 grid gap-4">
                {summary.categories.map((category) => {
                  const percentage =
                    summary.size_bytes > 0
                      ? (category.size_bytes / summary.size_bytes) * 100
                      : 0;
                  return (
                    <li key={category.kind}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">
                          {STORAGE_CATEGORY_LABELS[category.kind]}
                          <span className="ml-2 text-xs font-normal text-muted">
                            {category.item_count}
                          </span>
                        </span>
                        <span className="shrink-0 text-muted">
                          {formatBytes(category.size_bytes)}{" "}
                          <span className="text-xs">
                            {formatPercentage(category.size_bytes, summary.size_bytes)}
                          </span>
                        </span>
                      </div>
                      <div
                        aria-label={`${STORAGE_CATEGORY_LABELS[category.kind]} share of storage`}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={Math.round(percentage)}
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"
                        role="progressbar"
                      >
                        <div
                          className={`h-full rounded-full ${STORAGE_CATEGORY_COLORS[category.kind]}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">Largest files</h3>
              <p className="text-xs text-muted">
                Top {summary.largest_files.length}
              </p>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {summary.largest_files.length > 0 ? (
              <ol className="mt-3 grid gap-3">
                {summary.largest_files.map((file, index) => {
                  const percentage =
                    largestFileSize > 0
                      ? (file.size_bytes / largestFileSize) * 100
                      : 0;
                  return (
                    <li key={file.id}>
                      <button
                        aria-label={`View details and usage for ${file.original_filename}`}
                        aria-pressed={selectedMediaId === file.id}
                        className={`group flex w-full min-w-0 items-center gap-3 rounded-xl text-left transition-colors hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                          selectedMediaId === file.id ? "bg-background/60" : ""
                        }`}
                        disabled={openingFileId !== null}
                        type="button"
                        onClick={() => onOpenFile(file.id)}
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-background text-xs font-semibold text-muted">
                          {openingFileId === file.id ? (
                            <span aria-hidden="true">…</span>
                          ) : (
                            String(index + 1).padStart(2, "0")
                          )}
                        </span>
                        <span className="min-w-0 flex-1 py-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-medium">
                              {file.title || file.original_filename}
                            </span>
                            <span className="shrink-0 text-sm font-medium">
                              {formatBytes(file.size_bytes)}
                            </span>
                          </span>
                          <span className="mt-1.5 flex items-center gap-2">
                            <span
                              aria-label={`Relative size of ${file.original_filename}`}
                              aria-valuemax={100}
                              aria-valuemin={0}
                              aria-valuenow={Math.round(percentage)}
                              className="h-1 flex-1 overflow-hidden rounded-full bg-background"
                              role="progressbar"
                            >
                              <span
                                className="block h-full rounded-full bg-foreground/60"
                                style={{ width: `${percentage}%` }}
                              />
                            </span>
                            <span className="shrink-0 text-xs text-muted">
                              {openingFileId === file.id
                                ? "Opening…"
                                : STORAGE_CATEGORY_LABELS[file.kind]}
                            </span>
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 pr-2 text-sm text-muted transition-transform group-hover:translate-x-0.5"
                        >
                          →
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-3 rounded-lg bg-background px-3 py-4 text-sm text-muted">
                Your largest files will appear here after an upload.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function MediaCard({
  media,
  selected,
  onSelect,
}: {
  media: MediaItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = useAdminMediaAsset(
    media.id,
    media.kind === "VIDEO"
      ? media.poster_url
        ? "poster"
        : null
      : media.kind === "IMAGE"
        ? "content"
        : null,
  );
  const hasImagePreview = media.kind === "IMAGE" || Boolean(media.poster_url);

  return (
    <button
      aria-pressed={selected}
      className={`group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border text-left transition-colors ${
        selected
          ? "border-foreground bg-background"
          : "border-border bg-background hover:border-muted"
      }`}
      type="button"
      onClick={onSelect}
    >
      <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden bg-soft-surface">
        {hasImagePreview && preview.status === "ready" ? (
          <Image
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            height={media.height ?? 480}
            src={preview.url}
            unoptimized
            width={media.width ?? 640}
          />
        ) : hasImagePreview && preview.status === "loading" ? (
          <span className="text-sm text-muted" role="status">
            Loading preview…
          </span>
        ) : hasImagePreview && preview.status === "error" ? (
          <span className="px-3 text-center text-sm text-red-600" role="alert">
            Preview unavailable
          </span>
        ) : (
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            {media.kind === "VIDEO" ? "Video preview" : "Document"}
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium">
          {media.kind.toLowerCase()}
        </span>
      </div>
      <span className="flex min-w-0 flex-1 flex-col p-3">
        <span className="truncate text-sm font-medium">
          {media.title || media.original_filename}
        </span>
        <span className="mt-1 truncate text-xs text-muted">
          {media.original_filename}
        </span>
        <span className="mt-3 text-xs text-muted">
          {formatBytes(media.size_bytes)}
          {media.width && media.height
            ? ` · ${media.width} × ${media.height}`
            : ""}
        </span>
      </span>
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatPercentage(bytes: number, totalBytes: number): string {
  if (totalBytes === 0 || bytes === 0) return "0%";
  const percentage = (bytes / totalBytes) * 100;
  return percentage < 1 ? "<1%" : `${Math.round(percentage)}%`;
}
