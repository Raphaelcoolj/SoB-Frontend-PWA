import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center sm:p-4">
        <div className="w-full max-w-md mx-auto sm:bg-card sm:border sm:border-border sm:rounded-3xl sm:shadow-xl sm:p-8 min-h-screen sm:min-h-0 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
