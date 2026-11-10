import type { ChatMessage } from '../../types/collaboration';
import type { UmlCommand } from '../../types/uml';
import type { SuggestedOperation } from '../../types/versions';

// Mirrors the backend TTL of a pending AI proposal (ai_memory_repository.PENDING_TTL).
export const PROPOSAL_TTL_MS = 30 * 60 * 1000;

/** Parses an API timestamp. Naive ISO strings (no zone) are UTC, not local time. */
export function parseMessageTime(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const ms = Date.parse(hasZone ? iso : `${iso}Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function isProposalFresh(createdAt: string | undefined | null, now: number = Date.now()): boolean {
  const ms = parseMessageTime(createdAt);
  return ms !== null && now - ms <= PROPOSAL_TTL_MS;
}

export function operationKey(messageId: string, index: number): string {
  return `${messageId}:${index}`;
}

export interface OperationView {
  title: string;
  detail?: string;
  confirmLabel: string;
}

export function describeOperation(op: SuggestedOperation): OperationView | null {
  switch (op.op) {
    case 'RESTORE_VERSION':
      return {
        title: `Restaurar a la versión ${op.version_number}`,
        detail: op.reason,
        confirmLabel: 'Aprobar',
      };
    case 'CREATE_CHECKPOINT':
      return {
        title: op.label ? `Crear checkpoint: ${op.label}` : 'Crear checkpoint',
        detail: op.reason,
        confirmLabel: 'Aprobar',
      };
    default:
      return null; // unknown operation from a newer backend: never render an actionable card
  }
}

/**
 * The hologram to bring back after reloading the chat history: the newest AI
 * proposal that is still fresh and was not superseded by a later AI edit.
 */
export function latestPendingHologram(
  messages: ChatMessage[],
  now: number = Date.now(),
): UmlCommand[] | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.sender_type !== 'AI') continue;
    if (m.executed_commands && m.executed_commands.length > 0) return null; // the AI already edited since
    if (m.suggested_commands && m.suggested_commands.length > 0) {
      return isProposalFresh(m.created_at, now) ? m.suggested_commands : null;
    }
  }
  return null;
}
