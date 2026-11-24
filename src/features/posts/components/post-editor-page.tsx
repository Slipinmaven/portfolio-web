"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { listAllAvailableCategories, type Category } from "@/features/taxonomy/api/taxonomy-api";
import {
  listAllManagedProjects,
  type ProjectSummary,
} from "@/features/projects/api/projects-api";
import { slugFromName, validateSlug } from "@/features/taxonomy/slug";
import {
  createPost,
  getManagedPost,
  renderMarkdownPreview,
  updatePost,
} from "@/features/posts/api/posts-api";
import type {
  AdminPost,
  PostKind,
  PostAttachment,
  PostStatus,
} from "@/features/posts/api/post-types";
import { AdminMarkdownPreview } from "@/features/posts/components/admin-markdown-preview";
import { PostRichTextEditor } from "@/features/posts/components/post-rich-text-editor";
import {
  listAllManagedResources,
  type ManagedResource,
} from "@/features/resources/api/resources-api";
import { ResourcePicker } from "@/features/resources/components/resource-picker";

type PostFormValues = {
  kind: PostKind;
  title: string;
  slug: string;
  slugManuallyEdited: boolean;
  summary: string;
  body: string;
  categoryIds: string[];
  projectIds: string[];
  resourceIds: string[];
  attachments: PostAttachment[];
};

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | {
      requestId: string;
      status: "ready";
      post: AdminPost | null;
      categories: Category[];
      projects: ProjectSummary[];
      resources: ManagedResource[];
    };

function formFromPost(
  post: AdminPost,
  activeCategories: readonly Category[],
): PostFormValues {
  const activeCategoryIds = new Set(
    activeCategories.map((category) => category.id),
  );
  return {
    kind: post.kind,
    title: post.title,
    slug: post.slug,
    slugManuallyEdited: true,
    summary: post.summary ?? "",
    body: post.body,
    categoryIds: post.category_ids.filter((id) => activeCategoryIds.has(id)),
    projectIds: post.project_ids,
    resourceIds: post.resource_ids,
    attachments: post.attachments,
  };
}

function optionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validateForm(
  form: PostFormValues,
  targetStatus: PostStatus,
): string[] {
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Enter a title.");
  else if (form.title.trim().length > 200) {
    errors.push("Titles can be at most 200 characters.");
  }
  const slugError = validateSlug(form.slug, 220);
  if (slugError) errors.push(slugError);
  if (form.summary.trim().length > 300) {
    errors.push("Summaries can be at most 300 characters.");
  }
  if (targetStatus === "PUBLISHED" && form.kind === "ARTICLE") {
    if (!form.summary.trim()) {
      errors.push("Add a summary before publishing an article.");
    }
    if (form.categoryIds.length === 0) {
      errors.push("Assign at least one category before publishing an article.");
    }
  }
  return errors;
}

function kindLabel(kind: PostKind): string {
  return kind === "ARTICLE" ? "Article" : "Note";
}

function statusLabel(status: PostStatus): string {
  return status.toLowerCase();
}

export function PostEditorPage({ postId }: { postId?: string }) {
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const requestId = `${postId ?? "new"}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };
  const [form, setForm] = useState<PostFormValues | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const isNewPost = !postId;

  useEffect(() => {
    let active = true;
    async function loadEditor() {
      try {
        const [categories, projects, resources, post] = await Promise.all([
          listAllAvailableCategories(),
          listAllManagedProjects(),
          listAllManagedResources(),
          postId ? getManagedPost(postId) : Promise.resolve(null),
        ]);
        if (!active) return;

        const selectedForm = post
          ? formFromPost(post, categories)
          : {
              kind:
                new URLSearchParams(window.location.search).get("kind") ===
                "NOTE"
                  ? ("NOTE" as const)
                  : ("ARTICLE" as const),
              title: "",
              slug: "",
              slugManuallyEdited: false,
              summary: "",
              body: "",
              categoryIds: [],
              projectIds: [],
              resourceIds: [],
              attachments: [],
            };
        setForm(selectedForm);
        setPreviewHtml(null);
        setIsPreviewing(false);
        setSubmitError(null);
        setSaveMessage(null);
        setState({
          requestId,
          status: "ready",
          post,
          categories,
          projects,
          resources,
        });
      } catch (error: unknown) {
        if (!active) return;
        setState({
          requestId,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load the post editor.",
        });
      }
    }
    void loadEditor();
    return () => {
      active = false;
    };
  }, [postId, reload, requestId]);

  function updateForm(values: Partial<PostFormValues>) {
    setForm((current) => (current ? { ...current, ...values } : current));
    setSubmitError(null);
    setSaveMessage(null);
    if (values.body !== undefined) {
      setIsPreviewing(false);
      setPreviewHtml(null);
      setPreviewError(null);
    }
  }

  async function handlePreview() {
    if (!form) return;
    setIsPreviewLoading(true);
    setPreviewError(null);
    try {
      const html = await renderMarkdownPreview(form.body);
      setPreviewHtml(html);
      setIsPreviewing(true);
    } catch (error: unknown) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : "Unable to render the Markdown preview.",
      );
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function savePost(targetStatus: PostStatus) {
    if (!form) return;
    setSubmitError(null);
    setSaveMessage(null);
    const errors = validateForm(form, targetStatus);
    if (errors.length > 0) {
      setSubmitError(errors.join(" "));
      return;
    }

    setIsSaving(true);
    try {
      const content = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        summary: optionalValue(form.summary),
        body: form.body,
        category_ids: form.categoryIds,
        project_ids: form.projectIds,
        resource_ids: form.resourceIds,
        attachment_media_ids: form.attachments.map(
          (attachment) => attachment.media_id,
        ),
      };
      if (postId) {
        const savedPost = await updatePost(postId, {
          ...content,
          status: targetStatus,
        });
        setState((current) =>
          current.status === "ready"
            ? { ...current, post: savedPost }
            : current,
        );
        setForm(formFromPost(savedPost, data.categories));
        setSaveMessage(`Post ${statusLabel(savedPost.status)} and saved.`);
      } else {
        const createdPost = await createPost({
          ...content,
          kind: form.kind,
        });
        router.push(
          `/admin/posts/${encodeURIComponent(createdPost.id)}/edit`,
        );
      }
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the post. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isNewPost) {
      await savePost("DRAFT");
      return;
    }
    const currentPost =
      visibleState.status === "ready" ? visibleState.post : null;
    await savePost(currentPost?.status ?? "DRAFT");
  }

  if (visibleState.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="py-12 text-center text-sm text-muted" role="status">
          Loading post editor…
        </p>
      </div>
    );
  }

  if (visibleState.status === "error") {
    return (
      <div className="mx-auto max-w-5xl">
        <Link
          className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          href="/admin/posts"
        >
          Back to posts
        </Link>
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5 text-center sm:p-8">
          <p className="text-sm text-red-600" role="alert">
            {visibleState.message}
          </p>
          <button
            className="mt-4 min-h-11 rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-soft-surface"
            type="button"
            onClick={() => setReload((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <p className="py-12 text-center text-sm text-muted" role="status">
        Preparing post form…
      </p>
    );
  }

  const data = visibleState;
  const categorySet = new Set(form.categoryIds);
  const projectSet = new Set(form.projectIds);
  const slugLocked = Boolean(data.post?.published_at);

  return (
    <div className="mx-auto max-w-6xl">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Link
          className="font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          href="/admin/posts"
        >
          Posts
        </Link>
        <span aria-hidden="true" className="text-muted">/</span>
        <span aria-current="page" className="text-foreground">
          {isNewPost ? "New post" : "Edit post"}
        </span>
      </nav>
      <header className="relative mt-4 overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-background sm:size-12">
              <svg
                aria-hidden="true"
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-12.5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
                <path
                  d="M14 4v4h4M8.5 12h6M8.5 15.5h4"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {isNewPost ? "Content studio / Create" : "Content studio / Edit"}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {isNewPost
                  ? `Write a ${kindLabel(form.kind).toLowerCase()}`
                  : form.title || "Untitled post"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Shape the story, choose where it belongs, then preview before publishing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
              {kindLabel(form.kind)}
            </span>
            {data.post && (
              <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
                data.post.status === "PUBLISHED"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : data.post.status === "ARCHIVED"
                    ? "border-border bg-soft-surface text-muted"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}>
                {statusLabel(data.post.status)}
              </span>
            )}
            <button
              className="min-h-11 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-soft-surface"
              disabled={isPreviewLoading}
              type="button"
              onClick={() => void handlePreview()}
            >
              {isPreviewLoading ? "Rendering…" : "Preview"}
            </button>
          </div>
        </div>
      </header>

      <form id="post-editor-form" className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_360px] xl:items-start" onSubmit={handleSubmit}>
        <section className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6 xl:col-start-1 xl:row-start-1">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-soft-surface text-xs font-bold text-muted">
              01
            </span>
            <div>
              <h2 className="text-base font-semibold">Post details</h2>
              <p className="mt-0.5 text-xs text-muted">
                Set the title, URL, and introduction.
              </p>
            </div>
          </div>
          <div className="grid gap-5">
          {isNewPost ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Post type
              <select
                className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                value={form.kind}
                onChange={(event) =>
                  updateForm({
                    kind: event.target.value === "NOTE" ? "NOTE" : "ARTICLE",
                  })
                }
              >
                <option value="ARTICLE">Article</option>
                <option value="NOTE">Note</option>
              </select>
            </label>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Type</span>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase text-muted">
                {form.kind.toLowerCase()}
              </span>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Title
              <input
                autoComplete="off"
                className="min-h-12 rounded-lg border border-border bg-background px-3 text-base font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={200}
                required
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  updateForm({
                    title,
                    ...(!form.slugManuallyEdited
                      ? { slug: slugFromName(title) }
                      : {}),
                  });
                }}
              />
            </label>

            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              URL slug
              <input
                autoComplete="off"
                className="min-h-11 rounded-lg border border-border bg-background px-3 font-mono text-sm font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20 disabled:opacity-70"
                disabled={slugLocked}
                maxLength={220}
                required
                value={form.slug}
                onChange={(event) =>
                  updateForm({
                    slug: event.target.value,
                    slugManuallyEdited: true,
                  })
                }
              />
              <span className="text-xs font-normal text-muted">
                /{form.kind === "ARTICLE" ? "articles" : "notes"}/
                {form.slug || "your-post"}
                {slugLocked
                  ? " · Locked after first publication to keep its URL stable."
                  : ""}
              </span>
            </label>

            <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
              Summary
              <textarea
                className="min-h-24 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={300}
                placeholder={
                  form.kind === "ARTICLE"
                    ? "A short introduction shown in article listings"
                    : "Optional summary for this note"
                }
                value={form.summary}
                onChange={(event) =>
                  updateForm({ summary: event.target.value })
                }
              />
              <span className="text-xs font-normal text-muted">
                {form.summary.length}/300
                {form.kind === "ARTICLE" ? " · Required to publish" : " · Optional"}
              </span>
            </label>
          </div>
          </div>
        </section>

        <div className="grid min-w-0 items-start gap-4 xl:col-start-2 xl:row-start-1">
          <fieldset className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <legend className="text-sm font-semibold">
              <span>Categories</span>
              <span className="ml-2 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted">
                {form.categoryIds.length} selected
              </span>
              {form.kind === "ARTICLE" && (
                <span className="ml-2 text-xs font-normal text-muted">
                  At least one is required to publish an article.
                </span>
              )}
            </legend>
            {data.categories.length > 0 ? (
              <div className="mt-3 grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
                {data.categories.map((category) => (
                  <label
                    key={category.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      categorySet.has(category.id)
                        ? "border-accent/50 bg-accent/10"
                        : "border-transparent hover:bg-soft-surface"
                    }`}
                  >
                    <input
                      checked={categorySet.has(category.id)}
                      className="size-4 shrink-0 accent-foreground"
                      type="checkbox"
                      onChange={(event) =>
                        updateForm({
                          categoryIds: event.target.checked
                            ? [...form.categoryIds, category.id]
                            : form.categoryIds.filter(
                                (id) => id !== category.id,
                              ),
                        })
                      }
                    />
                    <span className="min-w-0 break-words">{category.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted">
                No active categories are available. An administrator can add
                them from the Categories page.
              </p>
            )}
          </fieldset>

          <fieldset className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
            <legend className="text-sm font-semibold">
              <span>Related projects</span>
              <span className="ml-2 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted">
                {form.projectIds.length} selected
              </span>
            </legend>
            <p className="mt-1 text-xs text-muted">
              Optional. Draft projects can be linked here, but only published
              projects appear on the public post.
            </p>
            {data.projects.length > 0 ? (
              <div className="mt-3 grid max-h-56 gap-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
                {data.projects.map((project) => (
                  <label
                    key={project.id}
                    className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      projectSet.has(project.id)
                        ? "border-accent/50 bg-accent/10"
                        : "border-transparent hover:bg-soft-surface"
                    }`}
                  >
                    <input
                      checked={projectSet.has(project.id)}
                      className="mt-1 size-4 shrink-0 accent-foreground"
                      type="checkbox"
                      onChange={(event) =>
                        updateForm({
                          projectIds: event.target.checked
                            ? [...form.projectIds, project.id]
                            : form.projectIds.filter(
                                (id) => id !== project.id,
                              ),
                        })
                      }
                    />
                    <span className="min-w-0">
                      <span className="block break-words font-medium">
                        {project.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {project.status.toLowerCase()}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted">
                No projects are available to link.
              </p>
            )}
          </fieldset>
        </div>

        <div className="min-w-0 xl:col-start-2 xl:row-start-2">
          <ResourcePicker
            resources={data.resources}
            selectedIds={form.resourceIds}
            onChange={(resourceIds) => updateForm({ resourceIds })}
          />
        </div>

        <section
          aria-labelledby="post-body-heading"
          className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6 xl:col-start-1 xl:row-start-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="post-body-heading" className="text-base font-semibold">
                Write the post
              </h2>
              <p className="mt-1 text-xs text-muted">
                Format your content visually; it is saved as Markdown.
              </p>
            </div>
            <div
              aria-label="Editor mode"
              className="flex rounded-xl border border-border bg-background p-1"
              role="group"
            >
              <button
                aria-pressed={!isPreviewing}
                className={`min-h-9 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  !isPreviewing
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
                type="button"
                onClick={() => setIsPreviewing(false)}
              >
                Write
              </button>
              <button
                aria-pressed={isPreviewing}
                className={`min-h-9 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
                  isPreviewing
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
                disabled={isPreviewLoading}
                type="button"
                onClick={() => void handlePreview()}
              >
                {isPreviewLoading ? "Rendering…" : "Preview"}
              </button>
            </div>
          </div>
          {previewError && (
            <p
              className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100"
              role="alert"
            >
              {previewError}
            </p>
          )}
          {isPreviewing && previewHtml !== null ? (
            <div className="mt-4 min-h-64 overflow-hidden rounded-2xl border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
                <div>
                  <p className="text-sm font-semibold">Rendered preview</p>
                  <p className="mt-0.5 text-xs text-muted">
                    This is how the Markdown will appear to readers.
                  </p>
                </div>
                <span className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Preview
                </span>
              </div>
              <div className="p-4 sm:p-6">
                <AdminMarkdownPreview html={previewHtml} />
              </div>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background">
              <PostRichTextEditor
                attachments={form.attachments}
                body={form.body}
                onAttachmentsChange={(attachments) =>
                  updateForm({ attachments })
                }
                onBodyChange={(body) => updateForm({ body })}
              />
            </div>
          )}
        </section>

        {submitError && (
          <p className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100" role="alert">
            {submitError}
          </p>
        )}
        {saveMessage && (
          <p className="mt-5 text-sm text-foreground" role="status">
            {saveMessage}
          </p>
        )}

        <div className="mt-4 hidden flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3 md:flex md:col-span-2 sm:p-4">
          <p className="text-xs text-muted">
            {data.post
              ? `Created ${new Date(data.post.created_at).toLocaleDateString()}`
              : "New posts are saved as drafts first."}
          </p>
          <div className="flex flex-wrap gap-2">
            {isNewPost ? (
              <button
                className="min-h-11 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "Saving…" : "Create draft"}
              </button>
            ) : (
              <>
                <button
                  className="min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-soft-surface disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving
                    ? "Saving…"
                    : data.post?.status === "PUBLISHED"
                      ? "Save published changes"
                      : data.post?.status === "ARCHIVED"
                        ? "Save archived changes"
                        : "Save draft"}
                </button>
                {data.post?.status !== "ARCHIVED" && (
                  <button
                    className="min-h-11 rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSaving}
                    type="button"
                    onClick={() => void savePost("PUBLISHED")}
                  >
                    {isSaving
                      ? "Saving…"
                      : data.post?.status === "PUBLISHED"
                        ? "Save & publish"
                        : "Publish"}
                  </button>
                )}
                {data.post?.status !== "DRAFT" && (
                  <button
                    className="min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-soft-surface disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSaving}
                    type="button"
                    onClick={() => void savePost("DRAFT")}
                  >
                    {data.post?.status === "PUBLISHED"
                      ? "Unpublish"
                      : "Restore to draft"}
                  </button>
                )}
                {data.post?.status !== "ARCHIVED" && (
                  <button
                    className="min-h-11 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950"
                    disabled={isSaving}
                    type="button"
                    onClick={() => void savePost("ARCHIVED")}
                  >
                    Archive
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-[68px] z-40 border-t border-border bg-surface/95 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <fieldset className="min-w-0">
              <legend className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Status
              </legend>
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1">
                {(["DRAFT", "PUBLISHED", "ARCHIVED"] as const).map((status) => {
                  const isSelected = status === (data.post?.status ?? "DRAFT");
                  return (
                    <button
                      key={status}
                      aria-pressed={isSelected}
                      className={`min-h-9 min-w-0 rounded-lg px-1 text-[10px] font-semibold transition-colors ${
                        isSelected
                          ? "bg-foreground text-background"
                          : "text-muted hover:bg-soft-surface hover:text-foreground"
                      }`}
                      disabled={isSaving}
                      type="button"
                      onClick={() => {
                        if (!isNewPost) void savePost(status);
                      }}
                    >
                      {status === "PUBLISHED"
                        ? "Publish"
                        : status === "DRAFT"
                          ? "Draft"
                          : "Archive"}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button
              className="mt-[18px] min-h-11 rounded-xl bg-foreground px-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              form="post-editor-form"
              type="submit"
            >
              {isSaving ? "Saving…" : isNewPost ? "Create" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
