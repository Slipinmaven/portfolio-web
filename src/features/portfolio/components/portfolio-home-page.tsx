import Link from "next/link";

import type { ProjectSummary } from "@/features/projects/api/projects-api";
import { portfolioContent } from "@/features/portfolio/data/site-content";

function readableStatus(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

export function PortfolioHomePage({
  projects,
  totalProjects,
}: {
  projects: readonly ProjectSummary[];
  totalProjects: number;
}) {
  return (
    <div className="portfolio-home mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
      <section
        aria-labelledby="home-heading"
        className="portfolio-home-hero relative isolate grid min-h-[min(820px,calc(100svh-5rem))] items-center gap-8 overflow-hidden py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-24"
      >
        <div className="portfolio-hero-art absolute inset-y-8 right-0 -z-10 hidden w-[53%] rounded-[2.5rem] lg:block" />
        <div className="relative z-10 py-4">
          <p className="portfolio-eyebrow">
            <span aria-hidden="true" className="portfolio-eyebrow-mark" />A
            personal portfolio / work &amp; writing
          </p>
          <h1
            className="portfolio-display mt-7 max-w-[11ch] text-[clamp(3.75rem,9vw,8.5rem)] leading-[0.88]"
            id="home-heading"
          >
            Curious by nature.
            <span className="portfolio-display-accent mt-2 block">
              Intentional by design.
            </span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
            {portfolioContent.introduction}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              className="portfolio-button portfolio-button-primary"
              href="/projects"
            >
              Explore selected work
              <span aria-hidden="true">↗</span>
            </Link>
            <Link
              className="portfolio-button portfolio-button-quiet"
              href="/articles"
            >
              Read the journal
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted">
            <span>
              {String(totalProjects).padStart(2, "0")} published projects
            </span>
            <span className="hidden h-1 w-1 rounded-full bg-accent sm:block" />
            <span>Projects · articles · notes</span>
          </div>
        </div>

        <div
          aria-label="Abstract artwork representing ideas taking shape"
          className="portfolio-hero-art relative isolate flex min-h-[22rem] items-end overflow-hidden rounded-[2rem] p-6 sm:min-h-[30rem] sm:p-9 lg:min-h-[34rem]"
          role="img"
        >
          <svg
            aria-hidden="true"
            className="portfolio-orbit-art absolute inset-0 h-full w-full"
            fill="none"
            viewBox="0 0 640 640"
          >
            <circle cx="330" cy="300" r="220" stroke="currentColor" />
            <circle cx="330" cy="300" r="175" stroke="currentColor" />
            <circle cx="330" cy="300" r="130" stroke="currentColor" />
            <path
              d="M75 382 314 112l245 154-237 270L75 382Z"
              stroke="currentColor"
            />
            <path
              d="M75 382 559 266M314 112l8 424M184 259l292 145"
              stroke="currentColor"
            />
            <circle cx="330" cy="300" r="46" fill="currentColor" />
            <circle cx="508" cy="163" r="13" fill="currentColor" />
            <circle cx="139" cy="437" r="8" fill="currentColor" />
          </svg>
          <div className="portfolio-art-caption relative z-10 flex w-full items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
                The work is the point
              </p>
              <p className="mt-2 max-w-[12ch] font-serif text-3xl leading-tight sm:text-4xl">
                A little room for big ideas.
              </p>
            </div>
            <span aria-hidden="true" className="portfolio-art-stamp">
              01
            </span>
          </div>
        </div>

        <a
          className="portfolio-scroll-cue absolute bottom-4 left-0 hidden items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted lg:flex"
          href="#projects"
        >
          <span aria-hidden="true" className="portfolio-scroll-line" />
          Scroll to explore
        </a>
      </section>

      <section
        aria-labelledby="projects-heading"
        className="portfolio-section border-t border-border py-20 sm:py-28"
        id="projects"
      >
        <header className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="portfolio-eyebrow">01 / Selected work</p>
            <h2
              className="portfolio-section-heading mt-4"
              id="projects-heading"
            >
              Made, tested,{" "}
              <span className="font-serif font-normal italic">refined.</span>
            </h2>
          </div>
          <Link className="portfolio-text-link" href="/projects">
            View all projects <span aria-hidden="true">↗</span>
          </Link>
        </header>

        {projects.length > 0 ? (
          <ul className="portfolio-project-grid mt-10 grid gap-4 lg:grid-cols-2">
            {projects.map((project, index) => (
              <li key={project.id}>
                <Link
                  className={`portfolio-project-card portfolio-project-card-${index % 4} group block h-full`}
                  href={`/projects/${encodeURIComponent(project.slug)}`}
                >
                  <div className="portfolio-project-art" aria-hidden="true">
                    <span className="portfolio-project-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="portfolio-project-art-word">
                      {project.title.slice(0, 1)}
                    </span>
                    <span className="portfolio-project-open">
                      Explore project <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                  <div className="portfolio-project-copy">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="portfolio-eyebrow">
                        {project.is_featured ? "Featured project" : "Project"}{" "}
                        <span aria-hidden="true">·</span>{" "}
                        {readableStatus(project.development_status)}
                      </p>
                      <span className="portfolio-card-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                      {project.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
                      {project.short_description}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="portfolio-empty-work mt-10 grid gap-8 rounded-[1.75rem] p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="portfolio-eyebrow">A space in progress</p>
              <h3 className="mt-4 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">
                The next good thing starts somewhere.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
                Published projects will take their place here. Until then, spend
                a little time with the writing.
              </p>
            </div>
            <Link
              className="portfolio-button portfolio-button-secondary"
              href="/articles"
            >
              Browse the journal <span aria-hidden="true">↗</span>
            </Link>
          </div>
        )}
      </section>

      <section
        aria-labelledby="about-heading"
        className="portfolio-about-section grid gap-10 border-t border-border py-20 sm:py-28 lg:grid-cols-[0.7fr_1.3fr]"
        id="about"
      >
        <div>
          <p className="portfolio-eyebrow">02 / The practice</p>
          <h2 className="portfolio-section-heading mt-4" id="about-heading">
            Work with{" "}
            <span className="font-serif font-normal italic">
              a point of view.
            </span>
          </h2>
        </div>
        <div className="lg:pt-12">
          <p className="max-w-3xl font-serif text-2xl leading-relaxed sm:text-3xl">
            {portfolioContent.about}
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Curiosity", "Clarity", "Craft"].map((value) => (
              <span className="portfolio-value-chip" key={value}>
                {value}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="writing-heading"
        className="portfolio-writing-band grid gap-8 rounded-[1.75rem] p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center"
        id="writing"
      >
        <div>
          <p className="portfolio-eyebrow">03 / Notes from the process</p>
          <h2 className="mt-4 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
            Thinking out loud, one idea at a time.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
            Articles go deep. Notes keep the useful details close at hand.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="portfolio-button portfolio-button-secondary"
            href="/articles"
          >
            Articles <span aria-hidden="true">↗</span>
          </Link>
          <Link
            className="portfolio-button portfolio-button-quiet"
            href="/notes"
          >
            Short notes <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="next-heading"
        className="portfolio-contact-section mt-20 grid gap-8 py-16 sm:mt-28 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div>
          <p className="portfolio-eyebrow">Keep exploring</p>
          <h2
            className="portfolio-display mt-4 max-w-[12ch] text-5xl leading-[0.95] sm:text-7xl"
            id="next-heading"
          >
            There&apos;s more to the story.
            <span className="portfolio-display-accent mt-2 block">
              Take a closer look.
            </span>
          </h2>
        </div>
        <div className="lg:max-w-xs">
          <p className="text-sm leading-6 text-muted sm:text-base sm:leading-7">
            Browse the work, or visit the About page for more context on the
            ideas behind this portfolio.
          </p>
          <Link
            className="portfolio-button portfolio-button-primary mt-6"
            href="/about-this-portfolio"
          >
            About this portfolio <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
