import Image from "next/image";
import Link from "next/link";

import { mediaAssetUrl } from "@/features/media/api/media-api";
import { MarkdownContent } from "@/features/posts/components/markdown-content";
import type {
  PublicProject,
  PublicProjectMedia,
} from "@/features/projects/api/public-projects";

function externalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function fileExtension(filename: string): string {
  const extension = filename.split(".").pop();
  return filename.includes(".") && extension ? extension.toUpperCase() : "FILE";
}

function addInlineVideoPosters(
  html: string,
  media: PublicProjectMedia[],
): string {
  const inlineVideoPosters = new Map(
    media
      .filter((item) => item.role === "INLINE" && item.kind === "VIDEO")
      .map(
        (item) => [item.media_id.toLowerCase(), item.poster_url] as const,
      ),
  );

  if (inlineVideoPosters.size === 0) return html;

  return html.replace(/<video\b[^>]*>/gi, (openingTag) => {
    const source = openingTag.match(
      /\bsrc=(["'])\/api\/v1\/media\/([0-9a-f-]{36})\/content\1/i,
    );
    const mediaId = source?.[2];
    const posterPath = mediaId
      ? inlineVideoPosters.get(mediaId.toLowerCase())
      : undefined;
    if (!mediaId || !inlineVideoPosters.has(mediaId.toLowerCase())) {
      return openingTag;
    }

    let updatedTag = openingTag.replace(
      /\s+preload=(["'])[^"']*\1/i,
      "",
    );
    if (!/\bpreload\s*=/.test(updatedTag)) {
      updatedTag = updatedTag.replace(/>$/, ' preload="none">');
    }

    if (posterPath) {
      updatedTag = updatedTag.replace(
        /\s+poster=(["'])[^"']*\1/i,
        "",
      );
      updatedTag = updatedTag.replace(
        />$/,
        ` poster="${mediaAssetUrl(posterPath)}">`,
      );
    }
    return updatedTag;
  });
}

function ProjectGalleryMedia({
  media,
  projectTitle,
}: {
  media: PublicProjectMedia;
  projectTitle: string;
}) {
  return (
    <figure className="portfolio-project-gallery-figure">
      <div className="portfolio-project-gallery-media">
        {media.kind === "IMAGE" ? (
          <Image
            alt={media.alt_text ?? media.title ?? projectTitle}
            className="object-cover"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 700px"
            src={mediaAssetUrl(media.file_url)}
            unoptimized
          />
        ) : (
          <video
            aria-label={media.title ?? media.original_filename}
            className="portfolio-project-gallery-video"
            controls
            poster={media.poster_url ? mediaAssetUrl(media.poster_url) : undefined}
            preload="none"
          >
            <source
              src={mediaAssetUrl(media.file_url)}
              type={media.mime_type}
            />
            Your browser does not support HTML video.
          </video>
        )}
      </div>
      {media.caption && (
        <figcaption className="portfolio-project-gallery-caption">
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}

export function PublicProjectPage({ project }: { project: PublicProject }) {
  const cover = project.media.find(
    (media) => media.role === "COVER" && media.kind === "IMAGE",
  );
  const gallery = project.media
    .filter(
      (media) =>
        media.role === "GALLERY" &&
        (media.kind === "IMAGE" || media.kind === "VIDEO"),
    )
    .sort(
      (left, right) =>
        left.display_order - right.display_order ||
        left.media_id.localeCompare(right.media_id),
    );
  const attachments = project.media
    .filter((media) => media.role === "ATTACHMENT")
    .sort(
      (left, right) =>
        left.display_order - right.display_order ||
        left.media_id.localeCompare(right.media_id),
    );
  const skills = [...project.tags].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const overviewHtml = addInlineVideoPosters(
    project.overview_html,
    project.media,
  );
  const demoUrl = externalUrl(project.demo_url);
  const githubUrl = externalUrl(project.github_url);
  const developmentStatus = project.development_status
    .toLowerCase()
    .replaceAll("_", " ");
  const publishedDate = project.published_at
    ? new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(project.published_at))
    : null;
  const gallerySectionNumber = String(Number(Boolean(project.overview_html)) + 1)
    .padStart(2, "0");
  const resourcesSectionNumber = String(
    Number(Boolean(project.overview_html)) + Number(gallery.length > 0) + 1,
  ).padStart(2, "0");

  return (
    <article className="portfolio-writing-page portfolio-project-page mx-auto w-full max-w-[1600px] px-4 pb-20 pt-8 sm:px-7 sm:pt-12 lg:px-12 lg:pt-14">
      <Link className="portfolio-project-back-link" href="/projects">
        <span aria-hidden="true">←</span>
        <span>All work</span>
      </Link>

      <header
        className={`portfolio-project-hero${cover ? "" : " portfolio-project-hero-no-cover"}`}
      >
        {cover && (
          <Image
            alt={cover.alt_text ?? ""}
            className="object-cover"
            fill
            loading="eager"
            sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1600px) calc(100vw - 6rem), 1504px"
            src={mediaAssetUrl(cover.file_url)}
            unoptimized
          />
        )}
        <div aria-hidden="true" className="portfolio-project-hero-scrim" />
        <div className="portfolio-project-hero-content">
          <div className="portfolio-project-hero-topline">
            <p className="portfolio-project-hero-label">
              Selected work <span aria-hidden="true">/</span> Case study
            </p>
            <div className="portfolio-project-hero-meta">
              {publishedDate && (
                <span className="portfolio-project-published">
                  <span>Published</span>
                  <time dateTime={project.published_at ?? undefined}>
                    {publishedDate}
                  </time>
                </span>
              )}
              <span className="portfolio-project-status">
                {developmentStatus}
              </span>
            </div>
          </div>
          <div className="portfolio-project-hero-copy">
            <h1 className="portfolio-project-title">{project.title}</h1>
            <p className="portfolio-project-description">
              {project.short_description}
            </p>
            {(demoUrl || githubUrl) && (
              <div className="portfolio-project-hero-actions mt-7 flex flex-wrap gap-3">
                {demoUrl && (
                  <a
                    className="portfolio-project-hero-action portfolio-project-hero-action-primary"
                    href={demoUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Live demo <span aria-hidden="true">↗</span>
                  </a>
                )}
                {githubUrl && (
                  <a
                    className="portfolio-project-hero-action"
                    href={githubUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Source code <span aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            )}
            {cover?.caption && (
              <p className="portfolio-project-cover-caption">
                {cover.caption}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="portfolio-project-content">
        {skills.length > 0 && (
          <section
            aria-labelledby="project-skills-heading"
            className="portfolio-project-stack"
          >
            <h2 className="portfolio-eyebrow" id="project-skills-heading">
              Built with
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <li key={skill.id}>
                  <span className="portfolio-value-chip">{skill.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {project.overview_html && (
          <section
            aria-label="Project overview"
            className="portfolio-project-story mt-16 sm:mt-20"
          >
            <div className="portfolio-project-section-label">
              <p className="portfolio-eyebrow">
                <span className="portfolio-eyebrow-mark" />
                01 <span aria-hidden="true">/</span> The story
              </p>
            </div>
            <MarkdownContent html={overviewHtml} />
          </section>
        )}

        {gallery.length > 0 && (
          <section
            aria-labelledby="project-gallery-heading"
            className="portfolio-project-gallery-section mt-16 sm:mt-20"
          >
            <div className="portfolio-project-section-label">
              <h2 className="portfolio-eyebrow" id="project-gallery-heading">
                <span className="portfolio-eyebrow-mark" />
                {gallerySectionNumber} <span aria-hidden="true">/</span>{" "}
                Selected media
              </h2>
              <span className="portfolio-project-section-note">
                {gallery.length === 1 ? "1 item" : `${gallery.length} items`}
              </span>
            </div>
            <ul className="portfolio-project-gallery-grid mt-5 grid gap-4 sm:grid-cols-2">
              {gallery.map((media) => (
                <li
                  className={`portfolio-project-gallery-item ${
                    gallery.length === 1
                      ? "sm:col-span-2 sm:mx-auto sm:w-full sm:max-w-3xl"
                      : ""
                  }`}
                  key={media.media_id}
                >
                  <ProjectGalleryMedia
                    media={media}
                    projectTitle={project.title}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}

        {project.resources.length > 0 && (
          <section
            aria-labelledby="project-further-reading-heading"
            className="portfolio-project-resources mt-16 sm:mt-20"
          >
            <div className="portfolio-project-section-label">
              <h2 className="portfolio-eyebrow" id="project-further-reading-heading">
                <span className="portfolio-eyebrow-mark" />
                Further reading
              </h2>
              <span className="portfolio-project-section-note">
                Curated references
              </span>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {project.resources.map((resource) => (
                <li key={resource.id}>
                  <a
                    className="portfolio-project-resource"
                    href={resource.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="portfolio-project-resource-title">
                        {resource.title}
                      </span>
                      {resource.summary && (
                        <span className="portfolio-project-resource-filename">
                          {resource.summary}
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden="true"
                      className="portfolio-project-resource-arrow"
                    >
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {attachments.length > 0 && (
          <section
            aria-labelledby="project-resources-heading"
            className="portfolio-project-resources mt-16 sm:mt-20"
          >
            <div className="portfolio-project-section-label">
              <h2 className="portfolio-eyebrow" id="project-resources-heading">
                <span className="portfolio-eyebrow-mark" />
                {resourcesSectionNumber} <span aria-hidden="true">/</span>{" "}
                Downloads
              </h2>
              <span className="portfolio-project-section-note">
                {attachments.length === 1
                  ? "1 file"
                  : `${attachments.length} files`}
              </span>
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {attachments.map((attachment) => (
                <li key={attachment.media_id}>
                  <a
                    aria-label={`Download ${attachment.title || attachment.original_filename}`}
                    className="portfolio-project-resource"
                    href={mediaAssetUrl(attachment.file_url)}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span
                      aria-hidden="true"
                      className="portfolio-project-resource-type"
                    >
                      {fileExtension(attachment.original_filename)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="portfolio-project-resource-title">
                        {attachment.title || attachment.original_filename}
                      </span>
                      <span className="portfolio-project-resource-filename">
                        {attachment.original_filename}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="portfolio-project-resource-arrow"
                    >
                      ↓
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="portfolio-project-footer mt-16 sm:mt-20">
          <div>
            <p className="portfolio-eyebrow">More work</p>
            <p className="portfolio-project-footer-copy">
              Continue exploring projects and experiments.
            </p>
          </div>
          <Link
            className="portfolio-button portfolio-button-primary"
            href="/projects"
          >
            Browse all work <span aria-hidden="true">↗</span>
          </Link>
        </footer>
      </div>
    </article>
  );
}
