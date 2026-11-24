"use client";

import { useEffect, useState, type FormEvent } from "react";

import { useAdminRole } from "@/features/admin/components/admin-role-context";
import {
  createCategory,
  deleteCategory,
  listAllManagedCategories,
  moveCategory,
  updateCategory,
  type Category,
  type CategoryMoveDirection,
  type CategoryInput,
} from "@/features/taxonomy/api/taxonomy-api";
import {
  slugFromName,
  validateName,
  validateSlug,
} from "@/features/taxonomy/slug";
import { CategoryHierarchy } from "@/features/taxonomy/components/category-hierarchy";

type CategoryFormValues = {
  name: string;
  slug: string;
  slugManuallyEdited: boolean;
  description: string;
  parent_id: string;
  is_active: boolean;
};

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; categories: Category[] };

const EMPTY_FORM: CategoryFormValues = {
  name: "",
  slug: "",
  slugManuallyEdited: false,
  description: "",
  parent_id: "",
  is_active: false,
};

function nextDisplayOrder(
  parentId: string | null,
  categories: readonly Category[],
): number {
  const siblingOrders = categories
    .filter((category) => category.parent_id === parentId)
    .map((category) => category.display_order);
  return siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
}

function isDescendantOrSelf(
  candidateId: string,
  categoryId: string,
  categoriesById: ReadonlyMap<string, Category>,
): boolean {
  const visited = new Set<string>();
  let current = categoriesById.get(candidateId);

  while (current && !visited.has(current.id)) {
    if (current.id === categoryId) return true;
    visited.add(current.id);
    current = current.parent_id
      ? categoriesById.get(current.parent_id)
      : undefined;
  }

  return false;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The category could not be saved. Please try again.";
}

export function CategoryManagementPage() {
  const role = useAdminRole();
  const [reload, setReload] = useState(0);
  const requestId = String(reload);
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };
  const [form, setForm] = useState<CategoryFormValues | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [touched, setTouched] = useState({ name: false, slug: false });
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (role !== "admin") return;

    let active = true;
    void listAllManagedCategories()
      .then((categories) => {
        if (active) setState({ requestId, status: "ready", categories });
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

  function startCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setTouched({ name: false, slug: false });
    setSubmitted(false);
    setNotice(null);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      slugManuallyEdited: true,
      description: category.description ?? "",
      parent_id: category.parent_id ?? "",
      is_active: category.is_active,
    });
    setTouched({ name: false, slug: false });
    setSubmitted(false);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSubmitted(true);

    const nameError = validateName(form.name);
    const slugError = validateSlug(form.slug);
    setTouched({ name: true, slug: true });
    if (nameError || slugError) return;

    const currentCategory = categories.find(
      (category) => category.id === editingId,
    );
    const parentId = form.parent_id || null;

    const input: CategoryInput = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      parent_id: parentId,
      display_order:
        currentCategory?.parent_id === parentId
          ? currentCategory.display_order
          : nextDisplayOrder(parentId, categories),
      is_active: form.is_active,
    };

    setIsSubmitting(true);
    setNotice(null);
    try {
      if (editingId) {
        await updateCategory(editingId, input);
        setNotice({ kind: "success", message: "Category updated." });
      } else {
        await createCategory(input);
        setNotice({ kind: "success", message: "Category created." });
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

  async function handleDelete(category: Category) {
    setDeletingId(category.id);
    setNotice(null);
    try {
      await deleteCategory(category.id);
      setNotice({ kind: "success", message: "Category deleted." });
      setReload((current) => current + 1);
    } catch (error) {
      setNotice({ kind: "error", message: getErrorMessage(error) });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMove(
    category: Category,
    direction: CategoryMoveDirection,
  ) {
    setMovingId(category.id);
    setNotice(null);
    try {
      await moveCategory(category.id, direction);
      setNotice({ kind: "success", message: "Category order updated." });
      setReload((current) => current + 1);
    } catch (error) {
      setNotice({ kind: "error", message: getErrorMessage(error) });
    } finally {
      setMovingId(null);
    }
  }

  if (role !== "admin") {
    return (
      <main className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-4 text-muted" role="alert">
          Category management is available to administrators only.
        </p>
      </main>
    );
  }

  const categories =
    visibleState.status === "ready" ? visibleState.categories : [];
  const nameError = form ? validateName(form.name) : null;
  const slugError = form ? validateSlug(form.slug) : null;
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const parentOptions = categories.filter(
    (category) =>
      !editingId ||
      !isDescendantOrSelf(category.id, editingId, categoriesById),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted">
            Catalog
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Categories
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-muted">
            Organize projects and other content with an optional category
            hierarchy. Inactive categories are hidden from public catalogs.
          </p>
        </div>
        {!form && (
          <button
            className="min-h-11 shrink-0 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-opacity hover:opacity-85"
            disabled={
              visibleState.status !== "ready" ||
              movingId !== null ||
              deletingId !== null
            }
            type="button"
            onClick={startCreate}
          >
            New category
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
          aria-labelledby="category-form-title"
          className="mt-6 rounded-2xl border border-border bg-surface p-4 sm:mt-8 sm:p-6 lg:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <h2
              className="text-xl font-semibold"
              id="category-form-title"
            >
              {editingId ? "Edit category" : "Create category"}
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
                aria-describedby={
                  `category-name-hint${(touched.name || submitted) && nameError ? " category-name-error" : ""}`
                }
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
              <span
                className="text-xs font-normal text-muted"
                id="category-name-hint"
              >
                Shown to editors and visitors. Up to 100 characters.
              </span>
              {(touched.name || submitted) && nameError && (
                <span
                  className="text-xs font-normal text-red-600"
                  id="category-name-error"
                >
                  {nameError}
                </span>
              )}
            </label>
            <div className="grid content-start gap-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  className="text-sm font-medium"
                  htmlFor="category-slug"
                >
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
                id="category-slug"
                autoComplete="off"
                className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                maxLength={120}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                aria-describedby={
                  `category-slug-hint${(touched.slug || submitted) && slugError ? " category-slug-error" : ""}`
                }
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
              <span className="text-xs text-muted" id="category-slug-hint">
                URL-safe, lowercase, and unique. Generated from the name until
                you edit it; up to 120 characters.
              </span>
              {(touched.slug || submitted) && slugError && (
                <span
                  className="text-xs text-red-600"
                  id="category-slug-error"
                >
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
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Parent category
              <select
                className="w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2.5 font-normal"
                value={form.parent_id}
                onChange={(event) =>
                  setForm({ ...form, parent_id: event.target.value })
                }
              >
                <option value="">No parent</option>
                {parentOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span className="text-xs font-normal text-muted">
                Categories can be nested up to four levels. New categories are
                added after their siblings; use move controls to reorder them.
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
                  Active categories are available in public catalogs and project
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
                    : "Create category"}
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
        aria-label="Category management"
        className="mt-6 rounded-2xl border border-border bg-surface p-3 sm:mt-8 sm:p-6 lg:p-7"
      >
        {visibleState.status === "loading" && (
          <p className="py-8 text-center text-sm text-muted" role="status">
            Loading categories…
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
        {visibleState.status === "ready" && (
          <CategoryHierarchy
            categories={visibleState.categories}
            deletingId={deletingId}
            movingId={movingId}
            onDelete={(category) => void handleDelete(category)}
            onEdit={startEdit}
            onMove={(category, direction) =>
              void handleMove(category, direction)
            }
          />
        )}
      </section>
    </div>
  );
}
