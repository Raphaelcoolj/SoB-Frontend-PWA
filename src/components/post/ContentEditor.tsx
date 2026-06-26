'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Bold, Italic, Heading, List, ListOrdered, Link, Link2Off } from 'lucide-react';

interface ContentEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

type ActiveState = {
  bold: boolean;
  italic: boolean;
  h2: boolean;
  h3: boolean;
  ul: boolean;
  ol: boolean;
  link: boolean;
};

export default function ContentEditor({ value, onChange, placeholder = 'Start writing...', minHeight = '200px' }: ContentEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdating = useRef(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState<ActiveState>({
    bold: false, italic: false, h2: false, h3: false, ul: false, ol: false, link: false,
  });
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (editorRef.current && !isUpdating.current) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
      linkInputRef.current.select();
    }
  }, [showLinkInput]);

  const refreshActive = useCallback(() => {
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      h2: document.queryCommandValue('formatBlock')?.toLowerCase() === 'h2',
      h3: document.queryCommandValue('formatBlock')?.toLowerCase() === 'h3',
      ul: document.queryCommandState('insertUnorderedList'),
      ol: document.queryCommandState('insertOrderedList'),
      link: document.queryCommandState('createLink'),
    });
  }, []);

  const emitChange = useCallback(() => {
    if (editorRef.current) {
      isUpdating.current = true;
      onChange(editorRef.current.innerHTML);
      requestAnimationFrame(() => { isUpdating.current = false; });
    }
  }, [onChange]);

  const exec = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
    refreshActive();
  }, [emitChange, refreshActive]);

  const handleBold = () => exec('bold');
  const handleItalic = () => exec('italic');
  const handleHeading = () => exec('formatBlock', active.h2 ? 'div' : 'h2');
  const handleSubheading = () => exec('formatBlock', active.h3 ? 'div' : 'h3');
  const handleBulletList = () => exec('insertUnorderedList');
  const handleOrderedList = () => exec('insertOrderedList');

  const openLinkInput = () => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || '';
    const isEditing = active.link && sel?.anchorNode?.parentElement?.nodeName === 'A';
    setLinkUrl(isEditing ? (sel!.anchorNode!.parentElement as HTMLAnchorElement).href : '');
    setLinkError('');
    setShowLinkInput(true);
  };

  const applyLink = () => {
    let url = linkUrl.trim();
    if (!url) {
      setLinkError('URL is required');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('mailto:')) {
      url = 'https://' + url;
    }
    try {
      new URL(url);
    } catch {
      setLinkError('Invalid URL');
      return;
    }

    editorRef.current?.focus();

    if (active.link) {
      const sel = window.getSelection();
      if (sel?.anchorNode?.parentElement?.nodeName === 'A') {
        sel.anchorNode.parentElement.setAttribute('href', url);
        emitChange();
        refreshActive();
        setShowLinkInput(false);
        return;
      }
    }

    document.execCommand('createLink', false, url);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const node = sel.anchorNode;
      if (node && node.parentElement?.nodeName === 'A') {
        node.parentElement.setAttribute('target', '_blank');
        node.parentElement.setAttribute('rel', 'noopener noreferrer');
      }
    }
    emitChange();
    refreshActive();
    editorRef.current?.focus();
    setShowLinkInput(false);
  };

  const removeLink = () => {
    document.execCommand('unlink');
    emitChange();
    refreshActive();
    editorRef.current?.focus();
    setShowLinkInput(false);
  };

  const cancelLink = () => {
    setShowLinkInput(false);
    setLinkUrl('');
    setLinkError('');
    editorRef.current?.focus();
  };

  const handleLinkKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') applyLink();
    if (e.key === 'Escape') cancelLink();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    emitChange();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    if (e.key === 'Enter' && !e.shiftKey) {
      const parent = sel.getRangeAt(0).startContainer.parentElement;
      if (parent && ['H2', 'H3'].includes(parent.nodeName)) {
        e.preventDefault();
        document.execCommand('insertLineBreak');
        emitChange();
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (active.link) removeLink();
      else openLinkInput();
    }
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 relative">
        <ToolbarButton active={active.bold} onClick={handleBold} title="Bold (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={active.italic} onClick={handleItalic} title="Italic (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ToolbarButton active={active.h2} onClick={handleHeading} title="Heading">
          <Heading className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={active.h3} onClick={handleSubheading} title="Subheading">
          <span className="text-xs font-bold">H3</span>
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ToolbarButton active={active.ul} onClick={handleBulletList} title="Bullet List">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton active={active.ol} onClick={handleOrderedList} title="Numbered List">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <span className="w-px h-5 bg-border mx-1" />
        <ToolbarButton active={active.link} onClick={active.link ? removeLink : openLinkInput} title="Insert Link (Ctrl+K)">
          {active.link ? <Link2Off className="w-4 h-4" /> : <Link className="w-4 h-4" />}
        </ToolbarButton>

        {showLinkInput && (
          <div className="absolute left-0 right-0 top-full z-20 bg-card border border-border rounded-b-lg p-2 flex items-center gap-2 shadow-lg">
            <input
              ref={linkInputRef}
              type="text"
              value={linkUrl}
              onChange={(e) => { setLinkUrl(e.target.value); setLinkError(''); }}
              onKeyDown={handleLinkKeyDown}
              placeholder="Paste or type a URL..."
              className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={applyLink}
              className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-md hover:opacity-90 transition-opacity cursor-pointer"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={cancelLink}
              className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {linkError && (
              <span className="text-xs text-destructive absolute -bottom-5 left-2">{linkError}</span>
            )}
          </div>
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onMouseUp={refreshActive}
        onKeyUp={refreshActive}
        className="px-4 py-3 text-sm focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:ml-0 [&_li]:my-0.5 [&_li::marker]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_a]:text-accent [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text empty:before:pointer-events-none [&:empty:before]:block"
        data-placeholder={placeholder}
        style={{ minHeight }}
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
      />
    </div>
  );
}

function ToolbarButton({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
        active
          ? 'bg-accent/15 text-accent shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
