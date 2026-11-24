"use client";

import { useEffect, useRef, useState } from "react";

import {
  type Category,
  type CategoryMoveDirection,
} from "@/features/taxonomy/api/taxonomy-api";

type CategoryHierarchyProps = {
  categories: Category[];
  deletingId: string | null;
  movingId: string | null;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onMove: (category: Category, direction: CategoryMoveDirection) => void;
};

function statusStyle(isActive: boolean): string {
  return isActive
    ? "border-accent/50 bg-accent/15 text-foreground"
    : "border-border bg-soft-surface text-muted";
}

export function CategoryHierarchy({
  categories,
  deletingId,
  movingId,
  onDelete,
  onEdit,
  onMove,
}: CategoryHierarchyProps) {
  const childrenByParent = new Map<string | null, Category[]>();
  const expandableIds = new Set<string>();

  for (const category of categories) {
    const siblings = childrenByParent.get(category.parent_id) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parent_id, siblings);
  }

  for (const [parentId, siblings] of childrenByParent) {
    siblings.sort(
      (left, right) =>
        left.display_order - right.display_order ||
        left.id.localeCompare(right.id),
    );
    if (siblings.length > 0 && parentId !== null) expandableIds.add(parentId);
  }

  const rootIds = new Set(
    (childrenByParent.get(null) ?? [])
      .filter((category) => expandableIds.has(category.id))
      .map((category) => category.id),
  );
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(() => new Set(rootIds));
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const actionMenuRefs = useRef(new Map<string, HTMLDetailsElement>());
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    function createPointerDownHandler(activeId: string) {
      return (event: PointerEvent) => {
        const menu = actionMenuRefs.current.get(activeId);
        if (
          menu &&
          event.target instanceof Node &&
          !menu.contains(event.target)
        ) {
          setOpenActionsId(null);
          setConfirmDeleteId(null);
        }
      };
    }

    if (openActionsId === null) return;
    const handlePointerDown = createPointerDownHandler(openActionsId);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [openActionsId]);

  function matchesQuery(category: Category): boolean {
    if (!normalizedQuery) return true;
    return [category.name, category.slug, category.description ?? ""].some(
      (value) => value.toLowerCase().includes(normalizedQuery),
    );
  }

  function hasMatchingDescendant(category: Category): boolean {
    return (childrenByParent.get(category.id) ?? []).some(
      (child) => matchesQuery(child) || hasMatchingDescendant(child),
    );
  }

  function visibleChildren(category: Category): Category[] {
    const children = childrenByParent.get(category.id) ?? [];
    if (!normalizedQuery || matchesQuery(category)) return children;
    return children.filter(
      (child) => matchesQuery(child) || hasMatchingDescendant(child),
    );
  }

  function toggleExpanded(categoryId: string, isExpanded: boolean) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (isExpanded) {
        next.add(categoryId);
      } else {
        next.delete(categoryId);
      }
      return next;
    });
  }

  function renderActionMenu(category: Category, siblings: Category[]) {
    const position = siblings.findIndex((sibling) => sibling.id === category.id);
    const isBusy = movingId !== null || deletingId !== null;
    const isOpen = openActionsId === category.id;
    const isConfirmingDelete = confirmDeleteId === category.id;

    return (
      <details
        className="relative shrink-0"
        open={isOpen}
        ref={(element) => {
          if (element) {
            actionMenuRefs.current.set(category.id, element);
          } else {
            actionMenuRefs.current.delete(category.id);
          }
        }}
        onToggle={(event) => {
          const nextOpen = event.currentTarget.open;
          setOpenActionsId((current) =>
            nextOpen ? category.id : current === category.id ? null : current,
          );
        }}
      >
        <summary
          aria-label={`Actions for ${category.name}`}
          className="grid size-11 cursor-pointer list-none place-items-center rounded-lg border border-border text-muted outline-none transition-colors hover:bg-soft-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:size-9"
          title="Category actions"
        >
          <svg
            aria-hidden="true"
            className="size-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        </summary>
        <div className="absolute right-0 top-full z-20 mt-2 min-w-44 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
          {isConfirmingDelete ? (
            <div className="w-56 p-2">
              <p className="text-sm font-medium">Delete {category.name}?</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                This cannot be undone. Categories with assigned content or
                subcategories cannot be deleted.
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="min-h-10 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-soft-surface hover:text-foreground"
                  disabled={isBusy}
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setOpenActionsId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="min-h-10 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isBusy}
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setOpenActionsId(null);
                    onDelete(category);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                className="min-h-11 w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-soft-surface disabled:cursor-not-allowed disabled:opacity-40"
                disabled={position === 0 || isBusy}
                type="button"
                onClick={() => {
                  setOpenActionsId(null);
                  onMove(category, "up");
                }}
              >
                Move up
              </button>
              <button
                className="min-h-11 w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-soft-surface disabled:cursor-not-allowed disabled:opacity-40"
                disabled={position === siblings.length - 1 || isBusy}
                type="button"
                onClick={() => {
                  setOpenActionsId(null);
                  onMove(category, "down");
                }}
              >
                Move down
              </button>
              <div className="my-1 border-t border-border" />
              <button
                className="min-h-11 w-full rounded-md px-2.5 py-2 text-left text-sm hover:bg-soft-surface disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy}
                type="button"
                onClick={() => {
                  setOpenActionsId(null);
                  onEdit(category);
                }}
              >
                Edit category
              </button>
              <button
                className="min-h-11 w-full rounded-md px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isBusy}
                type="button"
                onClick={() => setConfirmDeleteId(category.id)}
              >
                Delete category
              </button>
            </>
          )}
        </div>
      </details>
    );
  }

  function renderCategory(category: Category) {
    const siblings = childrenByParent.get(category.parent_id) ?? [];
    const children = visibleChildren(category);
    const allChildren = childrenByParent.get(category.id) ?? [];
    const isExpanded = normalizedQuery || expandedIds.has(category.id);

    return (
      <li
        key={category.id}
        className="relative border-b border-border last:border-b-0"
      >
        {allChildren.length > 0 ? (
          <details
            open={Boolean(isExpanded)}
            onToggle={(event) =>
              toggleExpanded(category.id, event.currentTarget.open)
            }
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg py-2 pl-2 pr-12 outline-none transition-colors hover:bg-soft-surface focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
              <span
                aria-hidden="true"
                className="grid size-5 shrink-0 place-items-center text-muted transition-transform"
                style={{
                  transform: isExpanded ? "rotate(90deg)" : undefined,
                }}
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 16 16">
                  <path
                    d="m5.5 3.5 5 4.5-5 4.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-medium text-foreground">
                    {category.name}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyle(category.is_active)}`}
                  >
                    {category.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-muted">
                    {allChildren.length}{" "}
                    {allChildren.length === 1
                      ? "subcategory"
                      : "subcategories"}
                  </span>
                </span>
              </span>
            </summary>
            {children.length > 0 && (
              <ul className="ml-3 border-l border-border pl-3 sm:ml-5 sm:pl-4">
                {children.map(renderCategory)}
              </ul>
            )}
          </details>
        ) : (
          <div className="flex min-h-11 items-center gap-2 rounded-lg py-2 pl-2 pr-12 transition-colors hover:bg-soft-surface">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-muted/60"
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium text-foreground">
                  {category.name}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyle(category.is_active)}`}
                >
                  {category.is_active ? "Active" : "Inactive"}
                </span>
              </span>
            </span>
          </div>
        )}
        <div className="absolute right-0 top-0 z-20 sm:right-1 sm:top-1">
          {renderActionMenu(category, siblings)}
        </div>
      </li>
    );
  }

  const roots = childrenByParent.get(null) ?? [];
  const visibleRoots = roots.filter(
    (category) =>
      !normalizedQuery ||
      matchesQuery(category) ||
      hasMatchingDescendant(category),
  );
  const activeCount = categories.filter((category) => category.is_active).length;
  const matchingCount = categories.filter(matchesQuery).length;
  const allExpanded =
    expandableIds.size > 0 && expandedIds.size === expandableIds.size;

  return (
    <div>
      <div className="space-y-4 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-foreground">
            {normalizedQuery
              ? `${matchingCount} matching ${matchingCount === 1 ? "category" : "categories"}`
              : `${categories.length} categories`}
          </span>
          {!normalizedQuery && (
            <>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span className="text-muted">{activeCount} active</span>
              <span aria-hidden="true" className="text-border">
                ·
              </span>
              <span className="text-muted">
                {roots.length} top-level {roots.length === 1 ? "category" : "categories"}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search categories</span>
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
              className="min-h-11 w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
              placeholder="Search by name, slug, or description"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                aria-label="Clear category search"
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:bg-soft-surface hover:text-foreground"
                type="button"
                onClick={() => setQuery("")}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </label>
          <button
            className="min-h-11 shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-soft-surface"
            type="button"
            onClick={() =>
              setExpandedIds(
                allExpanded ? new Set() : new Set(expandableIds),
              )
            }
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
        <p className="text-xs text-muted">
          Categories are nested by parent. Use the actions menu to reorder,
          edit, or remove a category.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          No categories have been created yet.
        </p>
      ) : visibleRoots.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted" role="status">
          No categories match “{query}”. Try another search.
        </p>
      ) : (
        <ul className="mt-2">{visibleRoots.map(renderCategory)}</ul>
      )}
    </div>
  );
}
