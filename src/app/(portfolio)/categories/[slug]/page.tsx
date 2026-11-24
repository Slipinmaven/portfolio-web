import { notFound } from "next/navigation";
import Link from "next/link";

import { API_BASE_URL } from "@/lib/api/api-url";
import { getPublishedProjects } from "@/features/projects/api/public-projects";
import { getPublishedPosts } from "@/features/posts/api/public-posts";

export const instant = false;

async function getCategory(slug: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/categories/slug/${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("The category could not be loaded.");
  return response.json();
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const [projects, articles, notes] = await Promise.all([
    getPublishedProjects(0, 100, category.id),
    getPublishedPosts("ARTICLE", { limit: 100, categoryId: category.id }),
    getPublishedPosts("NOTE", { limit: 100, categoryId: category.id }),
  ]);
  const writingPosts = [...articles.posts, ...notes.posts];

  return (
    <div className="portfolio-category-page">
      <header className="portfolio-category-header">
        <div className="portfolio-category-heading">
          <p className="portfolio-eyebrow">Filed under / Category</p>
          <h1 className="portfolio-display portfolio-category-title">
            {category.name}
          </h1>
        </div>
        {category.description && (
          <p className="portfolio-category-intro">{category.description}</p>
        )}
      </header>
      <div className="portfolio-category-content">
        {projects.projects.length > 0 && (
          <section
            aria-labelledby="category-projects-heading"
            className="portfolio-category-section"
          >
            <div className="portfolio-category-section-heading">
              <div>
                <p className="portfolio-eyebrow">01 / Work</p>
                <h2 id="category-projects-heading">Projects</h2>
              </div>
              <p>
                {projects.projects.length}{" "}
                {projects.projects.length === 1 ? "project" : "projects"}
              </p>
            </div>
            <ol className="portfolio-category-list">
              {projects.projects.map((project, index) => (
                <li key={project.id}>
                  <Link
                    className="portfolio-category-item"
                    href={`/projects/${encodeURIComponent(project.slug)}`}
                  >
                    <span className="portfolio-category-item-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="portfolio-category-item-copy">
                      <h3>{project.title}</h3>
                      <p>{project.short_description}</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className="portfolio-category-item-arrow"
                    >
                      ↗
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {writingPosts.length > 0 && (
          <section
            aria-labelledby="category-writing-heading"
            className="portfolio-category-section"
          >
            <div className="portfolio-category-section-heading">
              <div>
                <p className="portfolio-eyebrow">02 / Words</p>
                <h2 id="category-writing-heading">Writing</h2>
              </div>
              <p>
                {writingPosts.length}{" "}
                {writingPosts.length === 1 ? "piece" : "pieces"}
              </p>
            </div>
            <ol className="portfolio-category-list">
              {writingPosts.map((post, index) => (
                <li key={post.id}>
                  <Link
                    className="portfolio-category-item"
                    href={`/${post.kind === "ARTICLE" ? "articles" : "notes"}/${encodeURIComponent(post.slug)}`}
                  >
                    <span className="portfolio-category-item-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="portfolio-category-item-copy">
                      <div className="portfolio-category-item-meta">
                        <span>
                          {post.kind === "ARTICLE" ? "Article" : "Note"}
                        </span>
                      </div>
                      <h3>{post.title}</h3>
                      {post.summary && <p>{post.summary}</p>}
                    </div>
                    <span
                      aria-hidden="true"
                      className="portfolio-category-item-arrow"
                    >
                      ↗
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        {projects.projects.length === 0 && writingPosts.length === 0 && (
          <section
            aria-labelledby="category-empty-heading"
            className="portfolio-category-empty"
          >
            <p className="portfolio-eyebrow">Nothing filed here yet</p>
            <h2 id="category-empty-heading">
              There are no published projects or posts in this category.
            </h2>
            <Link href="/projects">Explore all work <span aria-hidden="true">↗</span></Link>
          </section>
        )}
      </div>
    </div>
  );
}
