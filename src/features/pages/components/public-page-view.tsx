import { getCachedPublicSiteSettings } from "@/features/site-settings/api/public-site-settings";
import { PublicContactPage } from "@/features/site-settings/components/public-contact-page";
import type { PublicPage } from "@/features/pages/api/page-types";
import { AboutPageLayout } from "@/features/pages/components/about-page-layout";
import { PageBlockRenderer } from "@/features/pages/components/page-block-renderer";

export async function PublicPageView({ page }: { page: PublicPage }) {
  if (page.system_key === "CONTACT") {
    const settings = await getCachedPublicSiteSettings();
    return <PublicContactPage page={page} settings={settings} />;
  }

  if (page.system_key === "ABOUT") {
    const hasHero = page.sections.some((section) => section.type === "HERO");
    return (
      <AboutPageLayout
        hasHero={hasHero}
        summary={page.summary}
        title={page.title}
      >
        <PageBlockRenderer
          aboutPageSummary={page.summary}
          aboutPageTitle={page.title}
          images={page.images}
          isAboutPage
          mode="public"
          pages={page.pages}
          posts={page.posts}
          projects={page.projects}
          renderedMarkdown={page.rendered_markdown}
          sections={page.sections}
        />
      </AboutPageLayout>
    );
  }

  const startsWithHero =
    page.slug === "home" &&
    page.sections.some((section) => section.type === "HERO");

  return (
    <article
      className={`portfolio-public-page mx-auto w-full max-w-[1440px] px-5 py-10 sm:px-8 sm:py-16 lg:px-12 ${
        page.slug === "home" ? "portfolio-home-page" : ""
      }`}
    >
      {!startsWithHero && (
        <header
          className="portfolio-public-page-header mx-auto mb-10 max-w-5xl sm:mb-14"
        >
          <p className="portfolio-eyebrow">
            {page.slug === "home"
              ? "Portfolio / the home page"
              : "Page / published"}
          </p>
          <h1 className="portfolio-display mt-5 max-w-[12ch] break-words text-5xl leading-[0.95] sm:text-7xl">
            {page.title}
          </h1>
          {page.summary && (
            <p className="mt-5 max-w-3xl font-serif text-xl leading-relaxed text-muted sm:text-2xl">
              {page.summary}
            </p>
          )}
        </header>
      )}
      <PageBlockRenderer
        images={page.images}
        mode="public"
        pages={page.pages}
        posts={page.posts}
        projects={page.projects}
        renderedMarkdown={page.rendered_markdown}
        sections={page.sections}
        isHomepage={page.slug === "home"}
      />
    </article>
  );
}
