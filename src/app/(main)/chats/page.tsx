'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import ConversationsSidebar from '../../../components/layout/ConversationsSidebar';

export default function ChatsPage() {
  const router = useRouter();

  return (
    <>
      {/* Mobile View */}
      <div className="block lg:hidden">
        <ConversationsSidebar variant="mobile" />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:flex flex-col h-screen">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
          <button
            onClick={() => router.push('/home')}
            className="p-1.5 rounded-full hover:bg-muted text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Chats</h1>
        </div>
        <div className="flex-1 flex">
          <div className="w-[350px] h-full flex-shrink-0 border-r border-border/60">
            <ConversationsSidebar variant="desktop" />
          </div>
          <div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground">
            <div className="max-w-md text-center space-y-4 px-6">
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border/50 flex items-center justify-center mx-auto shadow-lg">
                <MessageSquare className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Select a conversation</h2>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Choose a contact or conversation from the sidebar list to start chatting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
