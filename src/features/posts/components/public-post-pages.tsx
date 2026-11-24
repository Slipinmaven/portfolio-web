import Link from "next/link";

import {
  getPublishedPosts,
} from "@/features/posts/api/public-posts";
import type {
  PostKind,
  PublicPost,
} from "@/features/posts/api/post-types";
import { mediaAssetUrl } from "@/features/media/api/media-api";
import { MarkdownContent } from "@/features/posts/components/markdown-content";

function kindLabel(kind: PostKind): string {
  return kind === "ARTICLE" ? "Articles" : "Notes";
}

function pathForKind(kind: PostKind): string {
  return kind === "ARTICLE" ? "/articles" : "/notes";
}

function pathForPost(post: { kind: PostKind; slug: string }): string {
  return `${pathForKind(post.kind)}/${encodeURIComponent(post.slug)}`;
}

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formattedCompactDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formattedFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export async function PublicPostListPage({
  kind,
}: {
  kind: PostKind;
}) {
  const { posts, total } = await getPublishedPosts(kind);
  const isArticle = kind === "ARTICLE";
  const isNote = kind === "NOTE";
  const label = kindLabel(kind);
  const otherKind = kind === "ARTICLE" ? "NOTE" : "ARTICLE";
  const otherLabel = kindLabel(otherKind);

  return (
    <div
      className={`portfolio-writing-page mx-auto w-full max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12${isArticle ? " portfolio-article-index" : ""}${isNote ? " portfolio-note-index" : ""}`}
    >
      <header
        className={`portfolio-writing-header grid gap-8 border-b border-border pb-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:pb-12${isArticle ? " portfolio-article-index-header" : ""}${isNote ? " portfolio-note-index-header" : ""}`}
      >
        {isArticle ? (
          <>
            <div className="portfolio-article-index-heading">
              <p className="portfolio-eyebrow">Journal</p>
              <h1 className="portfolio-display portfolio-article-index-title">
                Articles
              </h1>
            </div>
            <div className="portfolio-article-index-intro">
              <p>
                Long-form writing about the work, tools, and ideas behind my
                projects.
              </p>
              <span>
                {String(total).padStart(2, "0")}{" "}
                {total === 1 ? "article" : "articles"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="portfolio-note-index-heading">
              <p className="portfolio-eyebrow">Field notes</p>
              <h1 className="portfolio-display portfolio-note-index-title">
                Notes
              </h1>
            </div>
            <p className="portfolio-note-index-intro">
              Short, practical notes worth keeping close.
            </p>
          </>
        )}
      </header>

      <section
        aria-label={isArticle ? "Articles" : undefined}
        aria-labelledby={isArticle ? undefined : "latest-writing-heading"}
        className={
          isArticle
            ? "portfolio-article-index-section"
            : isNote
              ? "portfolio-note-index-section"
              : "pt-8 sm:pt-10"
        }
      >
        {!isArticle && !isNote && (
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="latest-writing-heading"
              className="font-serif text-2xl font-normal tracking-tight"
            >
              Latest field notes
            </h2>
            <p className="text-sm text-muted">
              {total} {total === 1 ? "post" : "posts"}
            </p>
          </div>
        )}

        {posts.length > 0 ? (
          <ol
            className={
              isArticle
                ? "portfolio-article-index-list"
                : isNote
                  ? "portfolio-note-index-list"
                  : "mt-5 divide-y divide-border border-y border-border"
            }
          >
            {posts.map((post, index) => (
              <li key={post.id}>
                {isArticle ? (
                    <Link
                      className={`portfolio-article-index-item group${index === 0 ? " portfolio-article-index-item-featured" : ""}`}
                      href={pathForPost(post)}
                    >
                      <div className="portfolio-article-index-meta">
                        <time dateTime={post.published_at}>
                          {formattedCompactDate(post.published_at)}
                        </time>
                        {post.categories.map((category) => (
                          <span key={category.id}>{category.name}</span>
                        ))}
                      </div>
                      <h2 className="portfolio-article-index-post-title">
                        {post.title}
                      </h2>
                      {post.summary && (
                        <p className="portfolio-article-index-summary">
                          {post.summary}
                        </p>
                      )}
                      <span
                        aria-hidden="true"
                        className="portfolio-article-index-arrow"
                      >
                        →
                      </span>
                    </Link>
                ) : isNote ? (
                  <Link
                    className="portfolio-note-index-card group"
                    href={pathForPost(post)}
                  >
                    <span
                      aria-hidden="true"
                      className="portfolio-note-index-number"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="portfolio-note-index-copy">
                      <div className="portfolio-note-index-meta">
                        <time dateTime={post.published_at}>
                          {formattedCompactDate(post.published_at)}
                        </time>
                        {post.categories.map((category) => (
                          <span key={category.id}>{category.name}</span>
                        ))}
                      </div>
                      <h2 className="portfolio-note-index-post-title">
                        {post.title}
                      </h2>
                      {post.summary && (
                        <p className="portfolio-note-index-summary">
                          {post.summary}
                        </p>
                      )}
                    </div>
                    <span
                      aria-hidden="true"
                      className="portfolio-note-index-arrow"
                    >
                      ↗
                    </span>
                  </Link>
                ) : (
                  <Link
                    className="portfolio-writing-item group grid gap-3 py-7 transition-colors sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-8 sm:py-8"
                    href={pathForPost(post)}
                  >
                    <time
                      className="pt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted"
                      dateTime={post.published_at}
                    >
                      {formattedDate(post.published_at)}
                    </time>
                    <article>
                      <div className="flex items-start justify-between gap-5">
                        <h3 className="text-xl font-semibold tracking-[-0.04em] underline-offset-4 group-hover:underline sm:text-3xl">
                          {post.title}
                        </h3>
                        <span className="mt-1 flex shrink-0 items-center gap-2 text-sm font-medium text-muted transition-colors group-hover:text-foreground">
                          Read
                          <svg
                            aria-hidden="true"
                            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            fill="none"
                            viewBox="0 0 16 16"
                          >
                            <path
                              d="M3.5 8h9m0 0-3.5-3.5M12.5 8 9 11.5"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </span>
                      </div>
                      {post.summary && (
                        <p className="mt-3 max-w-3xl leading-7 text-muted">
                          {post.summary}
                        </p>
                      )}
                      {post.categories.length > 0 && (
                        <ul
                          aria-label="Categories"
                          className="mt-4 flex flex-wrap gap-2"
                        >
                          {post.categories.map((category) => (
                            <li
                              key={category.id}
                              className="rounded-full border border-border px-3 py-1 text-xs text-muted"
                            >
                              {category.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <div className="portfolio-empty-work mt-6 grid gap-6 rounded-[1.75rem] p-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-10">
            <div>
              <p className="portfolio-eyebrow">A page with room to grow</p>
              <p className="mt-3 font-serif text-2xl leading-tight sm:text-3xl">
                Nothing published here just yet.
              </p>
              <p className="mt-2 max-w-xl leading-7 text-muted">
                New {label.toLowerCase()} will appear here when they are
                published. For now, explore the {otherLabel.toLowerCase()}.
              </p>
            </div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
              href={pathForKind(otherKind)}
            >
              Browse {otherLabel.toLowerCase()}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
        {total > posts.length && (
          <p className="mt-6 text-center text-sm text-muted">
            Showing the latest {posts.length} of {total}{" "}
            {label.toLowerCase()}.
          </p>
        )}
      </section>
    </div>
  );
}

export async function PublicPostDetailPage({
  kind,
  post,
}: {
  kind: PostKind;
  post: PublicPost;
}) {
  if (kind === "ARTICLE") {
    return <PublicArticleDetailPage post={post} />;
  }

  const otherKind: PostKind = "ARTICLE";

  return (
    <article className="portfolio-writing-page portfolio-post-detail mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-20">
      <Link
        className="portfolio-text-link"
        href={pathForKind(kind)}
      >
        <span aria-hidden="true">←</span> All {kindLabel(kind).toLowerCase()}
      </Link>
      <header className="portfolio-post-header mt-10 pb-9 sm:mt-14 sm:pb-12">
        <div className="portfolio-post-header-copy">
          <div className="flex flex-wrap items-center gap-3">
            <span className="portfolio-value-chip">Note</span>
            <time
              className="text-sm text-muted"
              dateTime={post.published_at}
            >
              {formattedDate(post.published_at)}
            </time>
          </div>
          <h1 className="portfolio-display mt-6 max-w-4xl text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
            {post.title}
          </h1>
          {post.summary && (
            <p className="mt-6 max-w-3xl text-lg leading-8 text-muted sm:text-xl sm:leading-9">
              {post.summary}
            </p>
          )}
        </div>
        {post.categories.length > 0 && (
          <aside className="portfolio-post-header-meta">
            <p>Filed under</p>
            <ul aria-label="Categories">
              {post.categories.map((category) => (
                <li key={category.id}>{category.name}</li>
              ))}
            </ul>
          </aside>
        )}
      </header>
      <div className="public-post-body portfolio-post-content mx-auto mt-10 w-full max-w-[72ch] sm:mt-14">
        <MarkdownContent html={post.body_html} />
      </div>
      {post.attachments.length > 0 && (
        <section
          aria-labelledby="post-attachments-heading"
          className="mx-auto mt-14 w-full max-w-[72ch] border-t border-border pt-8"
        >
          <h2
            id="post-attachments-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Downloads
          </h2>
          <ul className="mt-4 grid gap-3">
            {post.attachments.map((attachment) => (
              <li key={attachment.media_id}>
                <a
                  className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-soft-surface"
                  href={mediaAssetUrl(attachment.file_url)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {attachment.title || attachment.original_filename}
                    </span>
                    <span className="mt-1 block text-sm text-muted">
                      {attachment.mime_type} ·{" "}
                      {formattedFileSize(attachment.size_bytes)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium">Download</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {post.related_projects.length > 0 && (
        <section
          aria-labelledby="related-projects-heading"
          className="mt-16 border-t border-border pt-8"
        >
          <h2
            id="related-projects-heading"
            className="text-xl font-semibold tracking-tight"
          >
            Related projects
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {post.related_projects.map((project) => (
              <li key={project.id}>
                <Link
                  className="block h-full rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-soft-surface"
                  href={`/projects/${encodeURIComponent(project.slug)}`}
                >
                  <span className="font-medium">{project.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-muted">
                    {project.short_description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {post.resources.length > 0 && (
        <section aria-labelledby="article-resources-heading">
          <p className="portfolio-article-rail-kicker">Further reading</p>
          <h2 id="article-resources-heading">Resources</h2>
          <ul className="grid gap-2">
            {post.resources.map((resource) => (
              <li key={resource.id}>
                <a
                  className="block rounded-xl border border-border px-3 py-3 hover:bg-soft-surface"
                  href={resource.url}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className="block text-sm font-semibold">
                    {resource.title} ↗
                  </span>
                  {resource.summary && (
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      {resource.summary}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
        <Link
          className="text-sm font-semibold underline underline-offset-4"
          href={pathForKind(kind)}
        >
          Back to {kindLabel(kind).toLowerCase()}
        </Link>
        <Link
          className="text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
          href={pathForKind(otherKind)}
        >
          Explore {kindLabel(otherKind).toLowerCase()}
        </Link>
      </footer>
    </article>
  );
}

function PublicArticleDetailPage({ post }: { post: PublicPost }) {
  const hasResources =
    post.attachments.length > 0 ||
    post.related_projects.length > 0 ||
    post.resources.length > 0;

  return (
    <article className="portfolio-writing-page portfolio-article-detail mx-auto w-full max-w-[1500px] px-5 pb-20 pt-8 sm:px-8 sm:pt-12 lg:px-12">
      <Link className="portfolio-article-back-link" href="/articles">
        <span aria-hidden="true">←</span>
        <span>All articles</span>
      </Link>

      <header className="portfolio-article-hero mt-6">
        <div className="portfolio-article-hero-copy">
          <p className="portfolio-eyebrow">Journal / Long-form</p>
          <h1 className="portfolio-display portfolio-hero-title">
            {post.title}
          </h1>
          {post.summary && (
            <p className="portfolio-article-summary">{post.summary}</p>
          )}
        </div>
        <div className="portfolio-article-hero-meta">
          <div>
            <p className="portfolio-article-meta-label">Published</p>
            <time dateTime={post.published_at}>
              {formattedDate(post.published_at)}
            </time>
          </div>
          {post.categories.length > 0 && (
            <div>
              <p className="portfolio-article-meta-label">Filed under</p>
              <ul aria-label="Categories">
                {post.categories.map((category) => (
                  <li key={category.id}>{category.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      <div
        className={`portfolio-article-layout${hasResources ? " portfolio-article-layout-with-resources" : ""}`}
      >
        <div className="public-post-body portfolio-article-body">
          <MarkdownContent html={post.body_html} />
        </div>
        {hasResources && (
          <aside
            aria-label="Related reading and downloads"
            className="portfolio-article-rail"
          >
            {post.related_projects.length > 0 && (
              <section aria-labelledby="article-related-projects-heading">
                <p className="portfolio-article-rail-kicker">Connected work</p>
                <h2 id="article-related-projects-heading">Related project</h2>
                <ul>
                  {post.related_projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        className="portfolio-article-related-card"
                        href={`/projects/${encodeURIComponent(project.slug)}`}
                      >
                        <span className="portfolio-article-related-title">
                          {project.title}
                        </span>
                        <span className="portfolio-article-related-description">
                          {project.short_description}
                        </span>
                        <span className="portfolio-article-related-action">
                          Explore project <span aria-hidden="true">↗</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {post.attachments.length > 0 && (
              <section aria-labelledby="article-attachments-heading">
                <p className="portfolio-article-rail-kicker">Take it with you</p>
                <h2 id="article-attachments-heading">Downloads</h2>
                <ul className="portfolio-article-downloads">
                  {post.attachments.map((attachment) => (
                    <li key={attachment.media_id}>
                      <a href={mediaAssetUrl(attachment.file_url)}>
                        <span className="portfolio-article-download-title">
                          {attachment.title || attachment.original_filename}
                        </span>
                        <span className="portfolio-article-download-meta">
                          {attachment.mime_type} ·{" "}
                          {formattedFileSize(attachment.size_bytes)}
                        </span>
                        <span
                          aria-hidden="true"
                          className="portfolio-article-download-arrow"
                        >
                          ↓
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        )}
      </div>

      <footer className="portfolio-article-footer">
        <div>
          <p className="portfolio-article-rail-kicker">Keep reading</p>
          <p>More ideas from the journal.</p>
        </div>
        <div>
          <Link href="/articles">All articles <span aria-hidden="true">→</span></Link>
          <Link href="/notes">Field notes <span aria-hidden="true">→</span></Link>
        </div>
      </footer>
    </article>
  );
}
