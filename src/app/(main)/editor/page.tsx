'use client';

/**
 * @file page.tsx (editor)
 * @description Standalone SoB Image Editor route used for testing the editor
 * in isolation. The source is passed via `sessionStorage['sob-editor-source']`
 * (JSON EditorSource) so the caller can open it without a navigation reload
 * killing the object URL. The primary entry point is the inline editor on the
 * create page; this route downloads the result on Done.
 */

import { useEffect, useState } from 'react';
import { SoBImageEditor } from '../../../components/editor/SoBImageEditor';
import type { EditorResult, EditorSource } from '../../../lib/editor/types';

const STORAGE_KEY = 'sob-editor-source';

export default function EditorPage() {
  const [source, setSource] = useState<EditorSource | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as EditorSource;
          if (parsed?.uri) setSource(parsed);
        }
      } catch {
        /* ignore malformed storage */
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleDone = (result: EditorResult) => {
    const url = URL.createObjectURL(result.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.history.back();
  };

  if (!ready) return null;

  if (!source) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-black text-white">
        <p className="text-sm text-white/60">No image source provided.</p>
        <a href="/create" className="rounded-xl bg-accent px-4 py-2 text-sm font-medium">
          Go to Create
        </a>
      </div>
    );
  }

  return <SoBImageEditor source={source} onClose={() => window.history.back()} onDone={handleDone} />;
}
