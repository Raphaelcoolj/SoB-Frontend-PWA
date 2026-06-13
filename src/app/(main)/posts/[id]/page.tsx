import { Metadata, ResolvingMetadata } from 'next';
import PostClientPage from './PostClientPage';

// Server-side fetch for SEO
async function getPost(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/posts/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data.post;
}

export async function generateMetadata(
  { params }: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const post = await getPost(params.id);

  if (!post) {
    return { title: 'Post Not Found' };
  }

  const title = `${post.author.name} (@${post.author.username}) on SoB`;
  const description = post.body ? post.body.substring(0, 150) + '...' : 'Check out this post on SoB';
  
  // Assuming post.image is the field for image, adjust based on your model
  const imageUrl = post.image || `${process.env.NEXT_PUBLIC_URL}/api/og?title=${encodeURIComponent(post.author.username)}`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [imageUrl],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: { params: { id: string } }) {
  const post = await getPost(params.id);
  return <PostClientPage initialPost={post} postId={params.id} />;
}
