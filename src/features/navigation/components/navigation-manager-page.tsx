"use client";

import { useEffect, useState } from "react";

import {
  getManagedNavigation,
  updateManagedNavigation,
  type NavigationAdminItem,
  type NavigationLinkType,
  type NavigationMenu,
} from "@/features/navigation/api/navigation-api";
import { listAllManagedPages } from "@/features/pages/api/pages-api";
import { listAllManagedProjects } from "@/features/projects/api/projects-api";
import { listManagedPosts } from "@/features/posts/api/posts-api";
import { listAllManagedCategories } from "@/features/taxonomy/api/taxonomy-api";

type TargetOption = { id: string; label: string };

export function NavigationManagerPage() {
  const [menu, setMenu] = useState<NavigationMenu>("HEADER");
  const [menus, setMenus] = useState<Record<NavigationMenu, NavigationAdminItem[]> | null>(null);
  const [options, setOptions] = useState<{
    pages: TargetOption[];
    projects: TargetOption[];
    posts: TargetOption[];
    categories: TargetOption[];
  }>({ pages: [], projects: [], posts: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [managedResult, pagesResult, projectsResult, categoriesResult] =
          await Promise.allSettled([
          getManagedNavigation(),
          listAllManagedPages(),
          listAllManagedProjects(),
          listAllManagedCategories(),
          ]);

        if (managedResult.status === "rejected") {
          throw managedResult.reason;
        }

        const postItems = [];
        try {
          let offset = 0;
          while (true) {
            const page = await listManagedPosts(offset, 100);
            postItems.push(...page.posts);
            offset += page.posts.length;
            if (offset >= page.total || page.posts.length === 0) break;
          }
        } catch (postsError) {
          if (active) {
            setError(
              postsError instanceof Error
                ? `Post targets could not be loaded: ${postsError.message}`
                : "Post targets could not be loaded.",
            );
          }
        }
        if (!active) return;
        setMenus(managedResult.value);
        const pages =
          pagesResult.status === "fulfilled" ? pagesResult.value : [];
        const projects =
          projectsResult.status === "fulfilled" ? projectsResult.value : [];
        const categories =
          categoriesResult.status === "fulfilled"
            ? categoriesResult.value
            : [];
        const failedCatalogs = [
          pagesResult.status === "rejected" ? "pages" : null,
          projectsResult.status === "rejected" ? "projects" : null,
          categoriesResult.status === "rejected" ? "categories" : null,
        ].filter(Boolean);
        if (failedCatalogs.length > 0 && active) {
          setError(
            `Some target choices could not be loaded (${failedCatalogs.join(", ")}). The menu can still be edited for available targets.`,
          );
        }
        setOptions({
          pages: pages
            .filter((page) => page.status === "PUBLISHED")
            .map((page) => ({
              id: page.id,
              label: page.system_key
                ? `${page.system_key} / ${page.slug}`
                : page.slug,
            })),
          projects: projects
            .filter((project) => project.status === "PUBLISHED")
            .map((project) => ({
              id: project.id,
              label: project.title,
            })),
          posts: postItems
            .filter((post) => post.status === "PUBLISHED")
            .map((post) => ({
              id: post.id,
              label: `${post.kind.toLowerCase()} / ${post.title}`,
            })),
          categories: categories
            .filter((category) => category.is_active)
            .map((category) => ({
              id: category.id,
              label: category.name,
            })),
        });
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load navigation.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const items = menus?.[menu] ?? [];

  function setItems(next: NavigationAdminItem[]) {
    if (!menus) return;
    setMenus({ ...menus, [menu]: next });
  }

  function addItem(parentId: string | null = null) {
    const isFooterSection = menu === "FOOTER" && parentId === null;
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        menu,
        parent_id: parentId,
        label: parentId ? "New link" : isFooterSection ? "New section" : "New item",
        link_type: isFooterSection ? "NONE" : "ROUTE",
        page_id: null,
        project_id: null,
        post_id: null,
        category_id: null,
        route_key: isFooterSection ? null : "PROJECTS",
        custom_target: null,
        content_text: null,
        display_order: items.filter((item) => item.parent_id === parentId).length,
        is_visible: true,
        target_label: isFooterSection ? null : "Projects",
        target_href: isFooterSection ? null : "/projects",
        target_status: null,
        target_is_eligible: true,
        visibility_reason: null,
      },
    ]);
  }

  function updateItem(id: string, patch: Partial<NavigationAdminItem>) {
    const targetChanged =
      "link_type" in patch ||
      "page_id" in patch ||
      "project_id" in patch ||
      "post_id" in patch ||
      "category_id" in patch ||
      "route_key" in patch ||
      "custom_target" in patch ||
      "content_text" in patch;
    setItems(
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              target_label: targetChanged ? null : item.target_label,
              target_href: targetChanged ? null : item.target_href,
              target_status: targetChanged ? null : item.target_status,
              target_is_eligible: targetChanged
                ? true
                : item.target_is_eligible,
              visibility_reason: targetChanged
                ? null
                : item.visibility_reason,
            }
          : item,
      ),
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = items.map((item) => ({
        id: item.id,
        parent_id: item.parent_id,
        label: item.label,
        link_type: item.link_type,
        page_id: item.link_type === "PAGE" ? item.page_id : null,
        project_id: item.link_type === "PROJECT" ? item.project_id : null,
        post_id: item.link_type === "POST" ? item.post_id : null,
        category_id: item.link_type === "CATEGORY" ? item.category_id : null,
        route_key:
          item.link_type === "ROUTE" ? (item.route_key ?? "PROJECTS") : null,
        custom_target:
          ["EXTERNAL", "EMAIL", "PHONE"].includes(item.link_type)
            ? item.custom_target
            : null,
        content_text: item.link_type === "TEXT" ? item.content_text : null,
        is_visible: item.is_visible,
      }));
      const saved = await updateManagedNavigation(menu, payload);
      setMenus((current) => (current ? { ...current, [menu]: saved } : current));
      setMessage("Navigation saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save navigation.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-muted">Loading navigation…</p>;
  }

  const roots = items.filter((item) => item.parent_id === null);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Workspace / Navigation
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Menu manager</h1>
        </div>
        <button
          className="min-h-11 rounded-lg bg-foreground px-5 text-sm font-semibold text-background disabled:opacity-50"
          disabled={saving}
          type="button"
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save menu"}
        </button>
      </header>

      {error && (
        <p className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
      {message && <p className="mt-5 text-sm" role="status">{message}</p>}

      <div className="mt-6 flex gap-2 border-b border-border">
        {(["HEADER", "FOOTER", "MOBILE"] as NavigationMenu[]).map((value) => (
          <button
            key={value}
            className={`min-h-11 px-4 text-sm font-medium ${
              menu === value
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted"
            }`}
            type="button"
            onClick={() => setMenu(value)}
          >
            {value.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {roots.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            This menu is empty.
          </p>
        )}
        {roots.map((root) => (
          <div key={root.id} className="rounded-2xl border border-border bg-surface p-4">
            <ItemEditor
              item={root}
              options={options}
              onChange={(patch) => updateItem(root.id, patch)}
              onDelete={() =>
                setItems(items.filter((item) => item.id !== root.id && item.parent_id !== root.id))
              }
            />
            <div className="mt-3 border-t border-border pt-3">
              {items.filter((item) => item.parent_id === root.id).map((child) => (
                <div key={child.id} className="mt-2 ml-5 border-l border-border pl-4">
                  <ItemEditor
                    item={child}
                    options={options}
                    onChange={(patch) => updateItem(child.id, patch)}
                    onDelete={() =>
                      setItems(items.filter((item) => item.id !== child.id))
                    }
                  />
                </div>
              ))}
              {root.link_type === "NONE" && (
                <button
                  className="mt-2 ml-5 min-h-9 rounded-lg border border-border px-3 text-xs font-medium"
                  type="button"
                  onClick={() => addItem(root.id)}
                >
                  + Add submenu link
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          className="min-h-11 rounded-lg border border-border px-4 text-sm font-medium"
          type="button"
          onClick={() => addItem()}
        >
          + Add top-level item
        </button>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  options,
  onChange,
  onDelete,
}: {
  item: NavigationAdminItem;
  options: {
    pages: TargetOption[];
    projects: TargetOption[];
    posts: TargetOption[];
    categories: TargetOption[];
  };
  onChange: (patch: Partial<NavigationAdminItem>) => void;
  onDelete: () => void;
}) {
  const targetOptions =
    item.link_type === "PAGE"
      ? options.pages
      : item.link_type === "PROJECT"
        ? options.projects
        : item.link_type === "POST"
          ? options.posts
          : item.link_type === "CATEGORY"
            ? options.categories
            : [];
  const targetValue =
    item.link_type === "PAGE"
      ? item.page_id
      : item.link_type === "PROJECT"
        ? item.project_id
        : item.link_type === "POST"
          ? item.post_id
          : item.link_type === "CATEGORY"
            ? item.category_id
            : null;
  const unavailableTarget =
    targetValue &&
    !item.target_is_eligible &&
    !targetOptions.some((option) => option.id === targetValue);

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_220px_auto] sm:items-end">
      <label className="grid gap-1 text-xs font-medium text-muted">
        Label
        <input
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          maxLength={80}
          value={item.label}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted">
        Type
        <select
          className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
          value={item.link_type}
          onChange={(event) =>
            onChange({
              link_type: event.target.value as NavigationLinkType,
              page_id: null,
              project_id: null,
              post_id: null,
              category_id: null,
              route_key: null,
              custom_target: null,
              content_text: null,
            })
          }
        >
          <option value="NONE">Heading</option>
          <option value="PAGE">Page</option>
          <option value="ROUTE">Listing route</option>
          <option value="PROJECT">Project</option>
          <option value="POST">Post</option>
          <option value="CATEGORY">Category</option>
          {item.menu === "FOOTER" && (
            <>
              <option value="EXTERNAL">External link</option>
              <option value="EMAIL">Email address</option>
              <option value="PHONE">Phone number</option>
              <option value="TEXT">Text</option>
            </>
          )}
        </select>
      </label>
      {item.link_type === "ROUTE" ? (
        <label className="grid gap-1 text-xs font-medium text-muted">
          Listing
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
            value={item.route_key ?? "PROJECTS"}
            onChange={(event) =>
              onChange({
                route_key: event.target
                  .value as NavigationAdminItem["route_key"],
              })
            }
          >
            <option value="PROJECTS">Projects</option>
            <option value="ARTICLES">Articles</option>
            <option value="NOTES">Notes</option>
            <option value="RESOURCES">Resources</option>
          </select>
        </label>
      ) : ["EXTERNAL", "EMAIL", "PHONE"].includes(item.link_type) ? (
        <label className="grid gap-1 text-xs font-medium text-muted">
          {item.link_type === "EXTERNAL"
            ? "HTTPS URL"
            : item.link_type === "EMAIL"
              ? "Email address"
              : "Phone number"}
          <input
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            maxLength={500}
            type={
              item.link_type === "EMAIL"
                ? "email"
                : item.link_type === "PHONE"
                  ? "tel"
                  : "url"
            }
            value={item.custom_target ?? ""}
            onChange={(event) =>
              onChange({ custom_target: event.target.value })
            }
          />
        </label>
      ) : item.link_type === "TEXT" ? (
        <label className="grid gap-1 text-xs font-medium text-muted">
          Footer text
          <textarea
            className="min-h-20 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            maxLength={1000}
            placeholder="Add a short note or contact detail"
            value={item.content_text ?? ""}
            onChange={(event) =>
              onChange({ content_text: event.target.value })
            }
          />
        </label>
      ) : item.link_type !== "NONE" ? (
        <label className="grid gap-1 text-xs font-medium text-muted">
          Target
          <select
            className="min-h-11 rounded-lg border border-border bg-background px-3 text-sm"
            value={targetValue ?? ""}
            onChange={(event) => {
              const id = event.target.value || null;
              onChange({
                page_id: item.link_type === "PAGE" ? id : null,
                project_id: item.link_type === "PROJECT" ? id : null,
                post_id: item.link_type === "POST" ? id : null,
                category_id: item.link_type === "CATEGORY" ? id : null,
              });
            }}
          >
            <option value="">Choose target</option>
            {unavailableTarget && (
              <option disabled value={targetValue}>
                {item.target_label ?? "Unavailable target"}
              </option>
            )}
            {targetOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
          {!item.target_is_eligible && item.visibility_reason && (
            <span className="text-xs text-amber-700" role="status">
              {item.visibility_reason} This link is hidden from visitors.
            </span>
          )}
        </label>
      ) : <div />}
      <div className="flex items-center gap-2">
        <label className="flex min-h-11 items-center gap-2 text-xs font-medium text-muted">
          <input
            checked={item.is_visible}
            className="size-4 accent-foreground"
            type="checkbox"
            onChange={(event) => onChange({ is_visible: event.target.checked })}
          />
          Visible
        </label>
        <button
          className="min-h-11 rounded-lg px-3 text-xs font-medium text-muted hover:bg-soft-surface"
          type="button"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
