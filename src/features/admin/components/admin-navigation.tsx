"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { useAdminRole } from "@/features/admin/components/admin-role-context";
import { LogoutButton } from "@/features/auth/components/logout-button";

const workspaceNavigationItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/resources", label: "Resources" },
];

const adminNavigationItems = [
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/navigation", label: "Navigation" },
];

type AdminIconName =
  | "overview"
  | "projects"
  | "posts"
  | "pages"
  | "media"
  | "resources"
  | "settings"
  | "categories"
  | "tags"
  | "navigation"
  | "more";

function iconNameForHref(href: string): AdminIconName {
  if (href === "/admin") return "overview";
  if (href.startsWith("/admin/projects")) return "projects";
  if (href.startsWith("/admin/posts")) return "posts";
  if (href.startsWith("/admin/pages")) return "pages";
  if (href.startsWith("/admin/media")) return "media";
  if (href.startsWith("/admin/resources")) return "resources";
  if (href.startsWith("/admin/settings")) return "settings";
  if (href.startsWith("/admin/categories")) return "categories";
  if (href.startsWith("/admin/tags")) return "tags";
  if (href.startsWith("/admin/navigation")) return "navigation";
  return "more";
}

function AdminIcon({
  name,
  className = "size-5",
}: Readonly<{ name: AdminIconName; className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {name === "overview" && (
        <>
          <rect height="7" rx="1.5" width="7" x="3" y="3" />
          <rect height="7" rx="1.5" width="7" x="14" y="3" />
          <rect height="7" rx="1.5" width="7" x="3" y="14" />
          <rect height="7" rx="1.5" width="7" x="14" y="14" />
        </>
      )}
      {name === "projects" && (
        <>
          <rect height="13" rx="2" width="18" x="3" y="7" />
          <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M3 12h18" />
        </>
      )}
      {name === "posts" && (
        <>
          <path d="M5 3.5h10l4 4V21H5z" />
          <path d="M15 3.5V8h4M8.5 12h7M8.5 15.5h7M8.5 19h4" />
        </>
      )}
      {name === "pages" && (
        <>
          <rect height="16" rx="2" width="14" x="5" y="4" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </>
      )}
      {name === "media" && (
        <>
          <rect height="16" rx="2" width="18" x="3" y="4" />
          <circle cx="8.5" cy="9" r="2" />
          <path d="m4.5 18 5-5 3.5 3 2.5-2.5 3.5 4.5" />
        </>
      )}
      {name === "resources" && (
        <>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
          <path d="M4 5.5v16M8 7h8M8 10h7" />
        </>
      )}
      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L7.6 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 6.4 14H6v-2.6h.4A1.7 1.7 0 0 0 8 10.4a1.7 1.7 0 0 0-.3-1.9L7.6 8l1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 12.4 5v-.2H15V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14H21a1.7 1.7 0 0 0-1.6 1z" />
        </>
      )}
      {name === "categories" && (
        <>
          <circle cx="7" cy="7" r="3" />
          <circle cx="17" cy="7" r="3" />
          <circle cx="12" cy="17" r="3" />
        </>
      )}
      {name === "tags" && (
        <>
          <path d="M20 13 13 20l-9-9V4h7z" />
          <circle cx="8.5" cy="8.5" r="1.5" />
        </>
      )}
      {name === "navigation" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" />
        </>
      )}
      {name === "more" && (
        <>
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

export function AdminNavigation({
  compact = false,
  mobile = false,
}: Readonly<{ compact?: boolean; mobile?: boolean }>) {
  const pathname = usePathname();
  const role = useAdminRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigationItems =
    role === "admin"
      ? [...workspaceNavigationItems, ...adminNavigationItems]
      : workspaceNavigationItems;

  useEffect(() => {
    if (!moreOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  if (mobile) {
    const primaryItems = workspaceNavigationItems.slice(0, 4);
    const moreItems =
      role === "admin"
        ? [workspaceNavigationItems[4], workspaceNavigationItems[5], ...adminNavigationItems]
        : [workspaceNavigationItems[4], workspaceNavigationItems[5]];

    return (
      <>
        {moreOpen && (
          <button
            aria-label="Close more admin navigation"
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            type="button"
            onClick={() => setMoreOpen(false)}
          />
        )}
        {moreOpen && (
          <div
            className="admin-more-panel fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-border bg-surface p-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)]"
            role="dialog"
            aria-label="More admin navigation"
          >
            <nav aria-label="More admin navigation" className="grid grid-cols-2 gap-1">
              {moreItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}
                  className="group flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition-[background-color,color,transform] duration-200 hover:bg-soft-surface hover:text-foreground active:scale-[0.98]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted transition-colors group-hover:border-accent/50 group-hover:text-foreground">
                    <AdminIcon name={iconNameForHref(href)} className="size-4" />
                  </span>
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mt-2 flex justify-end border-t border-border pt-2">
              <LogoutButton />
            </div>
          </div>
        )}
        <nav
          aria-label="Mobile admin navigation"
          className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-surface px-1 pb-[env(safe-area-inset-bottom)]"
        >
          {primaryItems.map(({ href, label }) => {
            const isCurrent =
              pathname === href ||
              (href !== "/admin" && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={`flex min-h-[68px] min-w-0 flex-col items-center justify-center px-1 text-[11px] font-medium ${
                  isCurrent ? "text-foreground" : "text-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mb-1 grid size-8 place-items-center rounded-full transition-all duration-200 ${
                    isCurrent ? "bg-accent text-foreground" : "text-muted"
                  }`}
                >
                  <AdminIcon name={iconNameForHref(href)} className="size-4" />
                </span>
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-label="More admin navigation"
            onClick={() => setMoreOpen((open) => !open)}
            className={`flex min-h-[68px] min-w-0 flex-col items-center justify-center px-1 text-[11px] font-medium ${
              moreOpen ? "text-foreground" : "text-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`mb-1 grid size-8 place-items-center rounded-full transition-all duration-200 ${
                moreOpen ? "rotate-90 bg-accent text-foreground" : "text-muted"
              }`}
            >
              <AdminIcon name="more" className="size-4" />
            </span>
            More
          </button>
        </nav>
      </>
    );
  }

  return (
    <nav
      aria-label="Admin navigation"
      className={
        compact
          ? "grid w-full grid-cols-4 gap-1"
          : "mt-10 flex flex-col gap-1"
      }
    >
      {navigationItems.map(({ href, label }) => {
        const isCurrent =
          pathname === href ||
          (href !== "/admin" && pathname.startsWith(`${href}/`));

        return (
          <Link
            key={href}
            href={href}
            aria-current={isCurrent ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-lg font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.99] ${
              compact
                ? "flex min-h-11 min-w-0 items-center justify-center px-1 py-2 text-center text-xs sm:text-sm"
                : "px-3 py-2.5 text-sm"
            } ${
              isCurrent
                ? "bg-background text-foreground"
                : "text-muted hover:bg-background hover:text-foreground"
            }`}
          >
            {!compact && (
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors ${
                isCurrent ? "bg-accent/25 text-foreground" : "text-muted group-hover:text-foreground"
              }`}>
                <AdminIcon name={iconNameForHref(href)} className="size-4" />
              </span>
            )}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
