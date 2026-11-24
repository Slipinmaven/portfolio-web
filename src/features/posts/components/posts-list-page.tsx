"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listManagedPosts } from "@/features/posts/api/posts-api";
import type {
  AdminPost,
  AdminPostListResponse,
  PostKind,
  PostStatus,
} from "@/features/posts/api/post-types";

const PAGE_SIZE = 20;

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; data: AdminPostListResponse };

function readableStatus(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusStyle(status: PostStatus): string {
  if (status === "PUBLISHED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "ARCHIVED") {
    return "border-border bg-soft-surface text-muted";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function kindStyle(kind: PostKind): string {
  return kind === "ARTICLE"
    ? "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300"
    : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300";
}

function kindPath(kind: PostKind): string {
  return kind === "ARTICLE" ? "articles" : "notes";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function PostIcon() {
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
      <path d="M6 3.5h9l4 4V21H6z" />
      <path d="M15 3.5V8h4M9 12h7M9 15.5h7M9 19h4" />
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

function PostBadges({ post }: Readonly<{ post: AdminPost }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${kindStyle(post.kind)}`}
      >
        {readableStatus(post.kind)}
      </span>
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(post.status)}`}
      >
        {readableStatus(post.status)}
      </span>
    </div>
  );
}

export function PostsListPage() {
  const [offset, setOffset] = useState(0);
  const [kind, setKind] = useState<"ALL" | PostKind>("ALL");
  const [status, setStatus] = useState<"ALL" | PostStatus>("ALL");
  const [search, setSearch] = useState("");
  const [reload, setReload] = useState(0);
  const requestId = `${offset}:${kind}:${status}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };

  useEffect(() => {
    let active = true;
    void listManagedPosts(
      offset,
      PAGE_SIZE,
      kind === "ALL" ? undefined : kind,
      status === "ALL" ? undefined : status,
    )
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
              : "Unable to load posts. Please try again.",
        });
      });

    return () => {
      active = false;
    };
  }, [kind, offset, reload, requestId, status]);

  function updateFilter(
    nextKind: "ALL" | PostKind,
    nextStatus: "ALL" | PostStatus,
  ) {
    setOffset(0);
    setKind(nextKind);
    setStatus(nextStatus);
  }

  const posts =
    visibleState.status === "ready" ? visibleState.data.posts : [];
  const query = search.trim().toLowerCase();
  const filteredPosts = posts.filter((post) => {
    if (!query) return true;
    return (
      post.title.toLowerCase().includes(query) ||
      post.slug.toLowerCase().includes(query) ||
      (post.summary ?? "").toLowerCase().includes(query)
    );
  });

  const stats =
    visibleState.status === "ready"
      ? [
          {
            label: "Matching",
            value: visibleState.data.total,
            detail: "filtered posts",
            accent: "text-foreground",
          },
          {
            label: "Articles",
            value: posts.filter((post) => post.kind === "ARTICLE").length,
            detail: "on this page",
            accent: "text-violet-700 dark:text-violet-300",
          },
          {
            label: "Notes",
            value: posts.filter((post) => post.kind === "NOTE").length,
            detail: "on this page",
            accent: "text-sky-700 dark:text-sky-300",
          },
          {
            label: "Published",
            value: posts.filter((post) => post.status === "PUBLISHED").length,
            detail: "on this page",
            accent: "text-emerald-700 dark:text-emerald-300",
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
              <PostIcon />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Content studio
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                Posts
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted sm:text-base">
                Manage long-form articles and shorter technical notes.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-3 text-sm font-semibold transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-soft-surface active:translate-y-0 sm:px-4"
              href="/admin/posts/new?kind=NOTE"
            >
              New note
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-3 text-sm font-semibold text-background transition-[opacity,transform] duration-200 hover:-translate-y-0.5 hover:opacity-85 active:translate-y-0 sm:px-4"
              href="/admin/posts/new?kind=ARTICLE"
            >
              <span aria-hidden="true" className="text-lg leading-none">+</span>
              New article
            </Link>
          </div>
        </div>
      </header>

      {visibleState.status === "ready" && (
        <section
          aria-label="Post totals"
          className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="admin-project-card rounded-2xl border border-border bg-surface p-4"
            >
              <p className="text-xs font-medium text-muted">{stat.label}</p>
              <div className="mt-2 flex items-end justify-between gap-2">
                <span
                  className={`text-2xl font-semibold tabular-nums ${stat.accent}`}
                >
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

      <section aria-label="Post list" className="mt-4">
        {visibleState.status === "loading" && (
          <div
            className="rounded-2xl border border-border bg-surface py-16 text-center"
            role="status"
          >
            <div className="mx-auto size-6 animate-spin rounded-full border-2 border-border border-t-accent" />
            <p className="mt-3 text-sm text-muted">Loading posts…</p>
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

        {visibleState.status === "ready" && posts.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border bg-surface px-5 py-14 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent/10 text-foreground">
              <PostIcon />
            </div>
            <p className="mt-4 text-xl font-semibold">No posts found</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Try another filter or create a new article or note.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-5 text-sm font-semibold text-background"
              href="/admin/posts/new?kind=ARTICLE"
            >
              Create a post
            </Link>
          </div>
        )}

        {visibleState.status === "ready" && posts.length > 0 && (
          <>
            <div className="mb-3 rounded-2xl border border-border bg-surface p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <label className="relative block lg:w-72">
                  <span className="sr-only">Search posts</span>
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <SearchIcon />
                  </span>
                  <input
                    className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition-[border-color,box-shadow] focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search posts"
                    value={search}
                  />
                </label>
                <fieldset className="min-w-0">
                  <legend className="sr-only">Post type</legend>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-soft-surface p-1">
                  {(["ALL", "ARTICLE", "NOTE"] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={kind === filter}
                      onClick={() => updateFilter(filter, status)}
                      className={`min-h-9 rounded-lg px-2 text-[11px] font-semibold transition-colors sm:px-3 sm:text-xs ${
                        kind === filter
                          ? "bg-surface text-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {filter === "ALL" ? "All types" : readableStatus(filter)}
                    </button>
                  ))}
                  </div>
                </fieldset>
              </div>
              <fieldset className="mt-2 min-w-0">
                <legend className="sr-only">Post status</legend>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-soft-surface p-1 sm:grid-cols-4">
                {(["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"] as const).map(
                  (filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={status === filter}
                      onClick={() => updateFilter(kind, filter)}
                      className={`min-h-9 rounded-lg px-1 text-[10px] font-semibold transition-colors sm:px-3 sm:text-xs ${
                        status === filter
                          ? "bg-surface text-foreground shadow-sm"
                          : "text-muted hover:text-foreground"
                      }`}
                    >
                      {filter === "ALL" ? "All statuses" : readableStatus(filter)}
                    </button>
                  ),
                )}
                </div>
              </fieldset>
            </div>

            {filteredPosts.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface px-5 py-12 text-center">
                <p className="font-semibold">No matching posts</p>
                <p className="mt-1 text-sm text-muted">
                  Try a different search or filter.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface md:block">
                  <div className="grid grid-cols-[minmax(0,1fr)_150px_130px_110px_96px] gap-4 border-b border-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    <span>Post</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span>Updated</span>
                    <span className="text-right">Action</span>
                  </div>
                  <ul>
                    {filteredPosts.map((post) => (
                      <li
                        key={post.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_150px_130px_110px_96px] items-center gap-4 px-5 py-4 transition-colors hover:bg-soft-surface">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{post.title}</p>
                            <p className="mt-1 truncate font-mono text-xs text-muted">
                              /{kindPath(post.kind)}/{post.slug}
                            </p>
                          </div>
                          <span
                            className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${kindStyle(post.kind)}`}
                          >
                            {readableStatus(post.kind)}
                          </span>
                          <span
                            className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyle(post.status)}`}
                          >
                            {readableStatus(post.status)}
                          </span>
                          <time
                            className="text-xs text-muted"
                            dateTime={post.updated_at}
                          >
                            {formatDate(post.updated_at)}
                          </time>
                          <Link
                            className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-semibold transition-colors hover:border-accent/50 hover:bg-surface"
                            href={`/admin/posts/${encodeURIComponent(post.id)}/edit`}
                          >
                            Edit
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <ul className="grid gap-3 md:hidden">
                  {filteredPosts.map((post) => (
                    <li key={post.id}>
                      <article className="rounded-2xl border border-border bg-surface p-4 transition-[border-color,background-color,transform] duration-200 active:scale-[0.99]">
                        <h2 className="break-words text-base font-semibold leading-6">
                          {post.title}
                        </h2>
                        <p className="mt-1 break-all font-mono text-xs leading-5 text-muted">
                          /{kindPath(post.kind)}/{post.slug}
                        </p>
                        <div className="mt-3">
                          <PostBadges post={post} />
                        </div>
                        {post.summary && (
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
                            {post.summary}
                          </p>
                        )}
                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                          <time
                            className="text-[11px] text-muted"
                            dateTime={post.updated_at}
                          >
                            Updated {formatDate(post.updated_at)}
                          </time>
                          <Link
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold"
                            href={`/admin/posts/${encodeURIComponent(post.id)}/edit`}
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
                Showing{" "}
                {visibleState.data.total === 0
                  ? 0
                  : visibleState.data.offset + 1}
                –
                {Math.min(
                  visibleState.data.offset + visibleState.data.posts.length,
                  visibleState.data.total,
                )}{" "}
                of {visibleState.data.total} posts
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={visibleState.data.offset === 0}
                  onClick={() =>
                    setOffset(
                      Math.max(visibleState.data.offset - PAGE_SIZE, 0),
                    )
                  }
                >
                  Previous
                </button>
                <button
                  className="min-h-10 rounded-xl border border-border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={
                    visibleState.data.offset +
                      visibleState.data.posts.length >=
                    visibleState.data.total
                  }
                  onClick={() =>
                    setOffset(
                      visibleState.data.offset + visibleState.data.limit,
                    )
                  }
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
