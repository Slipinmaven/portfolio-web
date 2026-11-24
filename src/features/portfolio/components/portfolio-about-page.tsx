import Link from "next/link";

import { portfolioContent } from "@/features/portfolio/data/site-content";

export function PortfolioAboutPage() {
  return (
    <article className="portfolio-about-page mx-auto w-full max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
      <header className="portfolio-writing-header grid gap-8 pb-12 sm:pb-16 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="portfolio-eyebrow">A little context</p>
          <h1 className="portfolio-display mt-5 max-w-[11ch] text-6xl leading-[0.9] sm:text-8xl">
            About this
            <span className="portfolio-display-accent block">practice.</span>
          </h1>
        </div>
        <p className="max-w-xl font-serif text-xl leading-relaxed text-muted sm:text-2xl">
          The work is only half the story. Here are a few of the ideas that
          shape the other half.
        </p>
      </header>

      <section className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[0.6fr_1.4fr]">
        <p className="portfolio-eyebrow">The point of view</p>
        <div>
          <p className="max-w-3xl font-serif text-2xl leading-relaxed sm:text-4xl sm:leading-relaxed">
            {portfolioContent.about}
          </p>
          <div className="mt-10 grid gap-4 border-t border-border pt-7 sm:grid-cols-3">
            {[
              {
                number: "01",
                title: "Stay curious",
                detail: "Ask better questions before reaching for easy answers.",
              },
              {
                number: "02",
                title: "Make it clear",
                detail: "Give every detail a reason to be where it is.",
              },
              {
                number: "03",
                title: "Care about craft",
                detail: "The small decisions add up to the whole experience.",
              },
            ].map((principle) => (
              <article className="pt-3" key={principle.number}>
                <p className="font-mono text-xs text-muted">
                  {principle.number}
                </p>
                <h2 className="mt-5 text-lg font-semibold tracking-tight">
                  {principle.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {principle.detail}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap gap-3 border-t border-border pt-8">
        <Link className="portfolio-button portfolio-button-primary" href="/projects">
          Browse the work <span aria-hidden="true">↗</span>
        </Link>
        <Link className="portfolio-button portfolio-button-quiet" href="/articles">
          Read the journal <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </article>
  );
}
