"use client";

import Link from "next/link";
import { useState } from "react";

import type { ManagedResource } from "@/features/resources/api/resources-api";

function typeLabel(value: ManagedResource["resource_type"]): string {
  return value === "DOCS"
    ? "Documentation"
    : value.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ResourcePicker({
  resources,
  selectedIds,
  onChange,
}: {
  resources: ManagedResource[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(selectedIds);
  const matchingResources = resources.filter((resource) =>
    `${resource.title} ${resource.creator ?? ""} ${resource.url}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const selectedResources = selectedIds
    .map((id) => resources.find((resource) => resource.id === id))
    .filter((resource): resource is ManagedResource => Boolean(resource));

  function moveSelected(resourceId: string, direction: -1 | 1) {
    const index = selectedIds.indexOf(resourceId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= selectedIds.length) return;
    const reordered = [...selectedIds];
    [reordered[index], reordered[nextIndex]] = [
      reordered[nextIndex],
      reordered[index],
    ];
    onChange(reordered);
  }

  return (
    <fieldset className="min-w-0 rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <legend className="text-sm font-semibold">
        Further reading
        <span className="ml-2 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted">
          {selectedIds.length} selected
        </span>
      </legend>
      <p className="mt-1 text-xs leading-5 text-muted">
        Draft and archived resources can remain attached, but only published
        resources appear to visitors.{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href="/admin/resources"
          target="_blank"
        >
          Manage resources
        </Link>
      </p>

      {selectedResources.length > 0 && (
        <ol className="mt-4 space-y-2">
          {selectedResources.map((resource, index) => (
            <li
              key={resource.id}
              className="flex items-center gap-2 rounded-xl bg-background px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {resource.title}
                </span>
                <span className="text-xs text-muted">
                  {resource.status.toLowerCase()} · {typeLabel(resource.resource_type)}
                </span>
              </span>
              <button
                aria-label={`Move ${resource.title} up`}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-soft-surface hover:text-foreground disabled:opacity-40"
                disabled={index === 0}
                type="button"
                onClick={() => moveSelected(resource.id, -1)}
              >
                ↑
              </button>
              <button
                aria-label={`Move ${resource.title} down`}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-soft-surface hover:text-foreground disabled:opacity-40"
                disabled={index === selectedResources.length - 1}
                type="button"
                onClick={() => moveSelected(resource.id, 1)}
              >
                ↓
              </button>
              <button
                aria-label={`Remove ${resource.title}`}
                className="min-h-9 shrink-0 rounded-lg px-2 text-xs font-medium text-muted hover:bg-soft-surface hover:text-foreground"
                type="button"
                onClick={() =>
                  onChange(selectedIds.filter((id) => id !== resource.id))
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      <label className="mt-4 grid gap-1.5 text-xs font-medium text-muted">
        Find a resource
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm font-normal text-foreground outline-none focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[var(--focus-ring)]/20"
          placeholder="Search title, creator, or URL"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="mt-3 max-h-60 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
        {matchingResources.length === 0 ? (
          <p className="px-3 py-5 text-center text-sm text-muted">
            {resources.length === 0
              ? "No resources exist yet. Create one in the Resources workspace."
              : "No matching resources."}
          </p>
        ) : (
          matchingResources.map((resource) => (
            <label
              key={resource.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-soft-surface"
            >
              <input
                checked={selected.has(resource.id)}
                className="size-4 shrink-0 accent-foreground"
                type="checkbox"
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selectedIds, resource.id]
                      : selectedIds.filter((id) => id !== resource.id),
                  )
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-medium">
                  {resource.title}
                </span>
                <span className="text-xs text-muted">
                  {resource.status.toLowerCase()} · {typeLabel(resource.resource_type)}
                  {resource.creator ? ` · ${resource.creator}` : ""}
                </span>
              </span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}
