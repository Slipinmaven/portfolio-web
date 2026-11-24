import Image from "next/image";

import { API_BASE_URL } from "@/lib/api/api-url";
import type { PublicPage } from "@/features/pages/api/page-types";
import type {
  SiteLink,
  SiteSettings,
} from "@/features/site-settings/api/site-settings-api";
import {
  SiteLinkIcon,
  siteLinkPlatformLabel,
} from "@/features/site-settings/components/site-link-icon";

function mediaContentUrl(mediaId: string): string {
  return new URL(
    `/api/v1/media/${mediaId}/content`,
    `${API_BASE_URL}/`,
  ).toString();
}

function isDirectContactLink(link: SiteLink): boolean {
  return link.platform === "EMAIL" || link.platform === "WHATSAPP";
}

function ContactLink({
  link,
  primary,
}: {
  link: SiteLink;
  primary: boolean;
}) {
  const isEmail = link.platform === "EMAIL";
  const isWhatsApp = link.platform === "WHATSAPP";
  const label = link.label ?? siteLinkPlatformLabel(link.platform);
  const description = isEmail
    ? link.url.replace(/^mailto:/, "")
    : isWhatsApp
      ? "Message me on WhatsApp"
      : `Open ${siteLinkPlatformLabel(link.platform)}`;

  return (
    <li>
      <a
        aria-label={
          link.label ?? `${siteLinkPlatformLabel(link.platform)}: ${description}`
        }
        className={`group flex min-h-20 items-center gap-4 rounded-2xl border px-4 py-3.5 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${
          primary
            ? "border-accent bg-accent text-[#171717]"
            : "border-border bg-surface text-foreground"
        }`}
        href={link.url}
        rel={isEmail ? undefined : "noopener noreferrer"}
        target={isEmail ? undefined : "_blank"}
      >
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl ${
            isEmail ? "bg-background text-foreground" : "bg-white"
          }`}
        >
          <SiteLinkIcon className="size-5" platform={link.platform} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-sm opacity-75">
            {description}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 text-xl transition-transform group-hover:translate-x-1"
        >
          ↗
        </span>
      </a>
    </li>
  );
}

export function PublicContactPage({
  page,
  settings,
}: {
  page: PublicPage;
  settings: SiteSettings;
}) {
  const directContactLinks = settings.links.filter(isDirectContactLink);
  const socialLinks = settings.links.filter(
    (link) => !isDirectContactLink(link),
  );
  const primaryContactLink =
    directContactLinks.find((link) => link.platform === "EMAIL") ??
    directContactLinks[0];
  const initials = settings.owner_name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <article className="mx-auto w-full max-w-[1080px] px-5 py-10 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
      <header className="flex flex-col gap-3 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="portfolio-display break-words text-5xl leading-none sm:text-6xl">
          {page.title}
        </h1>
        {page.summary && (
          <p className="max-w-md text-sm leading-6 text-muted sm:text-right">
            {page.summary}
          </p>
        )}
      </header>

      <div className="grid items-start gap-8 pt-7 sm:pt-9 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-12">
        <section
          aria-labelledby="contact-profile-heading"
          className="min-w-0"
        >
          <div className="flex items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface font-serif text-xl text-muted">
              {settings.profile_image_media_id ? (
                <Image
                  alt={settings.owner_name}
                  className="size-full object-cover"
                  height={64}
                  src={mediaContentUrl(settings.profile_image_media_id)}
                  unoptimized
                  width={64}
                />
              ) : (
                initials || "?"
              )}
            </span>
            <div className="min-w-0">
              <h2
                className="break-words text-lg font-semibold tracking-tight"
                id="contact-profile-heading"
              >
                {settings.owner_name}
              </h2>
              {(settings.role_title || settings.location) && (
                <p className="mt-1 text-sm leading-5 text-muted">
                  {[settings.role_title, settings.location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>

          {settings.owner_bio && (
            <p className="mt-5 max-w-md text-sm leading-6 text-muted">
              {settings.owner_bio}
            </p>
          )}

          {settings.availability_note && (
            <p className="mt-4 inline-flex max-w-full items-start gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm leading-5">
              <span
                aria-hidden="true"
                className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500"
              />
              <span>{settings.availability_note}</span>
            </p>
          )}
        </section>

        <div className="min-w-0">
          {directContactLinks.length > 0 && (
            <section aria-labelledby="contact-methods-heading">
              <h2
                className="text-lg font-semibold tracking-tight"
                id="contact-methods-heading"
              >
                Get in touch
              </h2>
              <ul className="mt-3 grid gap-2.5">
                {directContactLinks.map((link) => (
                  <ContactLink
                    key={link.id}
                    link={link}
                    primary={link.id === primaryContactLink?.id}
                  />
                ))}
              </ul>
            </section>
          )}

          {socialLinks.length > 0 && (
            <section
              aria-labelledby="contact-social-heading"
              className={
                directContactLinks.length > 0
                  ? "mt-7 border-t border-border pt-5"
                  : ""
              }
            >
              <h2
                className="text-lg font-semibold tracking-tight"
                id="contact-social-heading"
              >
                Find me online
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {socialLinks.map((link) => (
                  <li key={link.id}>
                    <a
                      aria-label={
                        link.label ??
                        `Open ${siteLinkPlatformLabel(link.platform)} profile`
                      }
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-2 pr-3 text-sm font-medium transition-colors hover:border-foreground/30 hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                      href={link.url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-full ${
                          link.platform === "OTHER"
                            ? "bg-background text-foreground"
                            : "bg-white"
                        }`}
                      >
                        <SiteLinkIcon
                          className="size-4"
                          platform={link.platform}
                        />
                      </span>
                      {link.label ?? siteLinkPlatformLabel(link.platform)}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {settings.links.length === 0 && (
            <p className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted">
              Contact links have not been added yet.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
