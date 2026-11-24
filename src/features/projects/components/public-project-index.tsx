"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { mediaAssetUrl } from "@/features/media/api/media-api";
import type { PublicProjectSummary } from "@/features/projects/api/public-projects";

function readableStatus(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

function projectHref(project: PublicProjectSummary): string {
  return `/projects/${encodeURIComponent(project.slug)}`;
}

function projectMonogram(title: string): string {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export function PublicProjectIndex({
  projects,
  total,
}: {
  projects: readonly PublicProjectSummary[];
  total: number;
}) {
  const [filter, setFilter] = useState<
    "ALL" | "FEATURED" | "COMPLETED" | "IN_PROGRESS" | "PLANNING"
  >("ALL");
  const visibleProjects = useMemo(() => {
    if (filter === "ALL") return projects;
    if (filter === "FEATURED") return projects.filter((project) => project.is_featured);
    return projects.filter((project) => project.development_status === filter);
  }, [filter, projects]);

  return (
    <div className="portfolio-project-index">
      <header className="portfolio-project-index-hero">
        <div>
          <p className="portfolio-eyebrow">Portfolio / 01 — The work</p>
          <h1 className="portfolio-display portfolio-project-index-title">
            Selected <span className="portfolio-display-accent">work.</span>
          </h1>
          <p className="portfolio-project-index-intro">
            The challenges, decisions, and details behind each project.
          </p>
        </div>
        <aside
          aria-label={`${total} published ${total === 1 ? "project" : "projects"}`}
          className="portfolio-project-index-count"
        >
          <span className="portfolio-project-index-count-number">
            {String(total).padStart(2, "0")}
          </span>
          <span className="portfolio-project-index-count-label">
            {total === 1 ? "project selected" : "projects selected"}
          </span>
          <a className="portfolio-project-index-count-link" href="#project-list">
            Browse <span aria-hidden="true">↓</span>
          </a>
        </aside>
      </header>

      {projects.length > 0 ? (
        <>
          <div className="portfolio-project-index-section-heading">
            <p className="portfolio-eyebrow">01 / Selected projects</p>
            <p>Built with curiosity. Shared with care.</p>
          </div>
          <div
            aria-label="Filter projects"
            className="portfolio-project-index-filters"
            role="group"
          >
            {(
              [
                ["ALL", "All"],
                ["FEATURED", "Featured"],
                ["COMPLETED", "Completed"],
                ["IN_PROGRESS", "In progress"],
                ["PLANNING", "Planning"],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-pressed={filter === value}
                className="portfolio-project-index-filter"
                key={value}
                type="button"
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {visibleProjects.length > 0 ? (
          <ol className="portfolio-project-grid" id="project-list">
            {visibleProjects.map((project, index) => (
              <li
                className={`portfolio-project-card${project.is_featured ? " portfolio-project-card-is-featured" : ""}`}
                key={project.id}
              >
                <article>
                  <Link
                    className="portfolio-project-card-link"
                    href={projectHref(project)}
                  >
                    <div
                      className={`portfolio-project-card-art${project.cover_media ? "" : " portfolio-project-card-art-placeholder"}`}
                      data-art-index={index % 4}
                    >
                      {project.cover_media ? (
                        <Image
                          alt={
                            project.cover_media.alt_text ??
                            project.cover_media.title ??
                            `${project.title} project cover`
                          }
                          decoding="async"
                          fetchPriority={index === 0 ? "high" : "auto"}
                          fill
                          loading={index === 0 ? "eager" : "lazy"}
                          sizes={
                            index === 0
                              ? "(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                              : "(max-width: 700px) 100vw, 33vw"
                          }
                          src={mediaAssetUrl(project.cover_media.file_url)}
                          unoptimized
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          className="portfolio-project-card-artwork"
                        >
                          <span className="portfolio-project-card-artwork-monogram">
                            {projectMonogram(project.title)}
                          </span>
                          <span className="portfolio-project-card-artwork-caption">
                            Digital case study
                          </span>
                        </div>
                      )}
                      <span className="portfolio-project-card-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {project.is_featured ? (
                        <span className="portfolio-project-card-featured-label">
                          Featured
                        </span>
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="portfolio-project-card-open"
                      >
                        ↗
                      </span>
                    </div>
                    <div className="portfolio-project-card-body">
                      <div className="portfolio-project-card-meta">
                        <span>{readableStatus(project.development_status)}</span>
                      </div>
                      <h2>{project.title}</h2>
                      <p>{project.short_description}</p>
                      <span className="portfolio-project-card-action">
                        Explore project <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  </Link>
                </article>
              </li>
            ))}
          </ol>
          ) : (
            <div className="portfolio-project-index-filter-empty">
              <p>No projects match this filter.</p>
              <button
                className="portfolio-project-index-filter-reset"
                type="button"
                onClick={() => setFilter("ALL")}
              >
                View all projects
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="portfolio-project-index-empty">
          <p className="portfolio-eyebrow">Nothing published just yet</p>
          <h2>Good work takes the time it takes.</h2>
          <p>
            When a project is ready to share, it will find a home here. In the
            meantime, explore the ideas in the journal.
          </p>
          <Link
            className="portfolio-button portfolio-button-primary"
            href="/articles"
          >
            Visit the journal <span aria-hidden="true">↗</span>
          </Link>
        </div>
      )}
    </div>
  );
}
