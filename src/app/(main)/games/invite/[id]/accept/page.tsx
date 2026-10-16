'use client';

// Accept a game invitation (linked from the chat game bubble).
// Navigates to the play page on success.

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { acceptInvitation } from '../../../../../../services/game';

export default function AcceptInvitePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invitationId = params?.id;
  const started = useRef(false);

  useEffect(() => {
    if (!invitationId || started.current) return;
    started.current = true;
    acceptInvitation(invitationId)
      .then(({ game }) => {
        toast.success('Game accepted');
        router.replace(`/games/play/${game.gameId}`);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to accept invitation');
        router.replace('/games');
      });
  }, [invitationId, router]);

  return (
    <div className="p-6 flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Accepting invitation…</p>
    </div>
  );
}
