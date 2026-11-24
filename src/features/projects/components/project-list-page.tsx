"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  listManagedProjects,
  type ProjectListResponse,
  type ProjectStatus,
  type ProjectSummary,
} from "@/features/projects/api/projects-api";

const PAGE_SIZE = 20;
type StatusFilter = "ALL" | ProjectStatus;

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; data: ProjectListResponse };

function readableStatus(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status: ProjectStatus): string {
  if (status === "PUBLISHED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "ARCHIVED") {
    return "border-border bg-soft-surface text-muted";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function developmentStyle(status: ProjectSummary["development_status"]): string {
  if (status === "COMPLETED") return "text-emerald-700 dark:text-emerald-300";
  if (status === "IN_PROGRESS") return "text-sky-700 dark:text-sky-300";
  if (status === "ON_HOLD") return "text-amber-700 dark:text-amber-300";
  if (status === "CANCELLED") return "text-rose-700 dark:text-rose-300";
  return "text-muted";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function ProjectIcon() {
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
      <rect height="13" rx="2" width="18" x="3" y="7" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function StatusBadge({ project }: Readonly<{ project: ProjectSummary }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(project.status)}`}
      >
        {readableStatus(project.status)}
      </span>
      {project.is_featured && (
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-foreground">
          <span aria-hidden="true">★</span> Featured
        </span>
      )}
    </div>
  );
}

export function ProjectListPage() {
  const [offset, setOffset] = useState(0);
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const requestId = `${offset}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };

  useEffect(() => {
    let active = true;

    void listManagedProjects(offset, PAGE_SIZE)
      .then((data) => {
        if (active) setState({ requestId, status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          requestId,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load projects. Please try again.",
        });
      });

    return () => {
      active = false;
    };
  }, [offset, reload, requestId]);

  const projects =
    visibleState.status === "ready" ? visibleState.data.projects : [];

  const query = search.trim().toLowerCase();
  const filteredProjects = projects.filter((project) => {
    const matchesStatus =
      statusFilter === "ALL" || project.status === statusFilter;
    const matchesSearch =
      !query ||
      project.title.toLowerCase().includes(query) ||
      project.slug.toLowerCase().includes(query) ||
      project.short_description.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const stats = visibleState.status === "ready"
    ? [
        {
          label: "Total",
          value: visibleState.data.total,
          detail: "all projects",
          accent: "text-foreground",
        },
        {
          label: "Published",
          value: projects.filter((project) => project.status === "PUBLISHED").length,
          detail: "on this page",
          accent: "text-emerald-700 dark:text-emerald-300",
        },
        {
          label: "Draft",
          value: projects.filter((project) => project.status === "DRAFT").length,
          detail: "on this page",
          accent: "text-amber-700 dark:text-amber-300",
        },
        {
          label: "Featured",
          value: projects.filter((project) => project.is_featured).length,
          detail: "on this page",
          accent: "text-violet-700 dark:text-violet-300",
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-background text-foreground sm:size-12">
              <ProjectIcon />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Portfolio workspace
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                Projects
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted sm:text-base">
                Manage project stories, progress, and portfolio visibility.
              </p>
            </div>
          </div>
          <Link
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background transition-[opacity,transform] duration-200 hover:-translate-y-0.5 hover:opacity-85 active:translate-y-0"
            href="/admin/projects/new"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Create project
          </Link>
        </div>
      </header>

      {visibleState.status === "ready" && (
        <section aria-label="Project totals" className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="admin-project-card rounded-2xl border border-border bg-surface p-4"
            >
              <p className="text-xs font-medium text-muted">{stat.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span className={`text-2xl font-semibold tabular-nums ${stat.accent}`}>
                  {stat.value}
                </span>
                <span className="text-right text-[11px] leading-4 text-muted">
                  {stat.detail}
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      <section aria-label="Project list" className="mt-4">
        {visibleState.status === "loading" && (
          <div className="rounded-2xl border border-border bg-surface py-16 text-center" role="status">
            <div className="mx-auto size-6 animate-spin rounded-full border-2 border-border border-t-accent" />
            <p className="mt-3 text-sm text-muted">Loading projects…</p>
          </div>
        )}

        {visibleState.status === "error" && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-5 py-10 text-center">
            <p className="text-sm text-rose-700 dark:text-rose-300" role="alert">
              {visibleState.message}
            </p>
            <button
              className="mt-4 min-h-11 rounded-xl border border-border bg-surface px-5 text-sm font-semibold"
              type="button"
              onClick={() => setReload((current) => current + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {visibleState.status === "ready" && projects.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-5 py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/10 text-foreground">
              <ProjectIcon />
            </div>
            <p className="mt-4 text-xl font-semibold">No projects yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Add your first project to start shaping the portfolio.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-5 text-sm font-semibold text-background"
              href="/admin/projects/new"
            >
              Create project
            </Link>
          </div>
        )}

        {visibleState.status === "ready" && projects.length > 0 && (
          <>
            <div className="mb-3 rounded-2xl border border-border bg-surface p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <label className="relative block lg:w-80">
                  <span className="sr-only">Search projects</span>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <SearchIcon />
                  </span>
                  <input
                    className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search projects"
                    value={search}
                  />
                </label>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-soft-surface p-1">
                  {(["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={statusFilter === filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`min-h-9 rounded-lg px-2 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs ${
                        statusFilter === filter
                          ? "bg-surface text-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {filter === "ALL" ? "All" : readableStatus(filter)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface px-5 py-12 text-center">
                <p className="font-semibold">No matching projects</p>
                <p className="mt-1 text-sm text-muted">
                  Try a different search or status.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
                  <div className="grid grid-cols-[minmax(0,1fr)_150px_150px_110px_96px] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    <span>Project</span>
                    <span>Status</span>
                    <span>Development</span>
                    <span>Updated</span>
                    <span className="text-right">Action</span>
                  </div>
                  <ul>
                    {filteredProjects.map((project) => (
                      <li key={project.id} className="border-b border-border last:border-b-0">
                        <div className="grid grid-cols-[minmax(0,1fr)_150px_150px_110px_96px] items-center gap-4 px-5 py-4 transition-colors hover:bg-soft-surface">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold">{project.title}</span>
                              {project.is_featured && (
                                <span className="shrink-0 text-xs text-violet-700 dark:text-violet-300" aria-label="Featured">★</span>
                              )}
                            </div>
                            <p className="mt-1 truncate font-mono text-xs text-muted">/{project.slug}</p>
                          </div>
                          <StatusBadge project={project} />
                          <p className={`text-sm font-medium ${developmentStyle(project.development_status)}`}>
                            {readableStatus(project.development_status)}
                          </p>
                          <time className="text-xs text-muted" dateTime={project.updated_at}>
                            {formatDate(project.updated_at)}
                          </time>
                          <Link
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold transition-colors hover:border-accent/50 hover:bg-surface"
                            href={`/admin/projects/${encodeURIComponent(project.id)}/edit`}
                          >
                            Edit
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <ul className="grid gap-3 md:hidden">
                  {filteredProjects.map((project) => (
                    <li key={project.id}>
                      <article className="rounded-2xl border border-border bg-surface p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h2 className="truncate text-base font-semibold">{project.title}</h2>
                            <p className="mt-1 truncate font-mono text-xs text-muted">/{project.slug}</p>
                          </div>
                          <StatusBadge project={project} />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
                          {project.short_description}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                          <div>
                            <p className={`text-xs font-semibold ${developmentStyle(project.development_status)}`}>
                              {readableStatus(project.development_status)}
                            </p>
                            <time className="mt-1 block text-[11px] text-muted" dateTime={project.updated_at}>
                              Updated {formatDate(project.updated_at)}
                            </time>
                          </div>
                          <Link
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold"
                            href={`/admin/projects/${encodeURIComponent(project.id)}/edit`}
                          >
                            Edit <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted sm:text-sm">
                Showing {visibleState.data.offset + 1}–
                {Math.min(visibleState.data.offset + visibleState.data.projects.length, visibleState.data.total)}
                {" "}of {visibleState.data.total}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={visibleState.data.offset === 0}
                  onClick={() => setOffset(Math.max(visibleState.data.offset - PAGE_SIZE, 0))}
                >
                  Previous
                </button>
                <button
                  className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={visibleState.data.offset + visibleState.data.projects.length >= visibleState.data.total}
                  onClick={() => setOffset(visibleState.data.offset + visibleState.data.limit)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
