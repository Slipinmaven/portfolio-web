"use client";

import { useEffect, useId, useRef } from "react";

import type { AdminPost } from "@/features/posts/api/post-types";
import type { MediaItem } from "@/features/media/api/media-api";
import type { PageBlock, PageSummary } from "@/features/pages/api/page-types";
import { AboutPageLayout } from "@/features/pages/components/about-page-layout";
import { PageBlockRenderer } from "@/features/pages/components/page-block-renderer";
import type { ProjectSummary } from "@/features/projects/api/projects-api";

export type PagePreviewContent = {
  label: string;
  system_key: PageSummary["system_key"];
  slug: string;
  title: string;
  summary: string;
  sections: PageBlock[];
};

function pagePath(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

export function PagePreviewDialog({
  content,
  images,
  pages,
  posts,
  projects,
  onClose,
}: {
  content: PagePreviewContent | null;
  images: readonly MediaItem[];
  pages: readonly PageSummary[];
  posts: readonly AdminPost[];
  projects: readonly ProjectSummary[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (content && !dialog.open) dialog.showModal();
    if (!content && dialog.open) dialog.close();
  }, [content]);

  return (
    <dialog
      aria-labelledby={headingId}
      className="m-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-6xl overflow-hidden rounded-3xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
    >
      {content && (
        <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Visitor preview · {content.label}
              </p>
              <h2
                className="mt-1 truncate text-base font-semibold sm:text-lg"
                id={headingId}
              >
                {content.title || "Untitled page"}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <code className="hidden rounded-lg bg-surface px-2.5 py-1.5 font-mono text-xs text-muted sm:block">
                {pagePath(content.slug)}
              </code>
              <button
                aria-label="Close page preview"
                className="grid size-10 place-items-center rounded-xl border border-border text-lg transition-colors hover:bg-surface"
                onClick={onClose}
                type="button"
              >
                ×
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
              {content.system_key === "ABOUT" ? (
                <AboutPageLayout
                  hasHero={content.sections.some(
                    (section) => section.type === "HERO",
                  )}
                  previewOnly
                  summary={content.summary || null}
                  title={content.title || "Untitled page"}
                >
                  <PageBlockRenderer
                    aboutPageSummary={content.summary || null}
                    aboutPageTitle={content.title || "Untitled page"}
                    images={images}
                    isAboutPage
                    pages={pages}
                    posts={posts}
                    previewOnly
                    projects={projects}
                    sections={content.sections}
                  />
                </AboutPageLayout>
              ) : (
                <>
                  {content.summary && (
                    <p className="mx-auto mb-8 max-w-3xl text-center text-base leading-7 text-muted sm:mb-12 sm:text-lg sm:leading-8">
                      {content.summary}
                    </p>
                  )}
                  <PageBlockRenderer
                    images={images}
                    pages={pages}
                    posts={posts}
                    previewOnly
                    projects={projects}
                    sections={content.sections}
                  />
                </>
              )}
            </div>
            <p className="border-t border-border bg-surface px-4 py-3 text-center text-xs text-muted">
              Preview only. Links are shown but won&apos;t navigate away from the editor.
            </p>
          </div>
        </div>
      )}
    </dialog>
  );
}
