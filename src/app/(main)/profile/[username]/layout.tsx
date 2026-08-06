import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const res = await fetch(`${apiUrl}/api/users/${username}`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 60 },
    });
    const data = await res.json();
    const profile = data?.data?.user;

    if (!profile) {
      return {
        title: 'User not found',
        description: 'This profile does not exist on SoB.',
      };
    }

    const imageUrl = profile.avatar || '/android-chrome-512x512.png';

    return {
      title: `${profile.name} (@${profile.username})`,
      description: profile.bio?.slice(0, 160) || `Check out ${profile.name} on SoB.`,
      openGraph: {
        title: `${profile.name} (@${profile.username})`,
        description: profile.bio?.slice(0, 160) || `Check out ${profile.name} on SoB.`,
        images: [{ url: imageUrl, width: 512, height: 512, alt: profile.name }],
        type: 'profile',
        siteName: 'SoB',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${profile.name} (@${profile.username})`,
        description: profile.bio?.slice(0, 160) || `Check out ${profile.name} on SoB.`,
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

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
