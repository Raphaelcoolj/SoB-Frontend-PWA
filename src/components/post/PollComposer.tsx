'use client';

/**
 * @file PollComposer.tsx
 * @description Poll builder for the create/edit pages. Max 5 options, single/multiple vote toggle.
 */

import React from 'react';
import { X, Plus, BarChart3 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface DraftPoll {
  question: string;
  options: string[];
  allowMultiple: boolean;
}

interface PollComposerProps {
  value: DraftPoll;
  onChange: (poll: DraftPoll) => void;
  onRemove: () => void;
}

export default function PollComposer({ value, onChange, onRemove }: PollComposerProps) {
  const setQuestion = (question: string) => onChange({ ...value, question });
  const setOption = (i: number, text: string) => {
    const options = [...value.options];
    options[i] = text;
    onChange({ ...value, options });
  };
  const addOption = () => {
    if (value.options.length >= 5) return;
    onChange({ ...value, options: [...value.options, ''] });
  };
  const removeOption = (i: number) => {
    const options = value.options.filter((_, idx) => idx !== i);
    onChange({ ...value, options });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <BarChart3 className="w-4 h-4 text-accent flex-shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Poll</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
          aria-label="Remove poll"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <input
        type="text"
        value={value.question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask a question..."
        maxLength={200}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/60 placeholder:text-muted-foreground/60"
      />

      <div className="space-y-1.5">
        {value.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              onChange={(e) => setOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent/60 placeholder:text-muted-foreground/60"
            />
            {value.options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-muted-foreground hover:text-destructive p-1 cursor-pointer"
                aria-label={`Remove option ${i + 1}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={addOption}
          disabled={value.options.length >= 5}
          className="flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-40 disabled:no-underline cursor-pointer disabled:cursor-default"
        >
          <Plus className="w-3.5 h-3.5" />
          Add option ({value.options.length}/5)
        </button>

        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={value.allowMultiple}
            onClick={() => onChange({ ...value, allowMultiple: !value.allowMultiple })}
            className={cn(
              'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
              value.allowMultiple ? 'bg-accent' : 'bg-border'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                value.allowMultiple && 'translate-x-4'
              )}
            />
          </button>
          Multiple votes
        </label>
      </div>
    </div>
  );
}
