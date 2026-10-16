'use client';

// Scrollable move history list. SAN notation comes precomputed from the server.

import { useEffect, useRef } from 'react';
import type { GameMoveEntry } from '../../types/game';

interface MoveListProps {
  moves: GameMoveEntry[];
  className?: string;
}

export default function MoveList({ moves, className }: MoveListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [moves.length]);

  // Pair moves: white and black per row.
  const rows: { n: number; white?: GameMoveEntry; black?: GameMoveEntry }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({ n: i / 2 + 1, white: moves[i], black: moves[i + 1] });
  }

  if (moves.length === 0) {
    return (
      <div className={`text-xs text-muted-foreground italic px-3 py-4 text-center ${className || ''}`}>
        No moves yet
      </div>
    );
  }

  return (
    <div className={`overflow-y-auto max-h-48 ${className || ''}`}>
      <table className="w-full text-xs">
        <tbody>
          {rows.map((row) => (
            <tr key={row.n} className="border-b border-border/30 last:border-0">
              <td className="w-8 px-2 py-1 text-muted-foreground tabular-nums">{row.n}.</td>
              <td className="px-2 py-1 font-mono">{row.white?.notation || ''}</td>
              <td className="px-2 py-1 font-mono text-muted-foreground">{row.black?.notation || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div ref={bottomRef} />
    </div>
  );
}
