import { redirect } from 'next/navigation';

export default async function RootPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;

  if (searchParams.token && searchParams.refreshToken) {
    const isOnboarded = searchParams.isOnboarded || 'false';
    redirect(`/oauth-callback?token=${searchParams.token}&refreshToken=${searchParams.refreshToken}&isOnboarded=${isOnboarded}`);
  }

  redirect('/home');
}

