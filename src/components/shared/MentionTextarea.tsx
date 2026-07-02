import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '../../lib/api';

interface MentionUser {
  _id: string;
  name: string;
  username: string;
  avatar?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  maxLength?: number;
}

const MentionTextarea = forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ value, onChange, placeholder, disabled, rows, className, maxLength }, ref) => {
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
    const [mentionIndex, setMentionIndex] = useState(-1);
    const [mentionStart, setMentionStart] = useState(-1);
    const [showMentions, setShowMentions] = useState(false);
    const [cursorCoords, setCursorCoords] = useState({ top: 0, left: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();

    useEffect(() => {
      if (mentionSearch.length >= 1) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          try {
            const res = await fetchWithAuth(`/api/users/mentions/search?q=${encodeURIComponent(mentionSearch)}&limit=8`);
            const data = await res.json();
            if (data.success) {
              setMentionUsers(data.data.users || []);
              setMentionIndex(0);
              setShowMentions(true);
            }
          } catch {}
        }, 200);
      } else {
        setShowMentions(false);
        setMentionUsers([]);
      }
    }, [mentionSearch]);

    const updateCursorCoords = useCallback(() => {
      const el = textareaRef.current;
      if (!el) return;
      const { selectionStart } = el;
      const textBefore = value.slice(0, selectionStart);
      const lines = textBefore.split('\n');
      const currentLine = lines.length - 1;
      const lineStart = textBefore.lastIndexOf('\n') + 1;
      const col = selectionStart - lineStart;

      const lineHeight = 20;
      const charWidth = 8.5;

      const textareaRect = el.getBoundingClientRect();
      const scrollTop = el.scrollTop;

      setCursorCoords({
        top: (currentLine - lines.length + 1) * lineHeight + lineHeight - scrollTop,
        left: Math.min(col * charWidth, el.clientWidth - 250),
      });
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      const pos = e.target.selectionStart;
      const textBefore = newValue.slice(0, pos);
      const textAfter = newValue.slice(pos);

      const atIndex = textBefore.lastIndexOf('@');
      if (atIndex !== -1) {
        const charBefore = textBefore[atIndex - 1];
        if (charBefore === undefined || charBefore === ' ' || charBefore === '\n') {
          const searchText = textBefore.slice(atIndex + 1);
          if (/^[a-zA-Z0-9_]*$/.test(searchText)) {
            setMentionStart(atIndex);
            setMentionSearch(searchText);
            updateCursorCoords();
            return;
          }
        }
      }

      setShowMentions(false);
      setMentionSearch('');
      setMentionUsers([]);
    };

    const insertMention = (username: string) => {
      if (mentionStart === -1) return;
      const before = value.slice(0, mentionStart);
      const after = value.slice(mentionStart + 1 + mentionSearch.length);
      const newValue = `${before}@${username} ${after}`;
      onChange(newValue);
      setShowMentions(false);
      setMentionUsers([]);
      setMentionSearch('');

      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          const insertPos = before.length + username.length + 2;
          el.focus();
          el.setSelectionRange(insertPos, insertPos);
        }
      }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showMentions || mentionUsers.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(i => Math.min(i + 1, mentionUsers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (mentionIndex >= 0 && mentionIndex < mentionUsers.length) {
          e.preventDefault();
          insertMention(mentionUsers[mentionIndex].username);
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    };

    return (
      <div className="relative">
        <textarea
          ref={(el) => {
            (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
            if (typeof ref === 'function') ref(el);
            else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
          }}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={className}
        />
        {showMentions && mentionUsers.length > 0 && (
          <div
            className="fixed z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[200px] max-w-[280px]"
            style={{
              top: cursorCoords.top + 60,
              left: cursorCoords.left + 16,
            }}
          >
            {mentionUsers.map((user, i) => (
              <button
                key={user._id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(user.username); }}
                onMouseEnter={() => setMentionIndex(i)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  i === mentionIndex ? 'bg-accent/10 text-accent' : 'text-foreground hover:bg-muted'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-semibold text-muted-foreground overflow-hidden flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user.name[0]
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

MentionTextarea.displayName = 'MentionTextarea';
export default MentionTextarea;
