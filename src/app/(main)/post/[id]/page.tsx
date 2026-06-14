import type { Metadata } from 'next';
import PostClient from './PostClient';

/**
 * @file page.tsx (posts/[id])
 * @description Server component for post detail page that generates dynamic metadata.
 */

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  console.log('[generateMetadata] Fetching post preview:', params.id);

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${params.id}/preview`);
    console.log('[generateMetadata] Response status:', res.status);
    
    const data = await res.json();
    const post = data?.data?.post;

    if (!post) {
      console.log('[generateMetadata] No post found, using fallback');
      return {
        title: 'SoB ',
        description: 'Educational and social content platform.',
      };
    }

    const title = post.contentType === 'article' 
      ? post.title 
      : `${post.author.name} on SoB`;

    const description = post.body?.slice(0, 150) || 'Check out this post on SoB';

    const imageUrl = post.mediaUrls?.[0] || post.author.avatar || '/icons/icon-512.png';

    console.log('[generateMetadata] Generated:', { title, description, imageUrl });

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
  } catch (error) {
    console.error('Metadata generation error:', error);
    return {
      title: 'SoB',
      description: 'Educational and social content platform.',
    };
  }
}

export default function PostPage({ params }: { params: { id: string } }) {
  return <PostClient postId={params.id} />;
}
