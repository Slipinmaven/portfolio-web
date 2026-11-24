import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublishedPost } from "@/features/posts/api/public-posts";
import { PublicPostDetailPage } from "@/features/posts/components/public-post-pages";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost("ARTICLE", slug);
  return post
    ? { title: post.title, description: post.summary ?? undefined }
    : { title: "Article not found" };
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading article…
        </p>
      }
    >
      <ArticleContent params={params} />
    </Suspense>
  );
}

async function ArticleContent({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost("ARTICLE", slug);
  if (!post) notFound();
  return <PublicPostDetailPage kind="ARTICLE" post={post} />;
}
