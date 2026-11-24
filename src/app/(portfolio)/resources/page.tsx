import Link from "next/link";

import { getPublishedResources } from "@/features/resources/api/resources-api";

export const instant = false;

export default async function ResourcesPage() {
  const response = await getPublishedResources();

  return (
    <div className="portfolio-resource-index">
      <header className="portfolio-resource-index-header">
        <div className="portfolio-resource-index-heading">
          <p className="portfolio-eyebrow">Curated library / 01</p>
          <h1 className="portfolio-display portfolio-resource-index-title">
            Resources
          </h1>
        </div>
        <div className="portfolio-resource-index-intro">
          <p>A collection of tools, guides, and references worth keeping close.</p>
          <aside
            aria-label={`${response.total} published ${
              response.total === 1 ? "resource" : "resources"
            }`}
            className="portfolio-resource-index-count"
          >
            <span>{String(response.total).padStart(2, "0")}</span>
            <p>
              {response.total === 1 ? "resource" : "resources"} published
            </p>
            {response.total > 0 && (
              <a href="#resource-list">
                Browse <span aria-hidden="true">↓</span>
              </a>
            )}
          </aside>
        </div>
      </header>

      {response.resources.length === 0 ? (
        <section
          aria-labelledby="resources-empty-heading"
          className="portfolio-resource-empty"
        >
          <p className="portfolio-eyebrow">The library is quiet</p>
          <div>
            <h2 id="resources-empty-heading">No published resources yet.</h2>
            <p>
              In the meantime, explore the articles and notes for practical
              ideas and references.
            </p>
            <div className="portfolio-resource-empty-links">
              <Link href="/articles">Read articles <span aria-hidden="true">↗</span></Link>
              <Link href="/notes">Read notes <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>
      ) : (
        <section
          aria-label="Published resources"
          className="portfolio-resource-list-section"
          id="resource-list"
        >
          <div className="portfolio-resource-section-heading">
            <p className="portfolio-eyebrow">01 / Saved references</p>
            <p>{response.total} published</p>
          </div>
          <ol className="portfolio-resource-list">
            {response.resources.map((resource, index) => (
              <li key={resource.id}>
                <article className="portfolio-resource-item">
                  <span className="portfolio-resource-item-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="portfolio-resource-item-copy">
                    <div className="portfolio-resource-item-meta">
                      <span>{resource.resource_type}</span>
                      {resource.creator && <span>{resource.creator}</span>}
                    </div>
                    <h2>
                      <a
                        href={resource.url}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {resource.title}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    </h2>
                    {resource.summary && <p>{resource.summary}</p>}
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
