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
  const post = await getPublishedPost("NOTE", slug);
  return post
    ? { title: post.title, description: post.summary ?? undefined }
    : { title: "Note not found" };
}

export default function Page({ params }: Props) {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center text-sm text-muted" role="status">
          Loading note…
        </p>
      }
    >
      <NoteContent params={params} />
    </Suspense>
  );
}

async function NoteContent({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedPost("NOTE", slug);
  if (!post) notFound();
  return <PublicPostDetailPage kind="NOTE" post={post} />;
}
