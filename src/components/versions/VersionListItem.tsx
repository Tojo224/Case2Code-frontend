import React from 'react';
import { Bot, User } from 'lucide-react';
import type { DiagramVersion } from '../../types/versions';
import {
  formatRelativeTime,
  kindBadgeClass,
  kindLabel,
  pluralize,
  versionTitle,
} from './versionHelpers';

interface Props {
  version: DiagramVersion;
  selected: boolean;
  onSelect: (number: number) => void;
}

export const VersionListItem: React.FC<Props> = ({ version, selected, onSelect }) => {
  const isAi = version.author_type === 'AI';
  const hasLabel = Boolean(version.label?.trim());

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(version.number)}
        aria-pressed={selected}
        data-testid={`version-item-${version.number}`}
        className={`w-full text-left px-3 py-2.5 rounded-lg border transition cursor-pointer ${
          selected
            ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-500/10'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              v{version.number}
            </span>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${kindBadgeClass(version.kind)}`}
            >
              {kindLabel(version.kind)}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
            {formatRelativeTime(version.created_at)}
          </span>
        </div>

        {hasLabel && (
          <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            {versionTitle(version)}
          </p>
        )}
        {version.message && (
          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
            {version.message}
          </p>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 min-w-0">
            {isAi ? (
              <Bot className="w-3 h-3 shrink-0 text-purple-500" aria-label="Autor: IA" />
            ) : (
              <User className="w-3 h-3 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate">{version.author_name}</span>
            {isAi && (
              <span className="px-1 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold text-[10px]">
                IA
              </span>
            )}
          </span>
          <span className="shrink-0">
            {pluralize(version.class_count, 'clase', 'clases')} ·{' '}
            {pluralize(version.relationship_count, 'relación', 'relaciones')}
          </span>
        </div>
      </button>
    </li>
  );
};
