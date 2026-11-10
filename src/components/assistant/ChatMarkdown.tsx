import React from 'react';
import { tokenizeBlocks, tokenizeInline } from './markdownTokens';

const Inline: React.FC<{ text: string }> = ({ text }) => (
  <>
    {tokenizeInline(text).map((t, i) => {
      if (t.kind === 'bold') return <strong key={i} className="font-bold">{t.value}</strong>;
      if (t.kind === 'code') {
        return (
          <code key={i} className="px-1 py-px rounded bg-slate-200/70 dark:bg-slate-700/70 font-mono text-[0.92em]">
            {t.value}
          </code>
        );
      }
      return <React.Fragment key={i}>{t.value}</React.Fragment>;
    })}
  </>
);

/** Renders a chat message (Markdown subset) as React elements. Never uses innerHTML. */
export const ChatMarkdown: React.FC<{ text: string }> = ({ text }) => (
  <div className="select-text space-y-0.5">
    {tokenizeBlocks(text).map((b, i) => {
      switch (b.kind) {
        case 'blank':
          return <div key={i} className="h-1.5" />;
        case 'heading':
          return (
            <p key={i} className="font-bold pt-0.5">
              <Inline text={b.text} />
            </p>
          );
        case 'bullet':
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span aria-hidden>•</span>
              <span className="min-w-0"><Inline text={b.text} /></span>
            </div>
          );
        case 'numbered':
          return (
            <div key={i} className="flex gap-1.5 pl-1">
              <span className="shrink-0">{b.marker}</span>
              <span className="min-w-0"><Inline text={b.text} /></span>
            </div>
          );
        default:
          return (
            <p key={i}>
              <Inline text={b.text} />
            </p>
          );
      }
    })}
  </div>
);
