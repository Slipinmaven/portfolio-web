"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  listManagedPages,
} from "@/features/pages/api/pages-api";
import type {
  PageListResponse,
  PageStatus,
} from "@/features/pages/api/page-types";

const PAGE_SIZE = 20;

type LoadState =
  | { requestId: string; status: "loading" }
  | { requestId: string; status: "error"; message: string }
  | { requestId: string; status: "ready"; data: PageListResponse };

function statusStyle(status: PageStatus): string {
  if (status === "PUBLISHED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "ARCHIVED") {
    return "border-border bg-soft-surface text-muted";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
}

function pagePath(slug: string): string {
  return slug === "home" ? "/" : `/${slug}`;
}

export function PagesListPage() {
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState<"ALL" | PageStatus>("ALL");
  const [reload, setReload] = useState(0);
  const requestId = `${offset}:${status}:${reload}`;
  const [state, setState] = useState<LoadState>({
    requestId,
    status: "loading",
  });
  const visibleState: LoadState =
    state.requestId === requestId ? state : { requestId, status: "loading" };

  useEffect(() => {
    let active = true;
    void listManagedPages(
      offset,
      PAGE_SIZE,
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
              : "Unable to load pages. Please try again.",
        });
      });

    return () => {
      active = false;
    };
  }, [offset, requestId, status]);

  function changeStatus(value: "ALL" | PageStatus) {
    setOffset(0);
    setStatus(value);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 sm:p-7 lg:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full bg-accent/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Content studio
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pages</h1>
            <p className="mt-2 max-w-xl leading-6 text-muted">
              Edit your core pages and build new destinations from reusable
              content blocks. Drafts stay private until you publish them.
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85"
            href="/admin/pages/new"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            New page
          </Link>
        </div>
      </header>

      <section
        aria-label="Filter pages"
        className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5"
      >
        <div>
          <label
            className="block text-xs font-medium text-muted"
            htmlFor="page-status-filter"
          >
            Publication status
          </label>
          <select
            className="mt-2 min-h-10 rounded-xl border border-border bg-background px-3 text-sm"
            id="page-status-filter"
            onChange={(event) =>
              changeStatus(event.target.value as "ALL" | PageStatus)
            }
            value={status}
          >
            <option value="ALL">All pages</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <button
          className="min-h-10 rounded-xl border border-border px-4 text-sm font-medium hover:bg-soft-surface"
          onClick={() => setReload((value) => value + 1)}
          type="button"
        >
          Refresh
        </button>
      </section>

      {visibleState.status === "loading" && (
        <p className="mt-8 text-sm text-muted" role="status">
          Loading pages…
        </p>
      )}
      {visibleState.status === "error" && (
        <div
          className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          <p>{visibleState.message}</p>
          <button
            className="mt-3 font-semibold underline underline-offset-4"
            onClick={() => setReload((value) => value + 1)}
            type="button"
          >
            Try again
          </button>
        </div>
      )}
      {visibleState.status === "ready" && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p>
              {visibleState.data.total}{" "}
              {visibleState.data.total === 1 ? "page" : "pages"}
            </p>
            <p>
              Page{" "}
              {Math.floor(visibleState.data.offset / visibleState.data.limit) +
                1}{" "}
              of{" "}
              {Math.max(
                1,
                Math.ceil(
                  visibleState.data.total / visibleState.data.limit,
                ),
              )}
            </p>
          </div>
          {visibleState.data.pages.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
              <h2 className="text-lg font-semibold">No pages match</h2>
              <p className="mt-2 text-sm text-muted">
                Try another status filter or create a page.
              </p>
            </div>
          ) : (
            <ul className="mt-5 grid gap-3">
              {visibleState.data.pages.map((page) => (
                <li key={page.id}>
                  <Link
                    className="group flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    href={`/admin/pages/${encodeURIComponent(page.id)}/edit`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold">
                          {page.title}
                        </h2>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle(page.status)}`}
                        >
                          {page.status.toLowerCase()}
                        </span>
                        {page.system_key && (
                          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
                            System page
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm text-muted">
                        {pagePath(page.slug)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center justify-between gap-5 text-xs text-muted sm:justify-end">
                      <span>
                        {page.draft_revision_number
                          ? `Draft r${page.draft_revision_number}`
                          : page.published_at
                            ? `Published ${new Date(page.published_at).toLocaleDateString()}`
                            : "No draft"}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-lg transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="min-h-10 rounded-xl border border-border px-4 text-sm disabled:opacity-40"
              disabled={visibleState.data.offset === 0}
              onClick={() =>
                setOffset(Math.max(0, visibleState.data.offset - PAGE_SIZE))
              }
              type="button"
            >
              Previous
            </button>
            <button
              className="min-h-10 rounded-xl border border-border px-4 text-sm disabled:opacity-40"
              disabled={
                visibleState.data.offset + visibleState.data.pages.length >=
                visibleState.data.total
              }
              onClick={() => setOffset(visibleState.data.offset + PAGE_SIZE)}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
