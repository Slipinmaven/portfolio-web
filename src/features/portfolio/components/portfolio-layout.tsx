import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { API_BASE_URL } from "@/lib/api/api-url";
import type { SiteSettings } from "@/features/site-settings/api/site-settings-api";
import type { SiteLinkPlatform } from "@/features/site-settings/api/site-settings-api";
import { SiteLinkIcon } from "@/features/site-settings/components/site-link-icon";
import type { NavigationMenu, NavigationPublicItem } from "@/features/navigation/api/navigation-api";
import { MobileBottomNavigation } from "@/features/portfolio/components/mobile-bottom-navigation";

function mediaContentUrl(mediaId: string): string {
  return new URL(
    `/api/v1/media/${mediaId}/content`,
    `${API_BASE_URL}/`,
  ).toString();
}

function footerLinkPlatform(item: NavigationPublicItem): SiteLinkPlatform {
  if (item.link_type === "EMAIL") return "EMAIL";
  if (item.link_type === "PHONE") return "OTHER";
  if (!item.href) return "OTHER";
  try {
    const host = new URL(item.href).hostname.toLowerCase();
    if (host.includes("github.com")) return "GITHUB";
    if (host.includes("linkedin.com")) return "LINKEDIN";
    if (host === "x.com" || host.endsWith(".x.com") || host.includes("twitter.com")) return "X";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "YOUTUBE";
    if (host.includes("tiktok.com")) return "TIKTOK";
    if (host.includes("instagram.com")) return "INSTAGRAM";
    if (host.includes("bsky.app") || host.includes("bluesky")) return "BLUESKY";
    if (host.includes("mastodon")) return "MASTODON";
    if (host === "wa.me" || host.includes("whatsapp.com")) return "WHATSAPP";
  } catch {}
  return "OTHER";
}

function FooterMenuEntry({
  item,
}: Readonly<{ item: NavigationPublicItem }>) {
  if (item.link_type === "TEXT") {
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-foreground">{item.label}</p>
        {item.content_text && (
          <p className="whitespace-pre-line text-xs leading-relaxed text-muted">
            {item.content_text}
          </p>
        )}
      </div>
    );
  }

  if (!item.href) return null;
  const className = "portfolio-footer-link block text-xs";

  if (item.link_type === "EXTERNAL") {
    const platform = footerLinkPlatform(item);
    return (
      <a
        className="portfolio-footer-link inline-flex items-center gap-2 text-xs"
        href={item.href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <SiteLinkIcon
          className="size-4 shrink-0"
          monochrome
          platform={platform}
        />
        {item.label}
      </a>
    );
  }

  if (item.link_type === "EMAIL" || item.link_type === "PHONE") {
    return (
      <a
        className="portfolio-footer-link inline-flex items-center gap-2 text-xs"
        href={item.href}
      >
        <SiteLinkIcon
          className="size-4 shrink-0"
          monochrome
          platform={item.link_type === "EMAIL" ? "EMAIL" : "OTHER"}
        />
        {item.label}
      </a>
    );
  }

  return (
    <Link className={className} href={item.href}>
      {item.label}
    </Link>
  );
}

export function PortfolioLayout({
  children,
  settings,
  navigation,
}: Readonly<{
  children: ReactNode;
  settings: SiteSettings;
  navigation: Record<NavigationMenu, NavigationPublicItem[]> | null;
}>) {
  const headerItems = navigation?.HEADER ?? [];
  const mobileItems = navigation?.MOBILE?.length
    ? navigation.MOBILE
    : headerItems;
  const footerItems = [...(navigation?.FOOTER ?? [])].sort((left, right) => {
    if (left.link_type === "TEXT" && right.link_type !== "TEXT") return -1;
    if (left.link_type !== "TEXT" && right.link_type === "TEXT") return 1;
    return 0;
  });
  return (
    <div className="portfolio-site flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="portfolio-skip-link sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="portfolio-header sticky top-0 z-30 border-b border-border">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12 lg:py-5"
        >
          <Link
            href="/"
            className="portfolio-brand inline-flex w-fit items-center gap-3"
            aria-label="Portfolio home"
          >
            {settings.logo_media_id ? (
              <Image
                alt=""
                className="size-10 rounded-full object-cover ring-1 ring-border"
                height={40}
                src={mediaContentUrl(settings.logo_media_id)}
                unoptimized
                width={40}
              />
            ) : (
              <span aria-hidden="true" className="portfolio-brand-mark">
                <span />
              </span>
            )}
            <span>
              <span className="block text-xs font-bold tracking-[0.18em]">
                {settings.site_name}
              </span>
              <span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
                {settings.tagline ?? "Work / words / ideas"}
              </span>
            </span>
          </Link>
          {headerItems.length > 0 && (
            <div className="portfolio-nav-links hidden w-full items-center gap-5 text-xs font-medium sm:gap-7 sm:text-sm lg:flex lg:w-auto">
              {headerItems.map((item) =>
                item.children.length > 0 ? (
                  <details
                    key={item.id}
                    className="portfolio-nav-dropdown shrink-0"
                  >
                    <summary className="portfolio-nav-dropdown-trigger">
                      {item.label}
                      <svg
                        aria-hidden="true"
                        fill="none"
                        height="12"
                        viewBox="0 0 16 16"
                        width="12"
                      >
                        <path
                          d="m4 6 4 4 4-4"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </summary>
                    <div className="portfolio-nav-dropdown-menu">
                      {item.children.map((child) =>
                        child.href ? (
                          <Link
                            key={child.id}
                            className="portfolio-nav-dropdown-item"
                            href={child.href}
                          >
                            {child.label}
                          </Link>
                        ) : null,
                      )}
                    </div>
                  </details>
                ) : item.href ? (
                  <Link
                    key={item.id}
                    className="portfolio-nav-link shrink-0"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ) : null,
              )}
            </div>
          )}
        </nav>
      </header>
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <MobileBottomNavigation items={mobileItems} />
      {footerItems.length > 0 && (
        <footer className="portfolio-footer border-t border-border pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:flex sm:w-full sm:justify-between sm:gap-x-10 lg:gap-x-16">
              {footerItems.map((section, index) => (
                <section
                  key={section.id}
                  className={
                    index === footerItems.length - 1
                      ? "col-span-2 flex min-w-0 flex-col gap-3 sm:col-span-1"
                      : "flex min-w-0 flex-col gap-3"
                  }
                >
                  {section.children.length > 0 ? (
                    <>
                      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground">
                        {section.label}
                      </h2>
                      <div
                        className={
                          index === footerItems.length - 1
                            ? "grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-1"
                            : "flex flex-col gap-2.5"
                        }
                      >
                        {section.children.map((item) => (
                          <FooterMenuEntry item={item} key={item.id} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <FooterMenuEntry item={section} />
                  )}
                </section>
              ))}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
