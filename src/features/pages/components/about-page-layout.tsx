import Link from "next/link";
import type { ReactNode } from "react";

export function AboutPageLayout({
  title,
  summary,
  children,
  previewOnly = false,
  hasHero = false,
}: {
  title: string;
  summary: string | null;
  children: ReactNode;
  previewOnly?: boolean;
  hasHero?: boolean;
}) {
  return (
    <article
      className={`portfolio-about-profile mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12 ${
        previewOnly ? "portfolio-site" : ""
      }`}
    >
      {!hasHero && (
        <header className="portfolio-about-masthead">
          <p className="portfolio-eyebrow">
            <span aria-hidden="true" className="portfolio-eyebrow-mark" />
            Profile
          </p>
          <div
            className={`portfolio-about-masthead-main ${
              summary ? "" : "portfolio-about-masthead-main-no-summary"
            }`}
          >
            <h1 className="portfolio-display portfolio-about-title">{title}</h1>
            {summary && <p className="portfolio-about-summary">{summary}</p>}
          </div>
        </header>
      )}

      <div className="portfolio-about-content" id="about-content">
        {children}
      </div>

      <footer className="portfolio-about-cta">
        <div>
          <p className="portfolio-eyebrow">Contact</p>
          <h2>Want to work together?</h2>
        </div>
        <div className="portfolio-about-cta-links">
          {previewOnly ? (
            <>
              <span className="portfolio-about-cta-primary">
                Get in touch <span aria-hidden="true">↗</span>
              </span>
              <span className="portfolio-about-cta-secondary">
                Browse the work <span aria-hidden="true">↗</span>
              </span>
            </>
          ) : (
            <>
              <Link className="portfolio-about-cta-primary" href="/contact">
                Get in touch <span aria-hidden="true">↗</span>
              </Link>
              <Link className="portfolio-about-cta-secondary" href="/projects">
                Browse the work <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </div>
      </footer>
    </article>
  );
}
