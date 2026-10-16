'use client';

// Decline a game invitation (linked from the chat game bubble).

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { declineInvitation } from '../../../../../../services/game';

export default function DeclineInvitePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const invitationId = params?.id;
  const started = useRef(false);

  useEffect(() => {
    if (!invitationId || started.current) return;
    started.current = true;
    declineInvitation(invitationId)
      .then(() => {
        toast.success('Invitation declined');
        router.replace('/chats');
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : 'Failed to decline invitation');
        router.replace('/games');
      });
  }, [invitationId, router]);

  return (
    <div className="p-6 flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Declining invitation…</p>
    </div>
  );
}
