"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  createProject,
  getManagedProject,
  getNextProjectDisplayOrder,
  updateProject,
  type ProjectDetail,
  type ProjectDevelopmentStatus,
  type ProjectStatus,
  type ProjectWriteInput,
} from "@/features/projects/api/projects-api";
import { ProjectMediaEditor } from "@/features/projects/components/project-media-editor";
import {
  listProjectMedia,
  type ProjectMediaItem,
} from "@/features/projects/api/project-media-api";
import {
  ProjectPreviewDialog,
  type ProjectPreviewCheck,
} from "@/features/projects/components/project-preview-dialog";
import { PostRichTextEditor } from "@/features/posts/components/post-rich-text-editor";
import { renderMarkdownPreview } from "@/features/posts/api/posts-api";
import {
  listAllAvailableCategories,
  listAllAvailableTags,
  type Category,
  type Tag,
} from "@/features/taxonomy/api/taxonomy-api";
import { slugFromName, validateSlug } from "@/features/taxonomy/slug";
import {
  listAllManagedResources,
  type ManagedResource,
} from "@/features/resources/api/resources-api";
import { ResourcePicker } from "@/features/resources/components/resource-picker";

type ProjectFormValues = {
  title: string;
  slug: string;
  slugManuallyEdited: boolean;
  shortDescription: string;
  overview: string;
  githubUrl: string;
  demoUrl: string;
  status: ProjectStatus;
  developmentStatus: ProjectDevelopmentStatus;
  isFeatured: boolean;
  categoryIds: string[];
  tagIds: string[];
  resourceIds: string[];
  displayOrder: number;
};

type ProjectFormErrors = Partial<
  Record<
    | "title"
    | "slug"
    | "shortDescription"
    | "githubUrl"
    | "demoUrl"
    | "categoryIds",
    string
  >
>;

type EditorData = {
  categories: Category[];
  tags: Tag[];
  resources: ManagedResource[];
  project: ProjectDetail | null;
  inactiveCategoryCount: number;
  inactiveTagCount: number;
};

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; data: EditorData };

type TaxonomyChoice = {
  id: string;
  name: string;
  parent_id?: string | null;
};

const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
];
const DEVELOPMENT_STATUSES: readonly ProjectDevelopmentStatus[] = [
  "PLANNING",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "CANCELLED",
];

function isProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUSES.some((status) => status === value);
}

function isDevelopmentStatus(
  value: string,
): value is ProjectDevelopmentStatus {
  return DEVELOPMENT_STATUSES.some((status) => status === value);
}

function readableStatus(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formValuesFromProject(
  project: ProjectDetail | null,
  displayOrder: number,
  categories: Category[],
  tags: Tag[],
): ProjectFormValues {
  const activeCategoryIds = new Set(categories.map((category) => category.id));
  const activeTagIds = new Set(tags.map((tag) => tag.id));

  return {
    title: project?.title ?? "",
    slug: project?.slug ?? "",
    slugManuallyEdited: Boolean(project),
    shortDescription: project?.short_description ?? "",
    overview: project?.overview ?? "",
    githubUrl: project?.github_url ?? "",
    demoUrl: project?.demo_url ?? "",
    status: project?.status ?? "DRAFT",
    developmentStatus: project?.development_status ?? "PLANNING",
    isFeatured: project?.is_featured ?? false,
    categoryIds:
      project?.category_ids.filter((id) => activeCategoryIds.has(id)) ?? [],
    tagIds: project?.tag_ids.filter((id) => activeTagIds.has(id)) ?? [],
    resourceIds: project?.resource_ids ?? [],
    displayOrder,
  };
}

function validateUrl(value: string, label: string): string | undefined {
  const urlValue = value.trim();
  if (!urlValue) return undefined;
  if (urlValue.length > 500) {
    return `${label} URLs can be at most 500 characters.`;
  }

  try {
    const url = new URL(urlValue);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "Use a URL that starts with http:// or https://.";
    }
  } catch {
    return `Enter a valid ${label.toLowerCase()} URL.`;
  }
  return undefined;
}

function validateForm(
  form: ProjectFormValues,
  inactiveCategoryCount: number,
): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  const title = form.title.trim();
  const shortDescription = form.shortDescription.trim();

  if (!title) {
    errors.title = "Enter a project title.";
  } else if (title.length > 200) {
    errors.title = "Project titles can be at most 200 characters.";
  }

  errors.slug = validateSlug(form.slug, 220) ?? undefined;
  if (!shortDescription) {
    errors.shortDescription = "Add a short description.";
  } else if (shortDescription.length > 300) {
    errors.shortDescription = "Descriptions can be at most 300 characters.";
  }

  errors.githubUrl = validateUrl(form.githubUrl, "GitHub");
  errors.demoUrl = validateUrl(form.demoUrl, "Demo");

  if (
    form.status === "PUBLISHED" &&
    form.categoryIds.length + inactiveCategoryCount === 0
  ) {
    errors.categoryIds = "Assign at least one category before publishing.";
  }

  return errors;
}

function statusHelp(status: ProjectStatus): string {
  if (status === "PUBLISHED") {
    return "Visible to visitors. A published project needs at least one category.";
  }
  if (status === "ARCHIVED") {
    return "Hidden from visitors and kept in the workspace as archived.";
  }
  return "Saved in the workspace but hidden from visitors.";
}

function optionalValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function writeInputFromForm(
  form: ProjectFormValues,
  existingProject: ProjectDetail | null,
): ProjectWriteInput {
  const now = new Date().toISOString();
  const publishedAt =
    form.status === "PUBLISHED"
      ? (existingProject?.published_at ?? now)
      : (existingProject?.published_at ?? null);
  const archivedAt =
    form.status === "ARCHIVED"
      ? (existingProject?.status === "ARCHIVED" &&
        existingProject.archived_at
        ? existingProject.archived_at
        : now)
      : null;

  return {
    title: form.title.trim(),
    slug: form.slug.trim(),
    short_description: form.shortDescription.trim(),
    development_status: form.developmentStatus,
    display_order: form.displayOrder,
    github_url: optionalValue(form.githubUrl),
    demo_url: optionalValue(form.demoUrl),
    overview: optionalValue(form.overview),
    status: form.status,
    published_at: publishedAt,
    archived_at: archivedAt,
    is_featured: form.isFeatured,
    category_ids: form.categoryIds,
    tag_ids: form.tagIds,
    resource_ids: form.resourceIds,
  };
}

function fieldError(
  field: keyof ProjectFormErrors,
  errors: ProjectFormErrors,
  touched: Partial<Record<keyof ProjectFormErrors, boolean>>,
  submitted: boolean,
): string | undefined {
  return submitted || touched[field] ? errors[field] : undefined;
}

function TaxonomyPicker({
  label,
  options,
  selectedIds,
  inactiveCount,
  error,
  onChange,
}: {
  label: string;
  options: TaxonomyChoice[];
  selectedIds: string[];
  inactiveCount: number;
  error?: string;
  onChange: (selectedIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const itemName = label === "Categories" ? "category" : "tag";
  const matchingOptions = options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const inputId = `${label.toLowerCase()}-search`;
  const errorId = `${label.toLowerCase()}-error`;

  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
      aria-invalid={Boolean(error)}
      className="min-w-0"
    >
      <legend className="mb-1 w-full text-sm font-medium">
        <span className="flex items-start justify-between gap-3">
          <span>{label}</span>
          <span className="text-xs font-normal text-muted">
            {selectedIds.length} selected
          </span>
        </span>
      </legend>
      <div>
        <span className="text-xs text-muted">
          {inactiveCount > 0
            ? `${inactiveCount} inactive assignment${inactiveCount === 1 ? "" : "s"} kept`
            : "Active entries only"}
        </span>
      </div>
      <label
        className="mt-3 grid gap-1.5 text-xs font-medium text-muted"
        htmlFor={inputId}
      >
        Search {label.toLowerCase()}
        <input
          id={inputId}
          className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
          placeholder={`Find a ${itemName}`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
        {matchingOptions.length === 0 ? (
          <p className="px-3 py-5 text-center text-sm text-muted">
            {options.length === 0
              ? `No active ${label.toLowerCase()} are available. Ask an administrator to add one.`
              : `No matching ${label.toLowerCase()}.`}
          </p>
        ) : (
          matchingOptions.map((option) => {
            const checked = selectedIds.includes(option.id);
            return (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:bg-soft-surface ${
                  option.parent_id ? "ml-4 border-l-border pl-4" : ""
                }`}
              >
                <input
                  checked={checked}
                  className="size-4 shrink-0 accent-foreground"
                  type="checkbox"
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...selectedIds, option.id]
                        : selectedIds.filter((id) => id !== option.id),
                    )
                  }
                />
                <span className="min-w-0 break-words">{option.name}</span>
              </label>
            );
          })
        )}
      </div>
      {inactiveCount > 0 && (
        <p className="mt-2 text-xs leading-5 text-muted">
          {inactiveCount} existing inactive {itemName}{" "}
          {inactiveCount === 1 ? "assignment is" : "assignments are"} kept when
          you save. Inactive entries cannot be newly assigned.
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-600" id={errorId}>
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function ProjectEditorPage({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const requestId = `${projectId ?? "new"}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };
  const [form, setForm] = useState<ProjectFormValues | null>(null);
  const [touched, setTouched] = useState<
    Partial<Record<keyof ProjectFormErrors, boolean>>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<ProjectMediaItem[]>([]);
  const [isPreviewMediaLoading, setIsPreviewMediaLoading] = useState(false);
  const [previewMediaError, setPreviewMediaError] = useState<string | null>(
    null,
  );
  const [previewOverviewHtml, setPreviewOverviewHtml] = useState("");
  const [isPreviewOverviewLoading, setIsPreviewOverviewLoading] =
    useState(false);
  const [previewOverviewError, setPreviewOverviewError] = useState<
    string | null
  >(null);
  const previewLoadIdRef = useRef(0);
  const isNewProject = !projectId;

  useEffect(() => {
    let active = true;

    async function loadEditor() {
      try {
        const [categories, tags, resources, project, nextDisplayOrder] =
          await Promise.all([
            listAllAvailableCategories(),
            listAllAvailableTags(),
            listAllManagedResources(),
            projectId ? getManagedProject(projectId) : Promise.resolve(null),
            projectId
              ? Promise.resolve(null)
              : getNextProjectDisplayOrder(),
          ]);

        if (!active) return;

        const displayOrder = project?.display_order ?? nextDisplayOrder ?? 0;
        const data: EditorData = {
          categories,
          tags,
          resources,
          project,
          inactiveCategoryCount: 0,
          inactiveTagCount: 0,
        };
        const selectedForm = formValuesFromProject(
          project,
          displayOrder,
          categories,
          tags,
        );
        data.inactiveCategoryCount =
          (project?.category_ids.length ?? 0) - selectedForm.categoryIds.length;
        data.inactiveTagCount =
          (project?.tag_ids.length ?? 0) - selectedForm.tagIds.length;

        setForm(selectedForm);
        setTouched({});
        setSubmitted(false);
        setSubmitError(null);
        setSaveMessage(null);
        setState({ requestId, status: "ready", data });
      } catch (error: unknown) {
        if (!active) return;
        setState({
          requestId,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load the project editor. Please try again.",
        });
      }
    }

    void loadEditor();
    return () => {
      active = false;
    };
  }, [projectId, reload, requestId]);

  if (visibleState.status === "loading") {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="py-12 text-center text-sm text-muted" role="status">
          Loading project editor…
        </p>
      </div>
    );
  }

  if (visibleState.status === "error") {
    return (
      <div className="mx-auto max-w-5xl">
        <Link
          className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          href="/admin/projects"
        >
          Back to projects
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
        Preparing project form…
      </p>
    );
  }

  const data = visibleState.data;
  const errors = validateForm(form, data.inactiveCategoryCount);
  const titleError = fieldError("title", errors, touched, submitted);
  const slugError = fieldError("slug", errors, touched, submitted);
  const descriptionError = fieldError(
    "shortDescription",
    errors,
    touched,
    submitted,
  );
  const githubUrlError = fieldError("githubUrl", errors, touched, submitted);
  const demoUrlError = fieldError("demoUrl", errors, touched, submitted);
  const categoryError = fieldError("categoryIds", errors, touched, submitted);

  function updateForm(values: Partial<ProjectFormValues>) {
    setForm((current) => (current ? { ...current, ...values } : current));
    setSubmitError(null);
    setSaveMessage(null);
  }

  function markTouched(field: keyof ProjectFormErrors) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setSubmitError(null);
    setSaveMessage(null);
    if (Object.values(errors).some(Boolean)) return;

    const formToSave = form;
    if (!formToSave) return;
    const input = writeInputFromForm(formToSave, data.project);
    setIsSaving(true);
    try {
      if (projectId) {
        const savedProject = await updateProject(projectId, input);
        setState((current) =>
          current.status === "ready"
            ? {
                ...current,
                data: { ...current.data, project: savedProject },
              }
            : current,
        );
        setSaveMessage("Project changes saved.");
      } else {
        const createdProject = await createProject(input);
        router.push(
          `/admin/projects/${encodeURIComponent(createdProject.id)}/edit`,
        );
      }
    } catch (error: unknown) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save the project. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function openPreview() {
    const formToPreview = form;
    if (!formToPreview) return;

    setIsPreviewOpen(true);
    setPreviewMedia([]);
    setPreviewMediaError(null);
    setPreviewOverviewHtml("");
    setPreviewOverviewError(null);
    setIsPreviewOverviewLoading(true);
    const requestId = ++previewLoadIdRef.current;

    const overviewPreview = renderMarkdownPreview(formToPreview.overview)
      .then((html) => {
        if (previewLoadIdRef.current === requestId) {
          setPreviewOverviewHtml(html);
        }
      })
      .catch((error: unknown) => {
        if (previewLoadIdRef.current === requestId) {
          setPreviewOverviewError(
            error instanceof Error
              ? error.message
              : "Unable to render the project overview preview.",
          );
        }
      })
      .finally(() => {
        if (previewLoadIdRef.current === requestId) {
          setIsPreviewOverviewLoading(false);
        }
      });

    if (!projectId) {
      setIsPreviewMediaLoading(false);
      await overviewPreview;
      return;
    }

    setIsPreviewMediaLoading(true);
    try {
      const media = await listProjectMedia(projectId);
      if (previewLoadIdRef.current === requestId) setPreviewMedia(media);
    } catch (error: unknown) {
      if (previewLoadIdRef.current === requestId) {
        setPreviewMediaError(
          error instanceof Error
            ? error.message
            : "Unable to load project media for the preview.",
        );
      }
    } finally {
      if (previewLoadIdRef.current === requestId) {
        setIsPreviewMediaLoading(false);
      }
    }
    await overviewPreview;
  }

  function closePreview() {
    previewLoadIdRef.current += 1;
    setIsPreviewOpen(false);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        href="/admin/projects"
      >
        <span aria-hidden="true">←</span> Back to projects
      </Link>
      <header className="relative mt-4 overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Workspace / Projects
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {isNewProject ? "Create project" : "Edit project"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              Add project details, presentation, links, and taxonomy.
            </p>
          </div>
          <div className="flex justify-start">
          <button
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-soft-surface active:translate-y-0 sm:px-4"
            type="button"
            onClick={() => void openPreview()}
          >
            <svg
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
              viewBox="0 0 24 24"
            >
              <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
            Preview
          </button>
          </div>
        </div>
      </header>

      <form
        id="project-editor-form"
        className="mt-5 grid min-w-0 gap-5"
        noValidate
        onSubmit={handleSubmit}
      >
        <section className="admin-editor-section min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Project details</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              The title and short description appear in project listings.
            </p>
          </div>

          <div className="grid gap-5">
            <label className="grid min-w-0 gap-2 text-sm font-medium">
              Project title
              <input
                autoComplete="off"
                aria-describedby={`project-title-hint${titleError ? " project-title-error" : ""}`}
                aria-invalid={Boolean(titleError)}
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={200}
                required
                value={form.title}
                onBlur={() => markTouched("title")}
                onChange={(event) => {
                  const title = event.target.value;
                  updateForm({
                    title,
                    ...(isNewProject && !form.slugManuallyEdited
                      ? { slug: slugFromName(title) }
                      : {}),
                  });
                }}
              />
              <span className="text-xs font-normal text-muted" id="project-title-hint">
                Required, up to 200 characters.
              </span>
              {titleError && (
                <span className="text-xs font-normal text-red-600" id="project-title-error">
                  {titleError}
                </span>
              )}
            </label>

            <div className="grid min-w-0 gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="project-slug">
                  Project URL slug
                </label>
                <button
                  className="text-xs font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
                  type="button"
                  onClick={() =>
                    updateForm({
                      slug: slugFromName(form.title),
                      slugManuallyEdited: false,
                    })
                  }
                >
                  Generate from title
                </button>
              </div>
              <input
                id="project-slug"
                autoComplete="off"
                aria-describedby={`project-slug-hint${slugError ? " project-slug-error" : ""}`}
                aria-invalid={Boolean(slugError)}
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={220}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
                spellCheck={false}
                value={form.slug}
                onBlur={() => markTouched("slug")}
                onChange={(event) =>
                  updateForm({
                    slug: event.target.value,
                    slugManuallyEdited: true,
                  })
                }
              />
              <span className="text-xs text-muted" id="project-slug-hint">
                Lowercase letters and numbers separated by single hyphens. Up
                to 220 characters.
              </span>
              {slugError && (
                <span className="text-xs text-red-600" id="project-slug-error">
                  {slugError}
                </span>
              )}
            </div>

            <label className="grid min-w-0 gap-2 text-sm font-medium">
              Short description
              <textarea
                aria-describedby={`project-description-hint${descriptionError ? " project-description-error" : ""}`}
                aria-invalid={Boolean(descriptionError)}
                className="min-h-24 w-full min-w-0 resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={300}
                required
                rows={3}
                value={form.shortDescription}
                onBlur={() => markTouched("shortDescription")}
                onChange={(event) =>
                  updateForm({ shortDescription: event.target.value })
                }
              />
              <span className="text-xs font-normal text-muted" id="project-description-hint">
                Required, up to 300 characters.
              </span>
              {descriptionError && (
                <span className="text-xs font-normal text-red-600" id="project-description-error">
                  {descriptionError}
                </span>
              )}
            </label>

            <div className="grid min-w-0 gap-2 text-sm font-medium">
              <span>Detailed overview</span>
              <PostRichTextEditor
                body={form.overview}
                editorLabel="Project detailed overview"
                inlineMediaKinds={["IMAGE", "VIDEO", "DOCUMENT"]}
                onBodyChange={(overview) => updateForm({ overview })}
                placeholderText="Tell the project story. Use the toolbar to format text, add code, links, lists, images, videos, and downloadable files."
                showAttachments={false}
              />
              <span className="text-xs font-normal text-muted">
                Use the toolbar to format the overview and insert images,
                videos, or downloadable files. Inserted media is saved with the
                project.
              </span>
            </div>
          </div>
        </section>

        <section className="admin-editor-section min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Status and presentation</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Publication status controls visitor visibility; development
              status describes progress.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-sm font-medium">
              Publication status
              <select
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                value={form.status}
                onChange={(event) => {
                  if (isProjectStatus(event.target.value)) {
                    updateForm({ status: event.target.value });
                  }
                }}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {readableStatus(status)}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal leading-5 text-muted">
                {statusHelp(form.status)}
              </span>
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-medium">
              Development status
              <select
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                value={form.developmentStatus}
                onChange={(event) => {
                  if (isDevelopmentStatus(event.target.value)) {
                    updateForm({ developmentStatus: event.target.value });
                  }
                }}
              >
                {DEVELOPMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {readableStatus(status)}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-muted">
                Shown as the project&apos;s current progress.
              </span>
            </label>

            <label className="flex min-h-14 items-start gap-3 rounded-xl border border-border p-3 text-sm font-medium sm:col-span-2">
              <input
                checked={form.isFeatured}
                className="mt-0.5 size-4 shrink-0 accent-foreground"
                type="checkbox"
                onChange={(event) =>
                  updateForm({ isFeatured: event.target.checked })
                }
              />
              <span>
                Feature this project
                <span className="mt-1 block font-normal leading-5 text-muted">
                  Marks it for featured placements. It does not change the
                  project&apos;s publication status.
                </span>
              </span>
            </label>

            <p className="text-xs leading-5 text-muted sm:col-span-2">
              {isNewProject
                ? `This project will be added after the current list (position ${form.displayOrder + 1}).`
                : `Current list position: ${form.displayOrder + 1}.`}
            </p>
          </div>
        </section>

        <section className="admin-editor-section min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Project links</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Add only links visitors should be able to open.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-sm font-medium">
              GitHub repository
              <input
                autoComplete="url"
                aria-describedby={`project-github-hint${githubUrlError ? " project-github-error" : ""}`}
                aria-invalid={Boolean(githubUrlError)}
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={500}
                placeholder="https://github.com/you/project"
                type="url"
                value={form.githubUrl}
                onBlur={() => markTouched("githubUrl")}
                onChange={(event) =>
                  updateForm({ githubUrl: event.target.value })
                }
              />
              <span className="text-xs font-normal text-muted" id="project-github-hint">
                Optional. Use a full http:// or https:// URL.
              </span>
              {githubUrlError && (
                <span className="text-xs font-normal text-red-600" id="project-github-error">
                  {githubUrlError}
                </span>
              )}
            </label>

            <label className="grid min-w-0 gap-2 text-sm font-medium">
              Live demo
              <input
                autoComplete="url"
                aria-describedby={`project-demo-hint${demoUrlError ? " project-demo-error" : ""}`}
                aria-invalid={Boolean(demoUrlError)}
                className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                maxLength={500}
                placeholder="https://example.com"
                type="url"
                value={form.demoUrl}
                onBlur={() => markTouched("demoUrl")}
                onChange={(event) =>
                  updateForm({ demoUrl: event.target.value })
                }
              />
              <span className="text-xs font-normal text-muted" id="project-demo-hint">
                Optional. Use a full http:// or https:// URL.
              </span>
              {demoUrlError && (
                <span className="text-xs font-normal text-red-600" id="project-demo-error">
                  {demoUrlError}
                </span>
              )}
            </label>
          </div>
        </section>

        <section className="admin-editor-section min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Categories and tags</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Categories describe the project area; tags describe its tools and
              topics. You can choose more than one.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <TaxonomyPicker
              label="Categories"
              options={data.categories}
              selectedIds={form.categoryIds}
              inactiveCount={data.inactiveCategoryCount}
              error={categoryError}
              onChange={(categoryIds) => {
                updateForm({ categoryIds });
                markTouched("categoryIds");
              }}
            />
            <TaxonomyPicker
              label="Tags"
              options={data.tags}
              selectedIds={form.tagIds}
              inactiveCount={data.inactiveTagCount}
              onChange={(tagIds) => updateForm({ tagIds })}
            />
            <div className="lg:col-span-2">
              <ResourcePicker
                resources={data.resources}
                selectedIds={form.resourceIds}
                onChange={(resourceIds) => updateForm({ resourceIds })}
              />
            </div>
          </div>
        </section>

        <div className="hidden rounded-2xl border border-border bg-surface p-4 lg:block lg:p-5">
          {submitError && (
            <p className="mb-4 text-sm text-red-600" role="alert">
              {submitError}
            </p>
          )}
          {saveMessage && (
            <p className="mb-4 text-sm text-foreground" role="status">
              {saveMessage}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end sm:gap-3">
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-soft-surface sm:w-auto"
              href="/admin/projects"
            >
              Cancel
            </Link>
            <button
              className="min-h-11 w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              disabled={isSaving}
              type="submit"
            >
              {isSaving
                ? "Saving…"
                : isNewProject
                  ? "Create project"
                  : "Save changes"}
            </button>
          </div>
        </div>
        <div className="fixed inset-x-0 bottom-[68px] z-40 border-t border-border bg-surface/95 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {submitError && (
            <p className="mb-1 truncate text-xs text-red-600" role="alert">
              {submitError}
            </p>
          )}
          {saveMessage && (
            <p className="mb-1 truncate text-xs text-foreground" role="status">
              {saveMessage}
            </p>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <fieldset className="min-w-0">
              <legend className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                Publication
              </legend>
              <div
                aria-label="Publication status"
                className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1"
                role="radiogroup"
              >
                {PROJECT_STATUSES.map((status) => {
                  const isSelected = form.status === status;
                  return (
                    <button
                      key={status}
                      aria-checked={isSelected}
                      className={`min-w-0 min-h-9 rounded-lg px-1 text-[11px] font-semibold transition-colors ${
                        isSelected
                          ? "bg-foreground text-background"
                          : "text-muted hover:bg-soft-surface hover:text-foreground"
                      }`}
                      role="radio"
                      type="button"
                      onClick={() => updateForm({ status })}
                    >
                      {status === "PUBLISHED"
                        ? "Publish"
                        : readableStatus(status)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <button
              className="mt-[18px] min-h-11 rounded-xl bg-foreground px-3 text-sm font-semibold text-background disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving}
              form="project-editor-form"
              type="submit"
            >
              {isSaving
                ? "Saving…"
                : isNewProject
                  ? "Create"
                  : "Save changes"}
            </button>
          </div>
        </div>
      </form>
      {projectId && data.project ? (
        <div className="mt-5">
          <ProjectMediaEditor
            projectId={projectId}
            projectStatus={data.project.status}
          />
        </div>
      ) : (
        <section className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Project media</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Save the project first to assign a cover, gallery items, or
            downloadable attachments. You can upload files in the{" "}
            <Link
              className="font-medium underline-offset-4 hover:underline"
              href="/admin/media"
            >
              media library
            </Link>
            .
          </p>
        </section>
      )}
      <ProjectPreviewDialog
        open={isPreviewOpen}
        onClose={closePreview}
        title={form.title}
        slug={form.slug}
        shortDescription={form.shortDescription}
        overview={form.overview}
        overviewHtml={previewOverviewHtml}
        overviewPreviewLoading={isPreviewOverviewLoading}
        overviewPreviewError={previewOverviewError}
        developmentStatus={form.developmentStatus}
        status={form.status}
        isFeatured={form.isFeatured}
        githubUrl={form.githubUrl}
        demoUrl={form.demoUrl}
        categories={data.categories
          .filter((category) => form.categoryIds.includes(category.id))
          .map((category) => category.name)}
        tags={data.tags
          .filter((tag) => form.tagIds.includes(tag.id))
          .map((tag) => tag.name)}
        checks={buildPreviewChecks(
          form,
          data.inactiveCategoryCount,
          previewMedia,
        )}
        media={previewMedia}
        mediaLoading={isPreviewMediaLoading}
        mediaError={previewMediaError}
      />
    </div>
  );
}

function buildPreviewChecks(
  form: ProjectFormValues,
  inactiveCategoryCount: number,
  media: ProjectMediaItem[],
): ProjectPreviewCheck[] {
  const validationErrors = validateForm(form, inactiveCategoryCount);
  const missingImageAltText = media
    .filter((item) => item.kind === "IMAGE" && !item.alt_text?.trim())
    .map((item) => item.title || item.original_filename);
  return [
    {
      label: "Project title",
      ready: Boolean(form.title.trim()),
      detail: form.title.trim() ? undefined : "Add a title.",
    },
    {
      label: "URL slug",
      ready: !validationErrors.slug,
      detail: validationErrors.slug,
    },
    {
      label: "Short description",
      ready: Boolean(form.shortDescription.trim()),
      detail: form.shortDescription.trim()
        ? undefined
        : "Add a short description.",
    },
    {
      label: "At least one category",
      ready: form.categoryIds.length + inactiveCategoryCount > 0,
      detail:
        form.categoryIds.length + inactiveCategoryCount > 0
          ? undefined
          : "A category is required before publishing.",
    },
    {
      label: "Alternative text for assigned images",
      ready: missingImageAltText.length === 0,
      detail:
        missingImageAltText.length > 0
          ? `Add alternative text to: ${missingImageAltText.join(", ")}.`
          : undefined,
    },
  ];
}
