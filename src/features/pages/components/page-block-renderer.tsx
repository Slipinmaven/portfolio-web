"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { AdminPost } from "@/features/posts/api/post-types";
import { AdminMarkdownPreview } from "@/features/posts/components/admin-markdown-preview";
import { MarkdownContent } from "@/features/posts/components/markdown-content";
import type { MediaItem } from "@/features/media/api/media-api";
import { mediaAssetUrl } from "@/features/media/api/media-api";
import { useAdminMediaAsset } from "@/features/media/hooks/use-admin-media-asset";
import {
  SKILL_PROFICIENCY_LABELS,
  SKILL_PROFICIENCY_OPTIONS,
  type PageBlock,
  type PageLinkTarget,
  type PageSummary,
  type SkillsBlock,
} from "@/features/pages/api/page-types";
import { orderAboutPageSections } from "@/features/pages/api/about-page-order";
import { renderPageMarkdownPreview } from "@/features/pages/api/pages-api";
import type { ProjectSummary } from "@/features/projects/api/projects-api";

type RenderMode = "editor" | "public";

type PageRenderImage = Pick<
  MediaItem,
  "id" | "title" | "alt_text" | "width" | "height"
>;

type PageRenderProject = Pick<
  ProjectSummary,
  | "id"
  | "title"
  | "slug"
  | "short_description"
  | "demo_url"
  | "github_url"
  | "status"
  | "is_featured"
  | "display_order"
> & {
  cover_media?: {
    media_id: string;
    title: string | null;
    alt_text: string | null;
    file_url: string;
  } | null;
};

type PageRenderPageTarget = Pick<PageSummary, "id" | "slug" | "status">;
type PageRenderPostTarget = Pick<AdminPost, "id" | "kind" | "slug" | "status">;

function targetHref(
  target: PageLinkTarget,
  pages: readonly PageRenderPageTarget[],
  projects: readonly PageRenderProject[],
  posts: readonly PageRenderPostTarget[],
): string | null {
  if (target.type === "PAGE") {
    const page = pages.find((candidate) => candidate.id === target.id);
    if (!page || page.status !== "PUBLISHED") return null;
    return page.slug === "home" ? "/" : `/${encodeURIComponent(page.slug)}`;
  }
  if (target.type === "PROJECT") {
    const project = projects.find(
      (candidate) =>
        candidate.id === target.id && candidate.status === "PUBLISHED",
    );
    return project ? `/projects/${encodeURIComponent(project.slug)}` : null;
  }
  const post = posts.find(
    (candidate) =>
      candidate.id === target.id && candidate.status === "PUBLISHED",
  );
  if (!post) return null;
  const collection = post.kind === "ARTICLE" ? "articles" : "notes";
  return `/${collection}/${encodeURIComponent(post.slug)}`;
}

function EditorHeroImage({ image }: { image: PageRenderImage }) {
  const preview = useAdminMediaAsset(image.id, "content");
  if (preview.status === "loading") {
    return (
      <div className="absolute inset-0 grid place-items-center bg-soft-surface text-sm text-muted">
        Loading hero image…
      </div>
    );
  }
  if (preview.status === "error") {
    return (
      <div className="absolute inset-0 grid place-items-center bg-soft-surface text-sm text-muted">
        Hero image preview unavailable
      </div>
    );
  }
  if (preview.status !== "ready") {
    return (
      <div className="absolute inset-0 grid place-items-center bg-soft-surface text-sm text-muted">
        Hero image preview unavailable
      </div>
    );
  }
  return (
    <Image
      alt={image.alt_text ?? image.title ?? ""}
      className="object-cover"
      fill
      sizes="(max-width: 768px) 100vw, 1152px"
      src={preview.url}
      unoptimized
    />
  );
}

function PublicHeroImage({
  image,
  eager = false,
}: {
  image: PageRenderImage;
  eager?: boolean;
}) {
  return (
    <Image
      alt={image.alt_text ?? image.title ?? ""}
      className="object-cover"
      fill
      loading={eager ? "eager" : "lazy"}
      sizes="(max-width: 768px) 100vw, 1152px"
      src={mediaAssetUrl(`/api/v1/media/${image.id}/content`)}
      unoptimized
    />
  );
}

function HeroSection({
  block,
  mode,
  images,
  pages,
  projects,
  posts,
  previewOnly,
  isHomepage,
  isAboutPage,
  aboutPageTitle,
  aboutPageSummary,
}: {
  block: Extract<PageBlock, { type: "HERO" }>;
  mode: RenderMode;
  images: readonly PageRenderImage[];
  pages: readonly PageRenderPageTarget[];
  projects: readonly PageRenderProject[];
  posts: readonly PageRenderPostTarget[];
  previewOnly: boolean;
  isHomepage: boolean;
  isAboutPage: boolean;
  aboutPageTitle?: string;
  aboutPageSummary?: string | null;
}) {
  const image = images.find((candidate) => candidate.id === block.media_id);
  const href = block.button
    ? targetHref(block.button.link_target, pages, projects, posts)
    : null;
  const hasBackgroundImage = Boolean(image);
  const isDesignedHomeHero = mode === "public" && isHomepage;
  const isDesignedAboutHero = isAboutPage;
  const useLightText =
    hasBackgroundImage || (mode === "public" && !isDesignedAboutHero);
  const HeadingTag =
    isAboutPage || (mode === "public" && isHomepage) ? "h1" : "h2";

  return (
    <section
      aria-labelledby={`page-hero-${block.id}`}
      className={`relative isolate overflow-hidden rounded-[2rem] border border-border bg-surface ${
        isDesignedHomeHero
          ? "portfolio-home-hero-block"
          : isDesignedAboutHero
            ? "portfolio-about-feature"
            : mode === "public"
              ? "portfolio-public-hero"
              : ""
      }`}
    >
      {image ? (
        <div
          className={
            isDesignedHomeHero
              ? "portfolio-home-hero-media"
              : isDesignedAboutHero
                ? "portfolio-about-feature-media"
                : "absolute inset-0 -z-10"
          }
        >
          {mode === "editor" ? (
            <EditorHeroImage image={image} />
          ) : (
            <PublicHeroImage
              eager={isDesignedHomeHero || isDesignedAboutHero}
              image={image}
            />
          )}
          {isDesignedAboutHero ? null : isDesignedHomeHero ? (
            <div
              aria-hidden="true"
              className="portfolio-home-hero-image-shade absolute inset-0"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/15" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
            </>
          )}
        </div>
      ) : isDesignedHomeHero ? (
        <div aria-hidden="true" className="portfolio-home-hero-artwork">
          <svg
            className="portfolio-home-hero-artwork-lines"
            fill="none"
            viewBox="0 0 640 640"
          >
            <circle cx="320" cy="320" r="220" />
            <circle cx="320" cy="320" r="160" />
            <circle cx="320" cy="320" r="90" />
            <path d="M92 410 320 92l228 318-228 138L92 410Z" />
            <path d="M92 410h456M320 92v456M194 268l252 180" />
            <circle cx="320" cy="320" r="18" />
          </svg>
          <span className="portfolio-home-hero-artwork-label">01</span>
        </div>
      ) : mode === "editor" ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-br from-surface via-background to-soft-surface"
        />
      ) : null}
      <div
        className={
          isDesignedHomeHero
            ? "portfolio-home-hero-copy"
            : isDesignedAboutHero
              ? "portfolio-about-feature-copy"
              : `flex min-h-[22rem] flex-col justify-end p-7 sm:min-h-[30rem] sm:p-12 ${
                  useLightText ? "text-white" : "text-foreground"
                }`
        }
      >
        <p
          className={
            isDesignedHomeHero
              ? "portfolio-home-hero-kicker portfolio-eyebrow"
              : isDesignedAboutHero
                ? "portfolio-about-feature-kicker portfolio-eyebrow"
                : `text-xs font-semibold uppercase tracking-[0.2em] ${
                    useLightText ? "text-white/75" : "text-muted"
                  }`
          }
        >
          {isDesignedAboutHero
            ? `Profile / ${aboutPageTitle || "About"}`
            : previewOnly
            ? "Page introduction · preview"
            : isDesignedHomeHero
              ? "The opening / page 01"
              : "Page introduction"}
        </p>
        <HeadingTag
          className={
            isDesignedHomeHero
              ? "portfolio-home-hero-heading"
              : isDesignedAboutHero
                ? "portfolio-about-feature-heading"
                : "mt-4 max-w-4xl break-words text-4xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl"
          }
          id={`page-hero-${block.id}`}
        >
          {block.headline || "Your headline"}
        </HeadingTag>
        {isDesignedAboutHero && aboutPageSummary && (
          <p className="portfolio-about-feature-summary">{aboutPageSummary}</p>
        )}
        {block.subline && (
          <p
            className={
              isDesignedHomeHero
                ? "portfolio-home-hero-subline"
                : isDesignedAboutHero
                  ? "portfolio-about-feature-subline"
                  : `mt-5 max-w-2xl whitespace-pre-wrap text-base leading-7 sm:text-xl sm:leading-8 ${
                      useLightText ? "text-white/85" : "text-muted"
                    }`
            }
          >
            {block.subline}
          </p>
        )}
        {block.button && (href || mode === "editor") && (
          <div className="mt-7">
            {href ? (
              previewOnly ? (
                <span
                  className={`inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-semibold text-black ${
                    isDesignedHomeHero
                      ? "portfolio-home-hero-button"
                      : isDesignedAboutHero
                        ? "portfolio-about-feature-button"
                        : ""
                  }`}
                >
                  {block.button.label}
                </span>
              ) : (
                <Link
                  className={`inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-semibold text-black transition-transform hover:-translate-y-0.5 ${
                    isDesignedHomeHero
                      ? "portfolio-home-hero-button"
                      : isDesignedAboutHero
                        ? "portfolio-about-feature-button"
                        : ""
                  }`}
                  href={href}
                >
                  {block.button.label}
                  <span aria-hidden="true" className="ml-3">→</span>
                </Link>
              )
            ) : (
              <span
                aria-label={`${block.button.label}; its target is not currently public`}
                className={`inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 text-sm font-semibold text-white/75 ${
                  isDesignedAboutHero ? "portfolio-about-feature-button" : ""
                }`}
              >
                {block.button.label}
                <span className="ml-2 text-xs font-normal">
                  Target not public
                </span>
              </span>
            )}
          </div>
        )}
        {isDesignedHomeHero && (
          <p aria-hidden="true" className="portfolio-home-hero-footnote">
            A living collection of work &amp; ideas
          </p>
        )}
        {isDesignedHomeHero && image && (
          <span aria-hidden="true" className="portfolio-home-hero-image-index">
            01 <span>IMAGE / INDEX</span>
          </span>
        )}
        {block.media_id && !image && mode === "editor" && (
          <p className="mt-4 text-xs text-amber-700 dark:text-amber-300">
            The selected hero image is unavailable in the media library.
          </p>
        )}
      </div>
    </section>
  );
}

type MarkdownState =
  | { status: "loading" }
  | { status: "ready"; html: string }
  | { status: "error"; message: string };

type StoredMarkdownState = {
  body: string;
  state: MarkdownState;
};

function MarkdownSection({
  block,
  mode,
  renderedHtml,
  isHomepage,
  isAboutPage,
  sectionNumber,
}: {
  block: Extract<PageBlock, { type: "MARKDOWN" }>;
  mode: RenderMode;
  renderedHtml?: string;
  isHomepage: boolean;
  isAboutPage: boolean;
  sectionNumber: number;
}) {
  const [storedState, setStoredState] = useState<StoredMarkdownState>({
    body: block.body,
    state: { status: "loading" },
  });

  useEffect(() => {
    if (mode !== "editor") return;
    let active = true;
    void renderPageMarkdownPreview(block.body)
      .then((html) => {
        if (active) {
          setStoredState({
            body: block.body,
            state: { status: "ready", html },
          });
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setStoredState({
          body: block.body,
          state: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to render this Markdown section.",
          },
        });
      });
    return () => {
      active = false;
    };
  }, [block.body, mode]);

  const state =
    mode === "public"
      ? renderedHtml !== undefined
        ? { status: "ready" as const, html: renderedHtml }
        : {
            status: "error" as const,
            message: "This page section could not be rendered.",
          }
      : storedState.body === block.body
        ? storedState.state
        : { status: "loading" as const };

  return (
    <section
      aria-label="Page text section"
      className={`mx-auto w-full max-w-[72ch] py-3 ${
        isAboutPage
          ? "portfolio-about-story"
          : mode === "public"
            ? isHomepage
            ? "portfolio-public-markdown portfolio-home-markdown"
              : "portfolio-public-markdown"
            : ""
      }`}
      data-section-number={
        isHomepage || isAboutPage
          ? String(sectionNumber).padStart(2, "0")
          : undefined
      }
    >
      {state.status === "loading" && (
        <p className="text-sm text-muted" role="status">
          Rendering text section…
        </p>
      )}
      {state.status === "error" && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300" role="alert">
          {state.message}
        </p>
      )}
      {state.status === "ready" &&
        (mode === "editor" ? (
          <AdminMarkdownPreview html={state.html} />
        ) : (
          <MarkdownContent html={state.html} />
        ))}
    </section>
  );
}

function ProjectGridSection({
  block,
  projects,
  previewOnly,
  isHomepage,
  isAboutPage,
  sectionNumber,
  mode,
}: {
  block: Extract<PageBlock, { type: "PROJECT_GRID" }>;
  projects: readonly PageRenderProject[];
  previewOnly: boolean;
  mode: RenderMode;
  isHomepage: boolean;
  isAboutPage: boolean;
  sectionNumber: number;
}) {
  const publishedProjects = projects
    .filter((project) => project.status === "PUBLISHED")
    .sort(
      (left, right) =>
        left.display_order - right.display_order ||
        left.title.localeCompare(right.title),
    );
  const selectedProjects =
    block.mode === "FEATURED"
      ? publishedProjects.filter((project) => project.is_featured)
      : block.project_ids
          .map((id) =>
            publishedProjects.find((project) => project.id === id),
          )
          .filter((project): project is PageRenderProject => project !== undefined);
  const visibleProjects = selectedProjects.slice(0, block.limit);
  const unavailableCount =
    block.mode === "MANUAL"
      ? block.project_ids.length - visibleProjects.length
      : 0;

  return (
    <section
      aria-labelledby={`page-grid-${block.id}`}
      className={`py-5 sm:py-8 ${
        isAboutPage
          ? "portfolio-public-project-grid portfolio-about-work"
          : mode === "public"
            ? isHomepage
            ? "portfolio-public-project-grid portfolio-home-project-grid"
              : "portfolio-public-project-grid"
            : ""
      }`}
      data-section-number={
        isHomepage || isAboutPage
          ? String(sectionNumber).padStart(2, "0")
          : undefined
      }
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {block.mode === "FEATURED" ? "Featured work" : "Selected work"}
          </p>
          <h2
            className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            id={`page-grid-${block.id}`}
          >
            Projects
          </h2>
        </div>
        <div className="flex items-center gap-5">
          <p className="text-sm text-muted">
            {visibleProjects.length}{" "}
            {visibleProjects.length === 1 ? "project" : "projects"}
          </p>
          {mode === "public" && isHomepage && (
            <Link className="portfolio-home-work-link" href="/projects">
              All work <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </header>

      {previewOnly && unavailableCount > 0 && (
        <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          {unavailableCount} selected{" "}
          {unavailableCount === 1 ? "project is" : "projects are"} not public
          and won&apos;t appear to visitors.
        </p>
      )}
      {visibleProjects.length > 0 ? (
        <ul
          className={`mt-6 grid gap-4 ${
            isHomepage
              ? "md:grid-cols-3"
              : "md:grid-cols-2"
          }`}
        >
          {visibleProjects.map((project, index) => {
            return (
              <li key={project.id}>
                <article
                  className={`portfolio-public-project-card ${
                    isHomepage
                      ? "portfolio-home-project-card"
                      : isAboutPage
                        ? "portfolio-about-project-card"
                        : ""
                  }`}
                >
                  {previewOnly ? (
                    <div
                      aria-hidden="true"
                      className="portfolio-home-project-media"
                    >
                      {project.cover_media ? (
                        <Image
                          alt=""
                          fill
                          loading="lazy"
                          sizes="(max-width: 700px) 100vw, 33vw"
                          src={mediaAssetUrl(project.cover_media.file_url)}
                          unoptimized
                        />
                      ) : (
                        <div className="portfolio-project-card-artwork">
                          <span className="portfolio-project-card-artwork-monogram">
                            {project.title.charAt(0).toUpperCase()}
                          </span>
                          <span className="portfolio-project-card-artwork-caption">
                            Digital case study
                          </span>
                        </div>
                      )}
                      <span className="portfolio-home-project-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  ) : (
                    <Link
                      aria-label={`View ${project.title}`}
                      className="portfolio-home-project-media"
                      href={`/projects/${encodeURIComponent(project.slug)}`}
                    >
                      {project.cover_media ? (
                        <Image
                          alt={
                            project.cover_media.alt_text ??
                            project.cover_media.title ??
                            `${project.title} project cover`
                          }
                          fill
                          loading={index === 0 ? "eager" : "lazy"}
                          sizes="(max-width: 700px) 100vw, 33vw"
                          src={mediaAssetUrl(project.cover_media.file_url)}
                          unoptimized
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="portfolio-project-card-artwork"
                        >
                          <span className="portfolio-project-card-artwork-monogram">
                            {project.title.charAt(0).toUpperCase()}
                          </span>
                          <span className="portfolio-project-card-artwork-caption">
                            Digital case study
                          </span>
                        </div>
                      )}
                      <span className="portfolio-home-project-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {project.is_featured && (
                        <span className="portfolio-home-project-featured">
                          Featured
                        </span>
                      )}
                      <span
                        aria-hidden="true"
                        className="portfolio-home-project-open"
                      >
                        ↗
                      </span>
                    </Link>
                  )}
                  <div className="portfolio-home-project-body">
                    <p className="portfolio-home-project-meta">
                      <span>{project.is_featured ? "Featured" : "Project"}</span>
                      <span aria-hidden="true">/</span>
                      <span>Case study</span>
                    </p>
                    <h3>{project.title}</h3>
                    <p className="portfolio-home-project-description">
                      {project.short_description}
                    </p>
                    <div className="portfolio-home-project-actions">
                    {previewOnly ? (
                      <>
                        <span className="text-muted">Project details</span>
                        {project.demo_url && (
                          <span className="text-muted">Live demo</span>
                        )}
                        {project.github_url && (
                          <span className="text-muted">Source code</span>
                        )}
                      </>
                    ) : (
                      <>
                        <Link
                          className="underline underline-offset-4"
                          href={`/projects/${encodeURIComponent(project.slug)}`}
                        >
                          Project details
                        </Link>
                        {project.demo_url && (
                          <a
                            className="underline underline-offset-4"
                            href={project.demo_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Live demo
                          </a>
                        )}
                        {project.github_url && (
                          <a
                            className="underline underline-offset-4"
                            href={project.github_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Source code
                          </a>
                        )}
                      </>
                    )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <p
          className={`mt-6 rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted ${
            isHomepage
              ? "portfolio-home-project-empty"
              : isAboutPage
                ? "portfolio-about-project-empty"
                : ""
          }`}
        >
          {block.mode === "FEATURED"
            ? "Featured projects will appear here when they are published."
            : "No selected projects are currently public."}
        </p>
      )}
    </section>
  );
}

function AboutSkillIndex({ skills }: { skills: SkillsBlock["skills"] }) {
  return (
    <ul className="portfolio-about-skill-list">
      {skills.map((skill) => {
        const rank =
          SKILL_PROFICIENCY_OPTIONS.findIndex(
            (option) => option.value === skill.proficiency,
          ) + 1;
        const label = SKILL_PROFICIENCY_LABELS[skill.proficiency];
        return (
          <li className="portfolio-about-skill-item" key={skill.id}>
            <div className="portfolio-about-skill-meta">
              <h3 className="portfolio-about-skill-name">{skill.name}</h3>
              <span className="portfolio-about-skill-level">{label}</span>
            </div>
            <div
              aria-label={`${skill.name} proficiency`}
              aria-valuemax={5}
              aria-valuemin={1}
              aria-valuenow={rank}
              aria-valuetext={label}
              className="portfolio-about-skill-meter"
              data-rank={rank}
              role="meter"
            >
              <span aria-hidden="true" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function SkillsSection({
  block,
  isHomepage,
  isAboutPage,
  sectionNumber,
}: {
  block: SkillsBlock;
  isHomepage: boolean;
  isAboutPage: boolean;
  sectionNumber: number;
}) {
  return (
    <section
      aria-labelledby={`page-skills-${block.id}`}
      className={isAboutPage ? "portfolio-about-skills" : "py-5 sm:py-8"}
      data-section-number={
        isHomepage || isAboutPage
          ? String(sectionNumber).padStart(2, "0")
          : undefined
      }
    >
      <header
        className={`flex flex-wrap items-end justify-between gap-5 ${
          isAboutPage
            ? "portfolio-about-section-header"
            : "border-b border-border pb-5 sm:pb-6"
        }`}
      >
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            Skills / proficiency
          </p>
          <h2
            className="portfolio-display mt-3 text-3xl leading-tight sm:text-5xl"
            id={`page-skills-${block.id}`}
          >
            {block.heading}
          </h2>
          {block.description && (
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
              {block.description}
            </p>
          )}
        </div>
        <p className="shrink-0 font-mono text-xs text-muted">
          {String(block.skills.length).padStart(2, "0")}{" "}
          {block.skills.length === 1 ? "SKILL" : "SKILLS"}
        </p>
      </header>

      {isAboutPage ? (
        <AboutSkillIndex skills={block.skills} />
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-7 lg:grid-cols-3 lg:gap-4">
          {block.skills.map((skill, index) => {
            const rank =
              SKILL_PROFICIENCY_OPTIONS.findIndex(
                (option) => option.value === skill.proficiency,
              ) + 1;
            const label = SKILL_PROFICIENCY_LABELS[skill.proficiency];
            return (
              <li key={skill.id}>
                <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      aria-hidden="true"
                      className="font-mono text-xs text-muted"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Skill
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight sm:text-xl">
                    {skill.name}
                  </h3>
                  <div className="mt-5 border-t border-border pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-muted">
                        Proficiency
                      </span>
                      <span className="text-xs font-semibold">{label}</span>
                    </div>
                    <div
                      aria-label={`${skill.name} proficiency`}
                      aria-valuemax={5}
                      aria-valuemin={1}
                      aria-valuenow={rank}
                      aria-valuetext={label}
                      className="mt-3 flex gap-1.5"
                      role="meter"
                    >
                      {SKILL_PROFICIENCY_OPTIONS.map((option, optionIndex) => (
                        <span
                          aria-hidden="true"
                          className={`h-1.5 flex-1 rounded-full ${
                            optionIndex < rank ? "bg-foreground" : "bg-border"
                          }`}
                          key={option.value}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function PageBlockRenderer({
  sections,
  images,
  projects,
  pages,
  posts,
  mode = "editor",
  previewOnly = false,
  renderedMarkdown = {},
  isHomepage = false,
  isAboutPage = false,
  aboutPageTitle,
  aboutPageSummary,
}: {
  sections: readonly PageBlock[];
  images: readonly PageRenderImage[];
  projects: readonly PageRenderProject[];
  pages: readonly PageRenderPageTarget[];
  posts: readonly PageRenderPostTarget[];
  mode?: RenderMode;
  previewOnly?: boolean;
  renderedMarkdown?: Readonly<Record<string, string>>;
  isHomepage?: boolean;
  isAboutPage?: boolean;
  aboutPageTitle?: string;
  aboutPageSummary?: string | null;
}) {
  if (sections.length === 0) {
    if (mode === "public" || previewOnly) return null;
    return (
      <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <p className="font-semibold">This page has no sections yet.</p>
        <p className="mt-2 text-sm text-muted">
          Add a Hero, Writing, Skills, or Projects section to build the page.
        </p>
      </div>
    );
  }

  const pageSections = isAboutPage
    ? orderAboutPageSections(sections)
    : sections;

  return (
    <div
      className={`grid gap-7 sm:gap-10 ${
        isAboutPage
          ? "portfolio-about-sections"
          : mode === "public"
            ? isHomepage
              ? "portfolio-public-sections portfolio-homepage-sections"
              : "portfolio-public-sections"
            : ""
      }`}
    >
      {pageSections.map((block, index) => {
        if (block.type === "HERO") {
          return (
            <HeroSection
              block={block}
              images={images}
              key={block.id}
              mode={mode}
              pages={pages}
              posts={posts}
              previewOnly={previewOnly}
              isHomepage={isHomepage}
              isAboutPage={isAboutPage}
              aboutPageTitle={aboutPageTitle}
              aboutPageSummary={aboutPageSummary}
              projects={projects}
            />
          );
        }
        if (block.type === "MARKDOWN") {
          return (
            <MarkdownSection
              block={block}
              key={block.id}
              mode={mode}
              renderedHtml={renderedMarkdown[block.id]}
              isHomepage={isHomepage}
              isAboutPage={isAboutPage}
              sectionNumber={index + 1}
            />
          );
        }
        if (block.type === "SKILLS") {
          return (
            <SkillsSection
              block={block}
              key={block.id}
              isHomepage={isHomepage}
              isAboutPage={isAboutPage}
              sectionNumber={index + 1}
            />
          );
        }
        return (
          <ProjectGridSection
            block={block}
            key={block.id}
            mode={mode}
            previewOnly={previewOnly}
            projects={projects}
            isHomepage={isHomepage}
            isAboutPage={isAboutPage}
            sectionNumber={index + 1}
          />
        );
      })}
    </div>
  );
}
