"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useAdminRole } from "@/features/admin/components/admin-role-context";
import {
  createTag,
  deleteTag,
  listAllManagedTags,
  updateTag,
  type Tag,
  type TagInput,
} from "@/features/taxonomy/api/taxonomy-api";
import {
  slugFromName,
  validateName,
  validateSlug,
} from "@/features/taxonomy/slug";

type TagFormValues = {
  name: string;
  slug: string;
  slugManuallyEdited: boolean;
  description: string;
  is_active: boolean;
};

type TagStatusFilter = "all" | "active" | "inactive";
type TagSortOrder = "name-asc" | "name-desc";

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; tags: Tag[] };

const EMPTY_FORM: TagFormValues = {
  name: "",
  slug: "",
  slugManuallyEdited: false,
  description: "",
  is_active: false,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The tag could not be saved. Please try again.";
}

export function TagManagementPage() {
  const role = useAdminRole();
  const [reload, setReload] = useState(0);
  const requestId = String(reload);
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };
  const [form, setForm] = useState<TagFormValues | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TagStatusFilter>("all");
  const [sortOrder, setSortOrder] = useState<TagSortOrder>("name-asc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, slug: false });
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (role !== "admin") return;

    let active = true;
    void listAllManagedTags()
      .then((tags) => {
        if (active) setState({ requestId, status: "ready", tags });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            requestId,
            status: "error",
            message: getErrorMessage(error),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [requestId, role]);

  useEffect(() => {
    if (notice?.kind !== "success") return;

    const timeoutId = window.setTimeout(() => {
      setNotice((current) =>
        current?.kind === "success" ? null : current,
      );
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setConfirmDeleteId(null);
    setTouched({ name: false, slug: false });
    setSubmitted(false);
    setNotice(null);
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setForm({
      name: tag.name,
      slug: tag.slug,
      slugManuallyEdited: true,
      description: tag.description ?? "",
      is_active: tag.is_active,
    });
    setTouched({ name: false, slug: false });
    setSubmitted(false);
    setNotice(null);
    setConfirmDeleteId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSubmitted(true);

    const nameError = validateName(form.name);
    const slugError = validateSlug(form.slug);
    setTouched({ name: true, slug: true });
    if (nameError || slugError) return;

    const input: TagInput = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    };

    setIsSubmitting(true);
    setNotice(null);
    try {
      if (editingId) {
        await updateTag(editingId, input);
        setNotice({ kind: "success", message: "Tag updated." });
      } else {
        await createTag(input);
        setQuery("");
        setStatusFilter("all");
        setNotice({ kind: "success", message: "Tag created." });
      }
      setForm(null);
      setEditingId(null);
      setReload((current) => current + 1);
    } catch (error) {
      setNotice({ kind: "error", message: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(tag: Tag) {
    setDeletingId(tag.id);
    setNotice(null);
    try {
      await deleteTag(tag.id);
      setConfirmDeleteId(null);
      setNotice({ kind: "success", message: "Tag deleted." });
      setReload((current) => current + 1);
    } catch (error) {
      setNotice({ kind: "error", message: getErrorMessage(error) });
    } finally {
      setDeletingId(null);
    }
  }

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Tags</h1>
        <p className="mt-4 text-muted" role="alert">
          Tag management is available to administrators only.
        </p>
      </main>
    );
  }

  const nameError = form ? validateName(form.name) : null;
  const slugError = form ? validateSlug(form.slug) : null;
  const tags = visibleState.status === "ready" ? visibleState.tags : [];
  const activeCount = tags.filter((tag) => tag.is_active).length;
  const inactiveCount = tags.length - activeCount;
  const statusOptions: {
    value: TagStatusFilter;
    label: string;
    count: number;
  }[] = [
    { value: "all", label: "All", count: tags.length },
    { value: "active", label: "Active", count: activeCount },
    { value: "inactive", label: "Inactive", count: inactiveCount },
  ];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTags = tags
    .filter((tag) => {
      if (statusFilter === "active" && !tag.is_active) return false;
      if (statusFilter === "inactive" && tag.is_active) return false;
      if (!normalizedQuery) return true;
      return [tag.name, tag.slug, tag.description ?? ""].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    })
    .sort((left, right) => {
      const nameOrder = left.name.localeCompare(right.name);
      return sortOrder === "name-asc" ? nameOrder : -nameOrder;
    });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
            Catalog
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Tags</h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            Use tags to describe projects and other content across categories.
            Inactive tags are hidden from public catalogs.
          </p>
        </div>
        {!form && (
          <button
            className="min-h-11 shrink-0 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85"
            type="button"
            onClick={startCreate}
          >
            New tag
          </button>
        )}
      </header>

      {notice && (
        <p
          className={`mt-6 text-sm ${notice.kind === "error" ? "text-red-600" : "text-muted"}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.message}
        </p>
      )}

      {form && (
        <section
          aria-labelledby="tag-form-title"
          className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:mt-8 sm:p-6 lg:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-xl font-semibold" id="tag-form-title">
              {editingId ? "Edit tag" : "Create tag"}
            </h2>
            <button
              className="min-h-10 shrink-0 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
              type="button"
              onClick={() => setForm(null)}
            >
              Cancel
            </button>
          </div>
          <form
            className="mt-6 grid gap-5 sm:grid-cols-2"
            noValidate
            onSubmit={handleSubmit}
          >
            <label className="grid gap-2 text-sm font-medium">
              Name
              <input
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                maxLength={100}
                required
                aria-describedby={`tag-name-hint${(touched.name || submitted) && nameError ? " tag-name-error" : ""}`}
                aria-invalid={Boolean((touched.name || submitted) && nameError)}
                value={form.name}
                onBlur={() => setTouched({ ...touched, name: true })}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm({
                    ...form,
                    name,
                    slug: form.slugManuallyEdited
                      ? form.slug
                      : slugFromName(name),
                  });
                }}
              />
              <span className="text-xs font-normal text-muted" id="tag-name-hint">
                Shown to editors and visitors. Up to 100 characters.
              </span>
              {(touched.name || submitted) && nameError && (
                <span className="text-xs font-normal text-red-600" id="tag-name-error">
                  {nameError}
                </span>
              )}
            </label>
            <div className="grid content-start gap-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium" htmlFor="tag-slug">
                  Slug
                </label>
                <button
                  className="text-xs font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      slug: slugFromName(form.name),
                      slugManuallyEdited: false,
                    })
                  }
                >
                  Generate from name
                </button>
              </div>
              <input
                id="tag-slug"
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
                aria-describedby={`tag-slug-hint${(touched.slug || submitted) && slugError ? " tag-slug-error" : ""}`}
                aria-invalid={Boolean((touched.slug || submitted) && slugError)}
                value={form.slug}
                onBlur={() => setTouched({ ...touched, slug: true })}
                onChange={(event) =>
                  setForm({
                    ...form,
                    slug: event.target.value,
                    slugManuallyEdited: true,
                  })
                }
              />
              <span className="text-xs text-muted" id="tag-slug-hint">
                URL-safe, lowercase, and unique. Generated from the name until
                you edit it; up to 120 characters.
              </span>
              {(touched.slug || submitted) && slugError && (
                <span className="text-xs text-red-600" id="tag-slug-error">
                  {slugError}
                </span>
              )}
            </div>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Description
              <textarea
                className="min-h-24 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                maxLength={500}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
              <span className="text-xs font-normal text-muted">
                Optional summary, up to 500 characters.
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm font-medium sm:col-span-2">
              <input
                checked={form.is_active}
                className="mt-0.5 size-4 accent-foreground"
                type="checkbox"
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.checked })
                }
              />
              <span>
                Active
                <span className="mt-1 block font-normal text-muted">
                  Active tags are available in public catalogs and project
                  assignments.
                </span>
              </span>
            </label>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
              <button
                className="min-h-11 w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting
                  ? "Saving…"
                  : editingId
                    ? "Save changes"
                    : "Create tag"}
              </button>
              <button
                className="min-h-11 w-full rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-soft-surface sm:w-auto"
                type="button"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section
        aria-label="Tag list"
        className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:mt-8 sm:p-6 lg:p-7"
      >
        {visibleState.status === "loading" && (
          <p className="py-8 text-center text-sm text-muted" role="status">
            Loading tags…
          </p>
        )}
        {visibleState.status === "error" && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-600" role="alert">
              {visibleState.message}
            </p>
            <button
              className="mt-4 rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-soft-surface"
              type="button"
              onClick={() => setReload((current) => current + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {visibleState.status === "ready" && tags.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            No tags have been created yet.
          </p>
        )}
        {visibleState.status === "ready" && tags.length > 0 && (
          <>
            <div className="mb-6 border-b border-border pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Tag library</h2>
                  <p className="mt-1 text-sm text-muted">
                    {tags.length} {tags.length === 1 ? "tag" : "tags"} total
                    <span aria-hidden="true"> · </span>
                    {activeCount} active
                    <span aria-hidden="true"> · </span>
                    {inactiveCount} inactive
                  </p>
                </div>
                <p aria-live="polite" className="text-sm text-muted">
                  Showing {filteredTags.length} of {tags.length}
                </p>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem]">
                <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted">
                  Search tags
                  <span className="relative block min-w-0">
                    <svg
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <circle
                        cx="8.5"
                        cy="8.5"
                        r="5.25"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="m12.5 12.5 4 4"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <input
                      aria-label="Search tags"
                      className="min-h-11 w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                      placeholder="Search by name, slug, or description"
                      type="search"
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setConfirmDeleteId(null);
                      }}
                    />
                    {query && (
                      <button
                        aria-label="Clear tag search"
                        className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-soft-surface hover:text-foreground"
                        type="button"
                        onClick={() => {
                          setQuery("");
                          setConfirmDeleteId(null);
                        }}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    )}
                  </span>
                </label>

                <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted">
                  Sort by
                  <select
                    className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
                    value={sortOrder}
                    onChange={(event) => {
                      setSortOrder(
                        event.target.value === "name-desc"
                          ? "name-desc"
                          : "name-asc",
                      );
                      setConfirmDeleteId(null);
                    }}
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                  </select>
                </label>
              </div>

              <div
                aria-label="Filter tags by status"
                className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap"
                role="group"
              >
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    aria-label={`${option.label} ${option.count}`}
                    aria-pressed={statusFilter === option.value}
                    className={`min-h-10 min-w-0 rounded-full border px-1 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                      statusFilter === option.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted hover:bg-soft-surface hover:text-foreground"
                    }`}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option.value);
                      setConfirmDeleteId(null);
                    }}
                  >
                    {option.label}
                    <span className="ml-1.5 opacity-70">{option.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredTags.length === 0 ? (
              <div className="py-10 text-center">
                <p className="font-medium">No tags match those filters.</p>
                <p className="mt-1 text-sm text-muted">
                  Try another search or show all tags.
                </p>
                <button
                  className="mt-4 rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-soft-surface"
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                    setConfirmDeleteId(null);
                  }}
                >
                  Clear search and filters
                </button>
              </div>
            ) : (
              <ul className="grid gap-3 lg:grid-cols-2">
                {filteredTags.map((tag) => (
                  <li
                    key={tag.id}
                    className="min-w-0 rounded-xl border border-border p-4 transition-colors hover:bg-soft-surface/40"
                  >
                    <article>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{tag.name}</h3>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs ${
                                tag.is_active
                                  ? "border-accent/50 bg-accent/15 text-foreground"
                                  : "border-border bg-soft-surface text-muted"
                              }`}
                            >
                              {tag.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 break-all font-mono text-xs text-muted">
                            {tag.slug}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-soft-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                            type="button"
                            onClick={() => startEdit(tag)}
                          >
                            Edit
                          </button>
                          {confirmDeleteId === tag.id ? (
                            <>
                              <span className="text-sm text-muted">
                                Delete this tag?
                              </span>
                              <button
                                className="min-h-11 rounded-lg border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                                disabled={deletingId === tag.id}
                                type="button"
                                onClick={() => void handleDelete(tag)}
                              >
                                {deletingId === tag.id
                                  ? "Deleting…"
                                  : "Confirm"}
                              </button>
                              <button
                                className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-soft-surface disabled:opacity-50"
                                disabled={deletingId === tag.id}
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="min-h-11 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:border-red-600/50 hover:bg-red-500/10 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(tag.id);
                                setNotice(null);
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      {tag.description && (
                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted">
                          {tag.description}
                        </p>
                      )}
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
