"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { PageBlock, PageRevision } from "@/features/pages/api/page-types";

type PageRevisionHistoryProps = {
  revisions: readonly PageRevision[];
  currentRevisionId: string | null;
  hasSavedDraft: boolean;
  hasUnsavedChanges: boolean;
  isBusy: boolean;
  isRefreshing: boolean;
  historyError: string | null;
  onRefresh: () => void;
  onLoadRevision: (revision: PageRevision) => void;
  onPreviewRevision: (revision: PageRevision) => void;
};

function revisionStateLabel(revision: PageRevision, isCurrent: boolean): string {
  if (isCurrent) return "Editing";
  if (revision.state === "SUPERSEDED") return "Historical";
  return revision.state.toLowerCase();
}

function revisionDate(revision: PageRevision): string {
  return new Date(
    revision.published_at ?? revision.created_at,
  ).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function blockDescription(block: PageBlock): string {
  if (block.type === "HERO") {
    return (
      [
        block.headline,
        block.subline,
        block.button?.label ? `Action: ${block.button.label}` : null,
        block.media_id ? "Image selected" : null,
      ]
        .filter(Boolean)
        .join(" · ") || "No hero content"
    );
  }
  if (block.type === "MARKDOWN") {
    const text = block.body
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~>#]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    return text
      ? text.length > 420
        ? `${text.slice(0, 417)}…`
        : text
      : "No writing added";
  }
  if (block.type === "SKILLS") {
    return `${block.heading} · ${block.skills.length} ${
      block.skills.length === 1 ? "skill" : "skills"
    } with proficiency`;
  }
  return block.mode === "FEATURED"
    ? `Featured projects · up to ${block.limit}`
    : `${block.project_ids.length} selected projects · up to ${block.limit}`;
}

function blockLabel(block: PageBlock): string {
  if (block.type === "HERO") return "Hero";
  if (block.type === "MARKDOWN") return "Writing";
  if (block.type === "SKILLS") return "Skills";
  return "Project grid";
}

export function PageRevisionHistory({
  revisions,
  currentRevisionId,
  hasSavedDraft,
  hasUnsavedChanges,
  isBusy,
  isRefreshing,
  historyError,
  onRefresh,
  onLoadRevision,
  onPreviewRevision,
}: PageRevisionHistoryProps) {
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(
    null,
  );
  const [confirmReplace, setConfirmReplace] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const selectedRevision =
    revisions.find((revision) => revision.id === selectedRevisionId) ?? null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selectedRevision && !dialog.open) dialog.showModal();
    if (!selectedRevision && dialog.open) dialog.close();
  }, [selectedRevision]);

  function closePreview() {
    setSelectedRevisionId(null);
    setConfirmReplace(false);
  }

  function loadSelectedRevision() {
    if (!selectedRevision) return;
    if (hasUnsavedChanges && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    onLoadRevision(selectedRevision);
    closePreview();
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              History
            </p>
            <h2 className="mt-1 font-semibold">Revision history</h2>
          </div>
          <button
            aria-label="Refresh revision history"
            className="min-h-9 rounded-lg border border-border px-2.5 text-xs transition-colors hover:bg-background disabled:opacity-50"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Open a revision to inspect its saved content. Loading it only changes
          the editor until you save.
        </p>
        {historyError && (
          <p className="mt-3 text-xs text-red-600" role="alert">
            {historyError}
          </p>
        )}
        <ol className="mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1">
          {revisions.map((revision) => {
            const isCurrent = revision.id === currentRevisionId;
            return (
              <li key={revision.id}>
                <button
                  aria-haspopup="dialog"
                  className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                    isCurrent
                      ? "border-accent/50 bg-accent/10"
                      : "border-border bg-background hover:border-foreground/30"
                  }`}
                  onClick={() => {
                    setConfirmReplace(false);
                    setSelectedRevisionId(revision.id);
                  }}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      Revision {revision.revision_number}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                        isCurrent
                          ? "bg-accent/20 text-foreground"
                          : "bg-soft-surface text-muted"
                      }`}
                    >
                      {revisionStateLabel(revision, isCurrent)}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium">
                    {revision.title}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted">
                    {revisionDate(revision)} · {revision.sections.length}{" "}
                    {revision.sections.length === 1 ? "section" : "sections"}
                  </span>
                  {revision.change_note && (
                    <span className="mt-2 block line-clamp-2 text-xs leading-5 text-muted">
                      {revision.change_note}
                    </span>
                  )}
                  <span className="mt-2 block text-xs font-semibold text-foreground">
                    View snapshot <span aria-hidden="true">→</span>
                  </span>
                </button>
              </li>
            );
          })}
          {revisions.length === 0 && (
            <li className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
              No revisions yet. Save or publish the page to start its history.
            </li>
          )}
        </ol>
      </section>

      <dialog
        aria-labelledby={headingId}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl overflow-hidden rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60"
        onCancel={(event) => {
          event.preventDefault();
          closePreview();
        }}
        onClose={closePreview}
        ref={dialogRef}
      >
        {selectedRevision && (
          <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-border bg-background px-5 py-4 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Snapshot · {selectedRevision.state.toLowerCase()}
                </p>
                <h2 className="mt-1 text-xl font-semibold" id={headingId}>
                  Revision {selectedRevision.revision_number}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Saved {revisionDate(selectedRevision)}
                </p>
              </div>
              <button
                aria-label="Close revision preview"
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border text-lg transition-colors hover:bg-surface"
                onClick={closePreview}
                type="button"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
              <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Page title
                </p>
                <h3 className="mt-2 break-words text-2xl font-semibold tracking-tight">
                  {selectedRevision.title}
                </h3>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                  Summary
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {selectedRevision.summary || "No summary in this revision."}
                </p>
                {selectedRevision.change_note && (
                  <p className="mt-4 rounded-xl bg-background px-3 py-2 text-sm leading-6">
                    <span className="font-semibold">Publish note: </span>
                    {selectedRevision.change_note}
                  </p>
                )}
              </div>

              <section className="mt-6" aria-labelledby={`${headingId}-sections`}>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Saved content
                    </p>
                    <h3
                      className="mt-1 text-lg font-semibold"
                      id={`${headingId}-sections`}
                    >
                      {selectedRevision.sections.length}{" "}
                      {selectedRevision.sections.length === 1
                        ? "section"
                        : "sections"}
                    </h3>
                  </div>
                  <span className="text-xs text-muted">
                    Schema v{selectedRevision.schema_version}
                  </span>
                </div>
                {selectedRevision.sections.length > 0 ? (
                  <ol className="mt-3 grid gap-3">
                    {selectedRevision.sections.map((block, index) => (
                      <li
                        className="rounded-2xl border border-border bg-surface p-4"
                        key={block.id}
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background font-mono text-xs font-semibold text-muted">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                              {blockLabel(block)}
                            </p>
                            <p className="mt-1 break-words text-sm leading-6">
                              {blockDescription(block)}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
                    This revision contains no page sections.
                  </p>
                )}
              </section>
            </div>

            <footer className="border-t border-border bg-background px-5 py-4 sm:px-7">
              {hasUnsavedChanges && (
                <p className="mb-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                  Loading this snapshot will replace the unsaved changes in the
                  editor.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-md text-xs leading-5 text-muted">
                  {hasSavedDraft
                    ? "Loading changes only the editor. Saving will update the existing draft; the live page stays unchanged."
                    : "Loading changes only the editor. Saving will create a private draft; the live page stays unchanged."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-surface"
                    onClick={() => {
                      onPreviewRevision(selectedRevision);
                      closePreview();
                    }}
                    type="button"
                  >
                    Preview as visitor
                  </button>
                  {confirmReplace && (
                    <button
                      className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium transition-colors hover:bg-surface"
                      onClick={() => setConfirmReplace(false)}
                      type="button"
                    >
                      Keep editing
                    </button>
                  )}
                  <button
                    className="min-h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-opacity hover:opacity-85"
                    disabled={isBusy}
                    onClick={loadSelectedRevision}
                    type="button"
                  >
                    {confirmReplace
                      ? "Replace unsaved changes"
                      : "Load into editor"}
                  </button>
                </div>
              </div>
            </footer>
          </div>
        )}
      </dialog>
    </>
  );
}
