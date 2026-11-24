"use client";

import { useId, useRef, useState } from "react";

import { AdminMarkdownPreview } from "@/features/posts/components/admin-markdown-preview";
import { PostRichTextEditor } from "@/features/posts/components/post-rich-text-editor";
import type { PostAttachment } from "@/features/posts/api/post-types";
import { renderPageMarkdownPreview } from "@/features/pages/api/pages-api";

type EditorMode = "visual" | "source" | "preview";

type PreviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; html: string }
  | { status: "error"; message: string };

function modeButtonClass(active: boolean): string {
  return active
    ? "rounded-lg bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
    : "rounded-lg px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground";
}

export function PageMarkdownEditor({
  body,
  onChange,
}: {
  body: string;
  onChange: (body: string) => void;
}) {
  const [mode, setMode] = useState<EditorMode>("visual");
  const [previewState, setPreviewState] = useState<PreviewState>({
    status: "idle",
  });
  const [attachments, setAttachments] = useState<PostAttachment[]>([]);
  const previewRequest = useRef(0);
  const sourceId = useId();

  async function showPreview() {
    const requestId = ++previewRequest.current;
    setMode("preview");
    setPreviewState({ status: "loading" });
    try {
      const html = await renderPageMarkdownPreview(body);
      if (requestId === previewRequest.current) {
        setPreviewState({ status: "ready", html });
      }
    } catch (error: unknown) {
      if (requestId !== previewRequest.current) return;
      setPreviewState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to preview this Markdown block.",
      });
    }
  }

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <section
      aria-label="Markdown editor"
      className="overflow-hidden rounded-2xl border border-border bg-background"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-3 py-3 sm:px-4">
        <div>
          <p className="text-sm font-semibold">Markdown</p>
          <p className="mt-0.5 text-xs text-muted">
            {wordCount} {wordCount === 1 ? "word" : "words"} ·{" "}
            {body.length} characters
          </p>
        </div>
        <div
          aria-label="Markdown view"
          className="flex items-center rounded-xl border border-border bg-soft-surface p-1"
          role="group"
        >
          <button
            aria-pressed={mode === "visual"}
            className={modeButtonClass(mode === "visual")}
            onClick={() => setMode("visual")}
            type="button"
          >
            Visual
          </button>
          <button
            aria-pressed={mode === "source"}
            className={modeButtonClass(mode === "source")}
            onClick={() => setMode("source")}
            type="button"
          >
            Markdown
          </button>
          <button
            aria-pressed={mode === "preview"}
            className={modeButtonClass(mode === "preview")}
            onClick={() => void showPreview()}
            type="button"
          >
            Preview
          </button>
        </div>
      </header>

      {mode === "visual" && (
        <div className="p-3 sm:p-4">
          <PostRichTextEditor
            attachments={attachments}
            body={body}
            editorLabel="Page Markdown content"
            onAttachmentsChange={setAttachments}
            onBodyChange={onChange}
            placeholderText="Write your page content. Format text, add links, or insert images from your media library."
            showAttachments={false}
          />
        </div>
      )}

      {mode === "source" && (
        <div className="p-3 sm:p-4">
          <label className="sr-only" htmlFor={sourceId}>
            Markdown source
          </label>
          <textarea
            className="min-h-72 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 font-mono text-sm leading-7 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]"
            id={sourceId}
            onChange={(event) => onChange(event.target.value)}
            spellCheck={false}
            value={body}
          />
        </div>
      )}

      {mode === "preview" && (
        <div className="min-h-72 bg-background p-4 sm:p-7">
          {previewState.status === "loading" && (
            <p className="text-sm text-muted" role="status">
              Rendering page preview…
            </p>
          )}
          {previewState.status === "error" && (
            <p className="text-sm text-red-600" role="alert">
              {previewState.message}
            </p>
          )}
          {previewState.status === "ready" && previewState.html && (
            <AdminMarkdownPreview html={previewState.html} />
          )}
          {previewState.status === "ready" && !previewState.html && (
            <p className="text-sm text-muted">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
