"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  listAllManagedPages,
} from "@/features/pages/api/pages-api";
import type { PageSummary } from "@/features/pages/api/page-types";
import { listAllManagedPosts } from "@/features/posts/api/posts-api";
import type { AdminPost } from "@/features/posts/api/post-types";
import {
  listAllManagedProjects,
  type ProjectSummary,
} from "@/features/projects/api/projects-api";
import {
  listAllManagedResources,
  type ManagedResource,
} from "@/features/resources/api/resources-api";
import {
  listManagedMedia,
  type MediaItem,
} from "@/features/media/api/media-api";

type RecentUpdate = {
  id: string;
  title: string;
  type: string;
  status: string | null;
  updatedAt: string;
  href: string;
};

type OverviewData = {
  projects: ProjectSummary[];
  posts: AdminPost[];
  pages: PageSummary[];
  resources: ManagedResource[];
  media: MediaItem[];
  mediaTotal: number;
  recentUpdates: RecentUpdate[];
};

type LoadState =
  | { requestId: number; status: "loading" }
  | { requestId: number; status: "error"; message: string }
  | { requestId: number; status: "ready"; data: OverviewData };

type QuickActionIconName =
  | "project"
  | "article"
  | "note"
  | "pages"
  | "resource"
  | "media";

function QuickActionIcon({
  name,
}: Readonly<{ name: QuickActionIconName }>) {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {name === "project" && (
        <>
          <rect height="13" rx="2" width="18" x="3" y="7" />
          <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18" />
        </>
      )}
      {name === "article" && (
        <>
          <path d="M5 3.5h10l4 4V21H5z" />
          <path d="M15 3.5V8h4M8.5 12h7M8.5 15.5h7M8.5 19h4" />
        </>
      )}
      {name === "note" && (
        <>
          <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
        </>
      )}
      {name === "pages" && (
        <>
          <rect height="16" rx="2" width="14" x="5" y="4" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </>
      )}
      {name === "resource" && (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
          <path d="M4 5.5v16M8 7h8M8 10h7" />
        </>
      )}
      {name === "media" && (
        <>
          <rect height="16" rx="2" width="18" x="3" y="4" />
          <circle cx="8.5" cy="9" r="2" />
          <path d="m4.5 18 5-5 3.5 3 2.5-2.5 3.5 4.5" />
        </>
      )}
    </svg>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function statusLabel(status: string): string {
  return status.toLowerCase().replaceAll("_", " ");
}

function statusClass(status: string): string {
  if (status === "PUBLISHED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "ARCHIVED") {
    return "border-border bg-soft-surface text-muted";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function createRecentUpdates(data: Omit<OverviewData, "recentUpdates">) {
  return [
    ...data.projects.map((project): RecentUpdate => ({
      id: `project-${project.id}`,
      title: project.title,
      type: "Project",
      status: project.status,
      updatedAt: project.updated_at,
      href: `/admin/projects/${encodeURIComponent(project.id)}/edit`,
    })),
    ...data.posts.map((post): RecentUpdate => ({
      id: `post-${post.id}`,
      title: post.title,
      type: post.kind === "ARTICLE" ? "Article" : "Note",
      status: post.status,
      updatedAt: post.updated_at,
      href: `/admin/posts/${encodeURIComponent(post.id)}/edit`,
    })),
    ...data.pages.map((page): RecentUpdate => ({
      id: `page-${page.id}`,
      title: page.title,
      type: "Page",
      status: page.status,
      updatedAt: page.updated_at,
      href: `/admin/pages/${encodeURIComponent(page.id)}/edit`,
    })),
    ...data.resources.map((resource): RecentUpdate => ({
      id: `resource-${resource.id}`,
      title: resource.title,
      type: "Resource",
      status: resource.status,
      updatedAt: resource.updated_at,
      href: "/admin/resources",
    })),
    ...data.media.map((media): RecentUpdate => ({
      id: `media-${media.id}`,
      title: media.title || media.original_filename,
      type: "Media",
      status: null,
      updatedAt: media.updated_at,
      href: "/admin/media",
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    )
    .slice(0, 5);
}

function QuickAction({
  href,
  title,
  description,
  icon,
  colorClass,
}: {
  href: string;
  title: string;
  description: string;
  icon: QuickActionIconName;
  colorClass: string;
}) {
  return (
    <Link
      className="group admin-action-card flex min-h-20 flex-col justify-between rounded-xl border border-border bg-surface p-3 transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-soft-surface hover:shadow-lg active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:min-h-28 sm:rounded-2xl sm:p-4"
      href={href}
    >
      <span className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${colorClass}`}>
          <QuickActionIcon name={icon} />
        </span>
        <span className="flex-1">{title}</span>
        <span
          aria-hidden="true"
          className="text-base font-normal text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:text-lg"
        >
          ↗
        </span>
      </span>
      <span className="mt-4 hidden text-xs leading-5 text-muted sm:block">
        {description}
      </span>
    </Link>
  );
}

export function AdminHomePage() {
  const [requestId, setRequestId] = useState(0);
  const [state, setState] = useState<LoadState>({
    requestId: 0,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId
      ? state
      : { requestId, status: "loading" };

  useEffect(() => {
    let active = true;

    void Promise.all([
      listAllManagedProjects(),
      listAllManagedPosts(),
      listAllManagedPages(),
      listAllManagedResources(),
      listManagedMedia({ offset: 0, limit: 5 }),
    ])
      .then(([projects, posts, pages, resources, mediaPage]) => {
        const data = {
          projects,
          posts,
          pages,
          resources,
          media: mediaPage.media,
          mediaTotal: mediaPage.total,
        };
        if (active) {
          setState({
            requestId,
            status: "ready",
            data: {
              ...data,
              recentUpdates: createRecentUpdates(data),
            },
          });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          requestId,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load the workspace overview.",
        });
      });

    return () => {
      active = false;
    };
  }, [requestId]);

  const counts =
    visibleState.status === "ready"
      ? [
          {
            label: "Projects",
            count: visibleState.data.projects.length,
            href: "/admin/projects",
          },
          {
            label: "Posts",
            count: visibleState.data.posts.length,
            href: "/admin/posts",
          },
          {
            label: "Pages",
            count: visibleState.data.pages.length,
            href: "/admin/pages",
          },
          {
            label: "Resources",
            count: visibleState.data.resources.length,
            href: "/admin/resources",
          },
          {
            label: "Media",
            count: visibleState.data.mediaTotal,
            href: "/admin/media",
          },
        ]
      : [];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Overview
            </h1>
            <p className="mt-2 max-w-2xl leading-6 text-muted">
              A snapshot of your portfolio content, recent edits, and common
              workspace actions.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-soft-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            href="/"
          >
            View portfolio <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
        </div>
      </header>

      <section aria-label="Content totals" className="mt-5">
        {visibleState.status === "loading" ? (
          <p aria-live="polite" className="py-4 text-sm text-muted">
            Loading workspace summary…
          </p>
        ) : visibleState.status === "error" ? (
          <div
            className="flex flex-col gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 sm:flex-row sm:items-center sm:justify-between"
            role="alert"
          >
            <p className="text-sm text-rose-700 dark:text-rose-300">
              {visibleState.message}
            </p>
            <button
              className="min-h-10 shrink-0 rounded-xl border border-border bg-surface px-4 text-sm font-semibold hover:bg-soft-surface"
              onClick={() => setRequestId((current) => current + 1)}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {counts.map(({ label, count, href }) => (
              <Link
                className="group admin-stat-card rounded-2xl border border-border bg-surface p-4 transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-soft-surface hover:shadow-lg active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                href={href}
                key={label}
              >
                <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  {label}
                  <span
                    aria-hidden="true"
                    className="text-accent transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  >
                    ↗
                  </span>
                </span>
                <span className="mt-4 block text-3xl font-semibold tabular-nums tracking-tight">
                  {count}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  in workspace
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="quick-actions-heading" className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Get started
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              id="quick-actions-heading"
            >
              Quick actions
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <QuickAction
            description="Add a project to your portfolio."
            href="/admin/projects/new"
            title="New project"
            icon="project"
            colorClass="bg-sky-500/12 text-sky-700 dark:text-sky-300"
          />
          <QuickAction
            description="Start a longer-form article."
            href="/admin/posts/new?kind=ARTICLE"
            title="New article"
            icon="article"
            colorClass="bg-violet-500/12 text-violet-700 dark:text-violet-300"
          />
          <QuickAction
            description="Write a short note or update."
            href="/admin/posts/new?kind=NOTE"
            title="New note"
            icon="note"
            colorClass="bg-amber-500/12 text-amber-700 dark:text-amber-300"
          />
          <QuickAction
            description="Edit a core page or create a new one."
            href="/admin/pages"
            title="Manage pages"
            icon="pages"
            colorClass="bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
          />
          <QuickAction
            description="Save a useful tool, guide, or reference."
            href="/admin/resources"
            title="Add resource"
            icon="resource"
            colorClass="bg-rose-500/12 text-rose-700 dark:text-rose-300"
          />
          <QuickAction
            description="Upload and organize portfolio media."
            href="/admin/media"
            title="Upload media"
            icon="media"
            colorClass="bg-cyan-500/12 text-cyan-700 dark:text-cyan-300"
          />
        </div>
      </section>

      <section
        aria-labelledby="recent-updates-heading"
        className="mt-8 rounded-3xl border border-border bg-surface p-4 sm:p-6"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Workspace activity
            </p>
            <h2
              className="mt-1 text-xl font-semibold tracking-tight"
              id="recent-updates-heading"
            >
              Recently updated
            </h2>
          </div>
          <Link
            className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
            href="/admin/posts"
          >
            Browse content
          </Link>
        </div>
        {visibleState.status === "loading" ? (
          <p aria-live="polite" className="py-5 text-sm text-muted">
            Loading recent updates…
          </p>
        ) : visibleState.status === "error" ? (
          <p className="py-5 text-sm text-muted">
            Recent updates are unavailable until the workspace summary loads.
          </p>
        ) : visibleState.data.recentUpdates.length === 0 ? (
          <p className="py-5 text-sm text-muted">
            No content has been added to the workspace yet.
          </p>
        ) : (
          <ol className="divide-y divide-border">
            {visibleState.data.recentUpdates.map((item) => (
              <li key={item.id}>
                <Link
                  className="flex min-w-0 flex-col gap-2 py-4 transition-colors hover:text-accent sm:flex-row sm:items-center sm:justify-between"
                  href={item.href}
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.1em] text-muted">
                        {item.type}
                      </span>
                      {item.status && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${statusClass(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-sm font-semibold">
                      {item.title}
                    </span>
                  </span>
                  <time
                    className="shrink-0 text-xs text-muted"
                    dateTime={item.updatedAt}
                  >
                    {formatDate(item.updatedAt)}
                  </time>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
