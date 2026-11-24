"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { AdminPost } from "@/features/posts/api/post-types";
import { listManagedPosts } from "@/features/posts/api/posts-api";
import {
  listAllManagedProjects,
  type ProjectSummary,
} from "@/features/projects/api/projects-api";
import {
  listManagedMedia,
  type MediaItem,
} from "@/features/media/api/media-api";
import {
  listAllAvailableTags,
  type Tag,
} from "@/features/taxonomy/api/taxonomy-api";
import {
  archivePage,
  createPage,
  discardPageDraft,
  getManagedPage,
  listAllManagedPages,
  listPageRevisions,
  publishPageDraft,
  republishPage,
  savePageDraft,
} from "@/features/pages/api/pages-api";
import type {
  PageBlock,
  PageDetail,
  PageDraftInput,
  PageRevision,
  PageStatus,
} from "@/features/pages/api/page-types";
import { PageComposer } from "@/features/pages/components/page-composer";
import {
  PagePreviewDialog,
  type PagePreviewContent,
} from "@/features/pages/components/page-preview-dialog";
import { PageRevisionHistory } from "@/features/pages/components/page-revision-history";
import { slugFromName, validateSlug } from "@/features/taxonomy/slug";

type PageForm = {
  slug: string;
  title: string;
  summary: string;
  sections: PageBlock[];
  slugManuallyEdited: boolean;
};

type EditorData = {
  page: PageDetail | null;
  pages: Awaited<ReturnType<typeof listAllManagedPages>>;
  projects: ProjectSummary[];
  posts: AdminPost[];
  images: MediaItem[];
  tags: Tag[];
  revisions: PageRevision[];
};

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; data: EditorData };

const EMPTY_FORM: PageForm = {
  slug: "",
  title: "",
  summary: "",
  sections: [],
  slugManuallyEdited: false,
};

function formFromPage(page: PageDetail | null): PageForm {
  const revision = page?.draft_revision ?? page?.published_revision;
  return {
    slug: page?.slug ?? "",
    title: revision?.title ?? "",
    summary: revision?.summary ?? "",
    sections: revision?.sections ?? [],
    slugManuallyEdited: Boolean(page),
  };
}

function statusLabel(status: PageStatus): string {
  return status.toLowerCase();
}

function pagePath(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

function validateForm(form: PageForm): string[] {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Enter a page title.");
  if (form.title.trim().length > 200) {
    errors.push("Page titles can be at most 200 characters.");
  }
  const slugError = validateSlug(form.slug, 120);
  if (slugError) errors.push(slugError);
  if (form.summary.trim().length > 300) {
    errors.push("Summaries can be at most 300 characters.");
  }
  for (const [index, block] of form.sections.entries()) {
    if (block.type === "HERO" && !block.headline.trim()) {
      errors.push(`Enter a headline for Hero block ${index + 1}.`);
    }
    if (
      block.type === "HERO" &&
      block.button &&
      !block.button.label.trim()
    ) {
      errors.push(`Add a label to the button in Hero block ${index + 1}.`);
    }
    if (
      block.type === "PROJECT_GRID" &&
      block.mode === "MANUAL" &&
      block.project_ids.length === 0
    ) {
      errors.push(`Choose at least one project for block ${index + 1}.`);
    }
    if (
      block.type === "PROJECT_GRID" &&
      (block.limit < 1 || block.limit > 12)
    ) {
      errors.push(`Set a project limit between 1 and 12 in block ${index + 1}.`);
    }
    if (block.type === "SKILLS") {
      if (!block.heading.trim()) {
        errors.push(`Add a heading to Skills block ${index + 1}.`);
      }
      if (block.skills.length === 0) {
        errors.push(`Add at least one skill to Skills block ${index + 1}.`);
      }
      if (block.skills.length > 40) {
        errors.push(`Skills block ${index + 1} can contain at most 40 skills.`);
      }
      const names = new Set<string>();
      for (const skill of block.skills) {
        const name = skill.name.trim().toLowerCase();
        if (!name) {
          errors.push(`Enter a name for each skill in block ${index + 1}.`);
        } else if (names.has(name)) {
          errors.push(`Use each skill name only once in block ${index + 1}.`);
        }
        names.add(name);
      }
    }
  }
  return errors;
}

async function loadAllManagedPosts(): Promise<AdminPost[]> {
  const posts: AdminPost[] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await listManagedPosts(offset, 100);
    posts.push(...result.posts);
    total = result.total;
    if (result.posts.length === 0 && offset < total) {
      throw new Error("The post service returned an incomplete list.");
    }
    offset += result.posts.length;
  } while (offset < total);
  return posts;
}

async function loadAllImages(): Promise<MediaItem[]> {
  const images: MediaItem[] = [];
  let offset = 0;
  let total = 0;
  do {
    const result = await listManagedMedia({
      offset,
      limit: 100,
      kind: "IMAGE",
    });
    images.push(...result.media);
    total = result.total;
    if (result.media.length === 0 && offset < total) {
      throw new Error("The media service returned an incomplete image list.");
    }
    offset += result.media.length;
  } while (offset < total);
  return images;
}

export function PageEditorPage({ pageId }: { pageId?: string }) {
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const requestId = `${pageId ?? "new"}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };
  const [form, setForm] = useState<PageForm>(EMPTY_FORM);
  const [changeNote, setChangeNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [previewContent, setPreviewContent] =
    useState<PagePreviewContent | null>(null);

  useEffect(() => {
    let active = true;
    async function loadEditor() {
      setPreviewContent(null);
      try {
        const [page, pages, projects, posts, images, tags] = await Promise.all([
          pageId ? getManagedPage(pageId) : Promise.resolve(null),
          listAllManagedPages(),
          listAllManagedProjects(),
          loadAllManagedPosts(),
          loadAllImages(),
          listAllAvailableTags(),
        ]);
        const revisions = page
          ? (await listPageRevisions(page.id)).revisions
          : [];
        if (!active) return;
        setForm(formFromPage(page));
        setChangeNote("");
        setErrorMessage(null);
        setSaveMessage(null);
        setHistoryError(null);
        setState({
          requestId,
          status: "ready",
          data: { page, pages, projects, posts, images, tags, revisions },
        });
      } catch (error: unknown) {
        if (!active) return;
        setState({
          requestId,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load the page editor.",
        });
      }
    }
    void loadEditor();
    return () => {
      active = false;
    };
  }, [pageId, reload, requestId]);

  function updateForm(values: Partial<PageForm>) {
    setForm((current) => ({ ...current, ...values }));
    setErrorMessage(null);
    setSaveMessage(null);
  }

  function addImageToLibrary(image: MediaItem) {
    setState((current) =>
      current.status === "ready" && current.requestId === requestId
        ? {
            ...current,
            data: {
              ...current.data,
              images: [
                image,
                ...current.data.images.filter(
                  (existing) => existing.id !== image.id,
                ),
              ],
            },
          }
        : current,
    );
  }

  async function persistDraft(): Promise<PageDetail | null> {
    const errors = validateForm(form);
    if (errors.length > 0) {
      setErrorMessage(errors.join(" "));
      return null;
    }
    if (visibleState.status !== "ready") return null;

    const input: PageDraftInput = {
      slug: form.slug,
      title: form.title,
      summary: form.summary.trim() || null,
      sections: form.sections,
    };
    let activePageId = pageId ?? visibleState.data.page?.id;
    if (!activePageId) {
      const created = await createPage({
        slug: form.slug,
        title: form.title,
      });
      activePageId = created.id;
      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              data: { ...current.data, page: created },
            }
          : current,
      );
    }
    const saved = await savePageDraft(activePageId, input);
    setForm(formFromPage(saved));
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            data: {
              ...current.data,
              page: saved,
              revisions: saved.draft_revision
                ? [
                    saved.draft_revision,
                    ...current.data.revisions.filter(
                      (revision) => revision.id !== saved.draft_revision?.id,
                    ),
                  ]
                : current.data.revisions,
              pages: current.data.pages.map((page) =>
                page.id === saved.id
                  ? {
                      ...page,
                      title: saved.title,
                      slug: saved.slug,
                      status: saved.status,
                      draft_revision_number: saved.draft_revision_number,
                    }
                  : page,
              ),
            },
          }
        : current,
    );
    return saved;
  }

  async function handleSave() {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);
    try {
      const saved = await persistDraft();
      if (saved) {
        if (!pageId) {
          router.replace(`/admin/pages/${encodeURIComponent(saved.id)}/edit`);
        }
        setSaveMessage("Draft saved. It is not public until published.");
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save this draft.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    setIsPublishing(true);
    setErrorMessage(null);
    setSaveMessage(null);
    const previousLiveRevisionId =
      visibleState.status === "ready"
        ? visibleState.data.page?.published_revision?.id
        : undefined;
    try {
      const saved = await persistDraft();
      if (!saved) return;
      const published = await publishPageDraft(saved.id, changeNote);
      setForm(formFromPage(published));
      setChangeNote("");
      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              data: {
                ...current.data,
                page: published,
                revisions: published.published_revision
                  ? [
                      published.published_revision,
                      ...current.data.revisions
                        .filter(
                          (revision) =>
                            revision.id !== published.published_revision?.id,
                        )
                        .map((revision) =>
                          revision.id === previousLiveRevisionId
                            ? {
                                ...revision,
                                state: "SUPERSEDED" as const,
                                superseded_at:
                                  published.published_revision?.published_at ??
                                  revision.superseded_at,
                              }
                            : revision,
                        ),
                    ]
                  : current.data.revisions,
              },
            }
          : current,
      );
      if (!pageId) {
        router.replace(`/admin/pages/${encodeURIComponent(published.id)}/edit`);
      }
      setSaveMessage("Page published.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to publish this page.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDiscard() {
    if (visibleState.status !== "ready" || !visibleState.data.page) return;
    const discardedDraftId = visibleState.data.page.draft_revision?.id;
    if (!window.confirm("Discard the current draft and keep the live page?")) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    setSaveMessage(null);
    try {
      const page = await discardPageDraft(visibleState.data.page.id);
      setForm(formFromPage(page));
      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              data: {
                ...current.data,
                page,
                revisions: current.data.revisions.filter(
                  (revision) => revision.id !== discardedDraftId,
                ),
              },
            }
          : current,
      );
      setSaveMessage("Draft discarded. The published page is unchanged.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to discard this draft.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (visibleState.status !== "ready" || !visibleState.data.page) return;
    if (!window.confirm("Archive this page? It can be republished later.")) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const page = await archivePage(visibleState.data.page.id);
      setState((current) =>
        current.status === "ready"
          ? { ...current, data: { ...current.data, page } }
          : current,
      );
      setSaveMessage("Page archived.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to archive this page.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRepublish() {
    if (visibleState.status !== "ready" || !visibleState.data.page) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const page = await republishPage(visibleState.data.page.id);
      setState((current) =>
        current.status === "ready"
          ? { ...current, data: { ...current.data, page } }
          : current,
      );
      setSaveMessage("Page is public again.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to republish this page.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleLoadRevision(revision: PageRevision) {
    setForm((current) => ({
      ...current,
      title: revision.title,
      summary: revision.summary ?? "",
      sections: revision.sections,
    }));
    setErrorMessage(null);
    setSaveMessage(
      `Revision ${revision.revision_number} loaded into the editor. Save draft to keep it; the live page is unchanged.`,
    );
  }

  async function refreshHistory() {
    if (visibleState.status !== "ready" || !visibleState.data.page) return;
    setIsRefreshingHistory(true);
    setHistoryError(null);
    try {
      const response = await listPageRevisions(visibleState.data.page.id);
      setState((current) =>
        current.status === "ready"
          ? {
              ...current,
              data: { ...current.data, revisions: response.revisions },
            }
          : current,
      );
    } catch (error: unknown) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Unable to refresh revision history.",
      );
    } finally {
      setIsRefreshingHistory(false);
    }
  }

  if (visibleState.status === "loading") {
    return (
      <p className="mx-auto max-w-4xl text-sm text-muted" role="status">
        Loading page editor…
      </p>
    );
  }
  if (visibleState.status === "error") {
    return (
      <div
        className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-700 dark:text-red-300"
        role="alert"
      >
        <p>{visibleState.message}</p>
        <button
          className="mt-3 font-semibold underline underline-offset-4"
          onClick={() => setReload((value) => value + 1)}
          type="button"
        >
          Try again
        </button>
      </div>
    );
  }

  const page = visibleState.data.page;
  const isNewPage = !page;
  const isSystemPage = page?.system_key !== null && page?.system_key !== undefined;
  const slugIsLocked = page !== null && page.status !== "DRAFT";
  const hasLiveRevision = page?.published_revision !== null && page !== null;
  const hasDraft = page?.draft_revision !== null && page !== null;
  const canPublish = isNewPage || Boolean(hasDraft);
  const savedRevision = page?.draft_revision ?? page?.published_revision;
  const currentRevision =
    page?.draft_revision ?? page?.published_revision ?? null;
  const currentRevisionLabel = page?.draft_revision
    ? "Draft · editing"
    : page?.published_revision
      ? page.status === "ARCHIVED"
        ? "Archived snapshot"
        : "Live"
      : "Not saved";
  const revisionTone = page?.draft_revision
    ? "border-amber-500/30 bg-amber-500/5"
    : page?.status === "ARCHIVED"
      ? "border-border bg-surface"
      : currentRevision
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "border-border bg-surface";
  const hasUnsavedChanges = page
    ? !savedRevision ||
      form.slug !== page.slug ||
      form.title !== savedRevision.title ||
      form.summary !== (savedRevision.summary ?? "") ||
      JSON.stringify(form.sections) !== JSON.stringify(savedRevision.sections)
    : Boolean(
        form.title.trim() ||
          form.slug.trim() ||
          form.summary.trim() ||
          form.sections.length,
      );
  const saveStateLabel = isSaving
    ? "Saving changes"
    : hasUnsavedChanges
      ? "Unsaved changes"
      : hasDraft
        ? "Draft saved"
        : hasLiveRevision
          ? "Live version"
          : "Ready to create";

  function previewCurrentPage() {
    setPreviewContent({
      label: hasUnsavedChanges
        ? "unsaved editor changes"
        : currentRevision
          ? `revision ${currentRevision.revision_number} · ${currentRevisionLabel}`
          : "new page",
      system_key: page?.system_key ?? null,
      slug: form.slug,
      title: form.title || page?.title || "Untitled page",
      summary: form.summary,
      sections: form.sections,
    });
  }

  function previewRevision(revision: PageRevision) {
    setPreviewContent({
      label: `revision ${revision.revision_number} · ${revision.state.toLowerCase()}`,
      system_key: page?.system_key ?? null,
      slug: page?.slug ?? form.slug,
      title: revision.title,
      summary: revision.summary ?? "",
      sections: revision.sections,
    });
  }

  return (
    <div className="mx-auto max-w-screen-2xl">
      <header className="mb-5">
        <Link
          className="inline-flex min-h-9 items-center gap-2 rounded-lg text-sm font-medium text-muted transition-colors hover:text-foreground"
          href="/admin/pages"
        >
          <span aria-hidden="true">←</span>
          Pages
          {!isNewPage && (
            <>
              <span aria-hidden="true" className="text-border">/</span>
              <span className="max-w-48 truncate text-foreground">{form.title || page.title}</span>
            </>
          )}
        </Link>
        <div className="relative mt-4 overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Page studio
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 break-words text-3xl font-semibold tracking-tight sm:text-4xl">
                  {isNewPage ? form.title || "New page" : form.title || page.title}
                </h1>
                {page && isSystemPage && (
                  <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                    System · {page.system_key}
                  </span>
                )}
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Shape the page with reusable blocks. Save a draft freely; publish only when ready.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-soft-surface disabled:opacity-50"
                disabled={isSaving || isPublishing}
                onClick={previewCurrentPage}
                type="button"
              >
                Preview
              </button>
              <div
                aria-label={
                  currentRevision
                    ? `Current revision ${currentRevision.revision_number}, ${currentRevisionLabel}`
                    : "No saved revision"
                }
                className={`flex min-w-52 items-center gap-3 rounded-2xl border px-3 py-2.5 ${revisionTone}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background font-mono text-sm font-bold">
                  {currentRevision ? `R${currentRevision.revision_number}` : "—"}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Current revision
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold">
                    {currentRevisionLabel}
                  </p>
                  {page?.draft_revision && page.published_revision ? (
                    <p className="mt-0.5 text-[11px] text-muted">
                      Live revision R{page.published_revision.revision_number}
                    </p>
                  ) : !currentRevision ? (
                    <p className="mt-0.5 text-[11px] text-muted">
                      Save to create revision 1
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-6">
        <div className="grid min-w-0 gap-5">
          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Page setup
                </p>
                <h2 className="mt-1 text-lg font-semibold">Details and address</h2>
              </div>
              {page?.published_at && (
                <span className="text-xs text-muted">
                  First published{" "}
                  {new Date(page.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-medium">
                Page title
                <input
                  autoComplete="off"
                  className="min-h-12 rounded-xl border border-border bg-background px-3 font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  maxLength={200}
                  onChange={(event) => {
                    const title = event.target.value;
                    updateForm({
                      title,
                      ...(!form.slugManuallyEdited
                        ? { slug: slugFromName(title) }
                        : {}),
                    });
                  }}
                  placeholder="For example, About me"
                  value={form.title}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                URL slug
                <input
                  autoComplete="off"
                  className="min-h-12 rounded-xl border border-border bg-background px-3 font-mono text-sm font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-60"
                  disabled={slugIsLocked || isSystemPage}
                  maxLength={120}
                  onChange={(event) =>
                    updateForm({
                      slug: event.target.value.toLowerCase(),
                      slugManuallyEdited: true,
                    })
                  }
                  placeholder="about-me"
                  value={form.slug}
                />
                <span className="flex flex-wrap items-center justify-between gap-2 text-xs font-normal">
                  <span className="text-muted">Public path</span>
                  <code className="rounded-md bg-soft-surface px-2 py-1 font-mono text-foreground">
                    {form.slug ? pagePath(form.slug) : "Set a page title"}
                  </code>
                </span>
                {(slugIsLocked || isSystemPage) && (
                  <span className="text-xs font-normal text-muted">
                    This path is locked until redirects are available.
                  </span>
                )}
              </label>
              <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
                Summary
                <textarea
                  className="min-h-24 resize-y rounded-xl border border-border bg-background px-3 py-2 font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  maxLength={300}
                  onChange={(event) => updateForm({ summary: event.target.value })}
                  placeholder="A short description for sharing and search previews"
                  value={form.summary}
                />
                <span className="text-right text-xs font-normal text-muted">
                  {form.summary.length}/300
                </span>
              </label>
            </div>
          </section>

          <PageComposer
            images={visibleState.data.images}
            onChange={(sections) => updateForm({ sections })}
            onImageAdded={addImageToLibrary}
            pages={visibleState.data.pages}
            posts={visibleState.data.posts}
            projects={visibleState.data.projects}
            sections={form.sections}
            systemKey={page?.system_key ?? null}
            tags={visibleState.data.tags}
          />

          {errorMessage && (
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              role="alert"
            >
              {errorMessage}
            </div>
          )}
          {saveMessage && (
            <p
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300"
              role="status"
            >
              {saveMessage}
            </p>
          )}
        </div>

        <aside className="grid gap-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Publishing
                </p>
                <h2 className="mt-1 font-semibold">Visibility</h2>
              </div>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {page ? statusLabel(page.status) : "new"}
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm font-semibold">
                  {page?.status === "PUBLISHED"
                    ? "Public"
                    : page?.status === "ARCHIVED"
                      ? "Archived"
                      : "Private draft"}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {page?.status === "PUBLISHED"
                    ? `Visible to visitors at ${pagePath(page.slug)}`
                    : page?.status === "ARCHIVED"
                      ? `Not visible to visitors at ${pagePath(page.slug)}`
                      : "Only visible to editors until published"}
                </p>
              </div>
              {page?.draft_revision && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Working draft
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Revision {page.draft_revision.revision_number}
                  </p>
                  {page.published_revision && (
                    <p className="mt-1 text-xs leading-5 text-muted">
                      The live page stays unchanged until you publish.
                    </p>
                  )}
                </div>
              )}
              {page?.status === "ARCHIVED" && (
                <p className="text-xs leading-5 text-muted">
                  This page is archived. Republish it to make it public again.
                </p>
              )}
            </div>
          </section>
          {page && (
            <PageRevisionHistory
              currentRevisionId={currentRevision?.id ?? null}
              hasSavedDraft={Boolean(hasDraft)}
              hasUnsavedChanges={hasUnsavedChanges}
              historyError={historyError}
              isBusy={isSaving || isPublishing}
              isRefreshing={isRefreshingHistory}
              onLoadRevision={handleLoadRevision}
              onPreviewRevision={previewRevision}
              onRefresh={() => void refreshHistory()}
              revisions={visibleState.data.revisions}
            />
          )}
        </aside>
      </div>

      <section className="mt-5 hidden rounded-2xl border border-border bg-surface p-4 md:block sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] sm:items-end">
            <div className="flex items-center gap-2 pb-2">
              <span
                aria-hidden="true"
                className={`size-2 shrink-0 rounded-full ${
                  hasUnsavedChanges
                    ? "bg-amber-500"
                    : hasDraft
                      ? "bg-emerald-500"
                      : "bg-muted"
                }`}
              />
              <p className="text-sm font-semibold">{saveStateLabel}</p>
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-muted">
              Publish note <span className="font-normal">(optional)</span>
              <input
                className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                maxLength={300}
                onChange={(event) => setChangeNote(event.target.value)}
                placeholder="What changed in this revision?"
                value={changeNote}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-background disabled:opacity-50"
              disabled={!hasUnsavedChanges || isSaving || isPublishing}
              onClick={() => void handleSave()}
              type="button"
            >
              {isSaving ? "Saving…" : "Save draft"}
            </button>
            <button
              className="min-h-11 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
              disabled={!canPublish || isSaving || isPublishing}
              onClick={() => void handlePublish()}
              type="button"
            >
              {isPublishing ? "Publishing…" : "Publish"}
            </button>
            {hasLiveRevision && hasDraft && (
              <button
                className="min-h-11 rounded-xl border border-border px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/5 disabled:opacity-50"
                disabled={isSaving || isPublishing}
                onClick={() => void handleDiscard()}
                type="button"
              >
                Discard draft
              </button>
            )}
            {page?.status === "PUBLISHED" && !isSystemPage && (
              <button
                className="min-h-11 rounded-xl border border-border px-3 text-sm font-medium text-muted transition-colors hover:bg-background disabled:opacity-50"
                disabled={isSaving || isPublishing}
                onClick={() => void handleArchive()}
                type="button"
              >
                Archive
              </button>
            )}
            {page?.status === "ARCHIVED" && !isSystemPage && (
              <button
                className="min-h-11 rounded-xl border border-border px-3 text-sm font-medium transition-colors hover:bg-background disabled:opacity-50"
                disabled={isSaving || isPublishing}
                onClick={() => void handleRepublish()}
                type="button"
              >
                Republish
              </button>
            )}
          </div>
          {!canPublish && !isNewPage && (
            <p className="text-xs text-muted lg:col-start-2">
              Make a change and save a draft before publishing.
            </p>
          )}
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-[68px] z-40 border-t border-border bg-surface/95 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
          <fieldset className="min-w-0">
            <legend className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
              Page status
            </legend>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1">
              <button
                aria-pressed={!page || page.status === "DRAFT"}
                className={`min-h-9 rounded-lg px-1 text-[10px] font-semibold ${
                  !page || page.status === "DRAFT"
                    ? "bg-foreground text-background"
                    : "text-muted"
                }`}
                disabled={isSaving || isPublishing}
                type="button"
                onClick={() => void handleSave()}
              >
                Draft
              </button>
              <button
                aria-pressed={page?.status === "PUBLISHED"}
                className={`min-h-9 rounded-lg px-1 text-[10px] font-semibold ${
                  page?.status === "PUBLISHED"
                    ? "bg-foreground text-background"
                    : "text-muted"
                }`}
                disabled={!canPublish || isSaving || isPublishing}
                type="button"
                onClick={() => void handlePublish()}
              >
                Publish
              </button>
              <button
                aria-pressed={page?.status === "ARCHIVED"}
                className={`min-h-9 rounded-lg px-1 text-[10px] font-semibold ${
                  page?.status === "ARCHIVED"
                    ? "bg-foreground text-background"
                    : "text-muted"
                }`}
                disabled={isSaving || isPublishing}
                type="button"
                onClick={() => {
                  if (page?.status === "ARCHIVED") {
                    void handleRepublish();
                  } else if (page) {
                    void handleArchive();
                  }
                }}
              >
                {page?.status === "ARCHIVED" ? "Restore" : "Archive"}
              </button>
            </div>
          </fieldset>
          <button
            className="mt-[18px] min-h-11 rounded-xl bg-foreground px-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSaving || isPublishing}
            type="button"
            onClick={() => void handleSave()}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <PagePreviewDialog
        content={previewContent}
        images={visibleState.data.images}
        onClose={() => setPreviewContent(null)}
        pages={visibleState.data.pages}
        posts={visibleState.data.posts}
        projects={visibleState.data.projects}
      />
    </div>
  );
}
