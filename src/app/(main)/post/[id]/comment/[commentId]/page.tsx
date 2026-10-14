import type { Metadata } from 'next';
import CommentThread from '../../../../../../components/comment/CommentThread';

/**
 * @file page.tsx (post/[id]/comment/[commentId])
 * @description Comment permalink — focused comment thread view with the
 * ancestor chain and post header. Shares the post's metadata generator
 * (the post is the canonical share card).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; commentId: string }>;
}): Promise<Metadata> {
  const { commentId } = await params;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/comments/${commentId}/context`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 60 },
    });
    const data = await res.json();
    const ctx = data?.data;
    if (!ctx?.comment) {
      return { title: 'SoB', description: 'Educational and social content platform.' };
    }

    const authorName = ctx.comment.author?.name ?? 'Someone';
    const title = `${authorName} commented on SoB`;
    const description = (ctx.comment.body || '').slice(0, 150) || 'View this comment on SoB';
    const imageUrl =
      ctx.post?.mediaUrls?.[0] || ctx.post?.author?.avatar || '/android-chrome-512x512.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: imageUrl, width: 512, height: 512, alt: authorName }],
        type: 'article',
        siteName: 'SoB',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: 'SoB',
      description: 'Educational and social content platform.',
    };
  }
}

export default async function CommentPermalinkPage({
  params,
}: {
  params: Promise<{ id: string; commentId: string }>;
}) {
  const { id: postId, commentId } = await params;
  return (
    <div className="min-h-screen">
      <CommentThread postId={postId} commentId={commentId} />
    </div>
  );
}
