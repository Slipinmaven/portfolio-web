import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getPublishedPage } from "@/features/pages/api/public-pages";
import { PublicPageView } from "@/features/pages/components/public-page-view";
import { PortfolioAboutPage } from "@/features/portfolio/components/portfolio-about-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "home") {
    return { title: "Home", alternates: { canonical: "/" } };
  }
  const page = await getPublishedPage(slug);
  if (!page && slug === "about") {
    return {
      title: "About",
      description: "The ideas and principles behind this portfolio.",
    };
  }
  return page
    ? { title: page.title, description: page.summary ?? undefined }
    : { title: "Page not found" };
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading page…
        </p>
      }
    >
      <PageContent params={params} />
    </Suspense>
  );
}

async function PageContent({ params }: Props) {
  const { slug } = await params;
  if (slug === "home") redirect("/");
  const page = await getPublishedPage(slug);
  if (!page && slug === "about") return <PortfolioAboutPage />;
  if (!page) notFound();
  return <PublicPageView page={page} />;
}
