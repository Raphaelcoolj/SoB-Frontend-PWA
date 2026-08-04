'use client';

import React from 'react';
import ConversationsSidebar from '../../../components/layout/ConversationsSidebar';

export default function ChatsPage() {
  return (
    // Single view for all screen sizes — the mobile variant renders everything
    // (Chats header, connections, messages) which matches the screenshot on desktop too.
    <ConversationsSidebar variant="mobile" />
  );
}
