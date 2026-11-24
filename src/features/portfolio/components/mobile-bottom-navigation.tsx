"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import type { NavigationPublicItem } from "@/features/navigation/api/navigation-api";

function flattenDirectLinks(
  items: NavigationPublicItem[],
): NavigationPublicItem[] {
  return items.flatMap((item) =>
    item.href
      ? [item]
      : item.children.filter((child) => Boolean(child.href)),
  );
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationIcon({ href }: Readonly<{ href: string }>) {
  let name = "link";
  if (href === "/") name = "home";
  else if (href.startsWith("/projects")) name = "work";
  else if (href.startsWith("/articles") || href.startsWith("/notes")) name = "writing";
  else if (href.startsWith("/about")) name = "profile";
  else if (href.startsWith("/contact")) name = "contact";
  else if (href.startsWith("/resources")) name = "resources";

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
      {name === "home" && (
        <>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5M9.5 21v-6h5v6" />
        </>
      )}
      {name === "work" && (
        <>
          <rect height="13" rx="2" width="18" x="3" y="8" />
          <path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V8M3 12h18" />
        </>
      )}
      {name === "writing" && (
        <>
          <path d="M5 3.5h10l4 4V21H5z" />
          <path d="M15 3.5V8h4M8.5 12h7M8.5 15.5h7M8.5 19h4" />
        </>
      )}
      {name === "profile" && (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </>
      )}
      {name === "contact" && (
        <>
          <rect height="16" rx="2" width="18" x="3" y="4" />
          <path d="m3.5 6 8.5 6 8.5-6" />
        </>
      )}
      {name === "resources" && (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
          <path d="M4 5.5v16M8 7h8M8 10h7" />
        </>
      )}
      {name === "link" && (
        <>
          <path d="M10 13.5a3 3 0 0 0 4.2 0l2.4-2.4a3 3 0 0 0-4.2-4.2l-1.3 1.3" />
          <path d="M14 10.5a3 3 0 0 0-4.2 0l-2.4 2.4a3 3 0 0 0 4.2 4.2l1.3-1.3" />
        </>
      )}
    </svg>
  );
}

export function MobileBottomNavigation({
  items,
}: Readonly<{ items: NavigationPublicItem[] }>) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const directLinks = flattenDirectLinks(items);
  const primaryLinks = directLinks.slice(0, 4);
  const overflowLinks = directLinks.slice(4);

  useEffect(() => {
    if (!moreOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  if (directLinks.length === 0) return null;

  return (
    <>
      {moreOpen && (
        <button
          aria-label="Close mobile menu"
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          type="button"
          onClick={() => setMoreOpen(false)}
        />
      )}
      {moreOpen && (
        <nav
          aria-label="More mobile navigation"
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-border bg-background p-2 shadow-[0_-12px_40px_rgba(0,0,0,0.16)] md:hidden"
        >
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              More
            </p>
            <span className="text-xs text-muted">{overflowLinks.length}</span>
          </div>
          {overflowLinks.map((item) =>
            item.href ? (
              <Link
                key={item.id}
                aria-current={
                  isActivePath(pathname, item.href) ? "page" : undefined
                }
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted hover:bg-soft-surface hover:text-foreground"
                href={item.href}
                onClick={() => setMoreOpen(false)}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border">
                  <NavigationIcon href={item.href} />
                </span>
                <span className="flex-1">{item.label}</span>
                <span aria-hidden="true" className="text-muted">↗</span>
              </Link>
            ) : null,
          )}
        </nav>
      )}
      <nav
        aria-label="Mobile navigation"
        className="portfolio-mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
      >
        <div
          className="grid min-h-[4.75rem] px-1 pb-[env(safe-area-inset-bottom)]"
          style={{
            gridTemplateColumns: `repeat(${Math.min(
              primaryLinks.length + (overflowLinks.length > 0 ? 1 : 0),
              5,
            )}, minmax(0, 1fr))`,
          }}
        >
          {primaryLinks.map((item) =>
            item.href ? (
              <Link
                key={item.id}
                aria-current={
                  isActivePath(pathname, item.href) ? "page" : undefined
                }
                className="group relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-semibold text-muted"
                href={item.href}
              >
                {isActivePath(pathname, item.href) && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 h-8 w-12 rounded-full bg-soft-surface"
                  />
                )}
                <span aria-hidden="true" className="relative">
                  <NavigationIcon href={item.href} />
                </span>
                <span className="block max-w-full truncate">{item.label}</span>
              </Link>
            ) : null,
          )}
          {overflowLinks.length > 0 && (
            <button
              aria-expanded={moreOpen}
              aria-label="Open more navigation links"
              className="group flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-semibold text-muted"
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border border-border">
                <svg
                  aria-hidden="true"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.7"
                  viewBox="0 0 24 24"
                >
                  <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
                  <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <span>More</span>
            </button>
          )}
          {overflowLinks.length === 0 &&
            Array.from({ length: 5 - primaryLinks.length }).map((_, index) => (
              <span aria-hidden="true" key={index} />
            ))}
        </div>
      </nav>
    </>
  );
}
