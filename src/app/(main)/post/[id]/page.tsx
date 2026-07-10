import type { Metadata } from 'next';
import PostClient from './PostClient';

/**
 * @file page.tsx (posts/[id])
 * @description Server component for post detail page that generates dynamic metadata.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: postId } = await params;

  try {
    if (!postId) throw new Error('No post ID found in params');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${postId}/preview`);

    const data = await res.json();
    const post = data?.data?.post;

    if (!post) {
      return {
        title: 'SoB',
        description: 'Educational and social content platform.',
      };
    }

    const title = post.contentType === 'article'
      ? post.title
      : `${post.author.name} on SoB`;

    const description = post.body?.slice(0, 150) || 'Check out this post on SoB';

    const imageUrl = post.mediaUrls?.[0] || post.author.avatar || '/android-chrome-512x512.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [{ url: imageUrl, width: 512, height: 512, alt: post.author.name }],
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

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PostClient postId={id} />;
}
