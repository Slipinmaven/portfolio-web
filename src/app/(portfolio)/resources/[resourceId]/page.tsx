import { notFound } from "next/navigation";

import { getPublishedResource } from "@/features/resources/api/resources-api";

export const instant = false;

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;
  const resource = await getPublishedResource(resourceId);
  if (!resource) notFound();
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 lg:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {resource.resource_type}
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">{resource.title}</h1>
      {resource.creator && <p className="mt-3 text-sm text-muted">{resource.creator}</p>}
      {resource.summary && <p className="mt-6 text-lg leading-8 text-muted">{resource.summary}</p>}
      {resource.commentary_html && (
        <div
          className="markdown-content mt-8"
          dangerouslySetInnerHTML={{ __html: resource.commentary_html }}
        />
      )}
      <a
        className="mt-8 inline-flex min-h-11 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background"
        href={resource.url}
        rel="noopener noreferrer"
        target="_blank"
      >
        Open resource ↗
      </a>
    </main>
  );
}
