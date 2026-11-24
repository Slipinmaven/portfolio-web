"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { ApiResponseError } from "@/lib/api/api-errors";
import {
  MEDIA_ENDPOINT_NOT_FOUND_MESSAGE,
  rememberPendingMediaUpload,
  uploadMedia,
  type MediaItem,
  type MediaKind,
} from "@/features/media/api/media-api";

const MEDIA_FILE_ACCEPT: Record<MediaKind, string[]> = {
  IMAGE: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
  DOCUMENT: [".pdf", ".zip"],
  VIDEO: [".mp4", ".mov", ".webm", ".avi"],
};

const MEDIA_KIND_LABEL: Record<MediaKind, string> = {
  IMAGE: "Images",
  DOCUMENT: "PDF or ZIP documents",
  VIDEO: "Short videos",
};

const MEDIA_SIZE_GUIDANCE: Record<MediaKind, string> = {
  IMAGE: "Images up to 10 MB",
  DOCUMENT: "PDF or ZIP documents up to 25 MB",
  VIDEO: "Videos up to 50 MB and 60 seconds",
};

export function MediaUploadForm({
  onUploaded,
  onUploadStarted,
  onClose,
  hasPendingUploads,
  allowedKinds,
  acceptedImageExtensions,
}: {
  onUploaded: (media: MediaItem, uploadId: string) => void;
  onUploadStarted: (uploadId: string) => void;
  onClose: () => void;
  hasPendingUploads: boolean;
  allowedKinds?: MediaKind[];
  acceptedImageExtensions?: string[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSeconds, setProcessingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const acceptedKinds = allowedKinds ?? ["IMAGE", "DOCUMENT", "VIDEO"];
  const acceptedFiles =
    acceptedImageExtensions?.join(",") ??
    acceptedKinds.flatMap((kind) => MEDIA_FILE_ACCEPT[kind]).join(",");
  const acceptedLabel = acceptedImageExtensions
    ? `${acceptedImageExtensions
        .map((extension) => extension.replace(".", "").toUpperCase())
        .join(", ")} images`
    : acceptedKinds.map((kind) => MEDIA_KIND_LABEL[kind]).join(", ");

  useEffect(() => {
    if (!isUploading || !isProcessing) return;
    const timer = window.setInterval(
      () => setProcessingSeconds((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [isUploading, isProcessing]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    setError(null);
    setMessage(null);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setIsProcessing(false);
    setProcessingSeconds(0);
    try {
      const uploadId = crypto.randomUUID();
      rememberPendingMediaUpload(uploadId);
      onUploadStarted(uploadId);
      const uploaded = await uploadMedia({
        uploadId,
        file,
        title,
        altText,
        onProgress: (percent) => {
          if (percent === null) {
            setIsProcessing(true);
          } else {
            setUploadProgress(percent);
            setIsProcessing(false);
          }
        },
      });
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setTitle("");
      setAltText("");
      onUploaded(uploaded, uploadId);
      setMessage(
        uploaded.duplicate_checksum
          ? "A matching file was found. Choose whether to use the existing item or keep this copy."
          : "Media uploaded successfully.",
      );
      if (uploaded.duplicate_checksum) onClose();
    } catch (uploadError: unknown) {
      setError(
        uploadError instanceof ApiResponseError && uploadError.status === 404
          ? MEDIA_ENDPOINT_NOT_FOUND_MESSAGE
          : uploadError instanceof Error
            ? uploadError.message
            : "Unable to upload this file. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section
      aria-labelledby="media-upload-heading"
      className="rounded-3xl bg-surface p-5 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="media-upload-heading" className="text-lg font-semibold">
            Add media
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Choose a file to add it to your library. You can include a title or
            accessible description if you need one.
          </p>
        </div>
        <button
          aria-label="Close upload dialog"
          className="min-h-11 shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-background"
          type="button"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background px-5 py-6 text-center transition-colors hover:border-muted focus-within:border-[var(--focus-ring)] focus-within:ring-2 focus-within:ring-[var(--focus-ring)]/20">
          <input
            ref={fileInput}
            accept={acceptedFiles}
            className="sr-only"
            type="file"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
              setError(null);
              setMessage(null);
              if (file && file.name !== nextFile?.name) {
                setAltText("");
                if (title === file.name) setTitle(nextFile?.name ?? "");
              } else if (!title && nextFile) {
                setTitle(nextFile.name);
              }
            }}
          />
          <span className="grid size-10 place-items-center rounded-full bg-soft-surface text-xl">
            <span aria-hidden="true">↑</span>
          </span>
          <span className="font-medium">
            {file ? "Choose a different file" : "Choose a file"}
          </span>
          <span className="text-sm text-muted">
            {acceptedLabel}
          </span>
        </label>

        {file && (
          <>
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="mt-1 text-xs text-muted">
                  {file.type || "File ready for upload"}
                </p>
              </div>
              <button
                className="min-h-10 shrink-0 rounded-full px-3 text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
                type="button"
                onClick={() => {
                  setFile(null);
                  setTitle("");
                  setAltText("");
                  setError(null);
                  setMessage(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                Remove
              </button>
            </div>

            <details className="rounded-xl border border-border bg-background">
              <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
                Optional details
                <span className="ml-2 font-normal text-muted">
                  Title and accessible text
                </span>
              </summary>
              <div className="grid gap-4 border-t border-border p-4">
                <label className="grid gap-2 text-sm font-medium">
                  Library title
                  <input
                    autoComplete="off"
                    className="min-h-11 min-w-0 rounded-lg border border-border bg-surface px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                    maxLength={200}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <span className="text-xs font-normal text-muted">
                    Defaults to the uploaded filename.
                  </span>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Alternative text
                  <textarea
                    className="min-h-24 min-w-0 resize-y rounded-lg border border-border bg-surface px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                    maxLength={500}
                    value={altText}
                    onChange={(event) => setAltText(event.target.value)}
                  />
                  <span className="text-xs font-normal text-muted">
                    Describe the image for screen readers. Required before an
                    image can be used in a published project.
                  </span>
                </label>
              </div>
            </details>
          </>
        )}

        <p className="text-xs leading-5 text-muted">
          {acceptedKinds.map((kind) => MEDIA_SIZE_GUIDANCE[kind]).join(", ")}.
          File type is checked from its contents.
        </p>

        {error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-foreground" role="status">
            {message}
          </p>
        )}
        {isUploading && (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p role="status" aria-live="polite">
                {isProcessing
                  ? "Upload sent. Waiting for server processing…"
                  : "Uploading file…"}
              </p>
              {!isProcessing && (
                <span aria-hidden="true" className="tabular-nums text-muted">
                  {uploadProgress}%
                </span>
              )}
              {isProcessing && (
                <span className="shrink-0 tabular-nums text-muted">
                  Elapsed{" "}
                  {`${Math.floor(processingSeconds / 60)}:${String(
                    processingSeconds % 60,
                  ).padStart(2, "0")}`}
                </span>
              )}
            </div>
            {isProcessing ? (
              <span
                aria-hidden="true"
                className="size-4 animate-spin rounded-full border-2 border-border border-t-foreground"
              />
            ) : (
              <div
                aria-label="File upload progress"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={uploadProgress}
                className="h-2 overflow-hidden rounded-full bg-soft-surface"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-foreground transition-[width] duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
        <button
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:justify-self-start"
          disabled={isUploading || hasPendingUploads || !file}
          type="submit"
        >
          {isUploading ? "Processing upload…" : "Add to library"}
        </button>
      </form>
    </section>
  );
}
