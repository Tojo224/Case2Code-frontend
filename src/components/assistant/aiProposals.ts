import type { ChatMessage, ProjectCollaborator, ProposalResolution } from '../../types/collaboration';
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
 * proposal that is still fresh, unresolved and not superseded by a later AI edit.
 */
export function latestPendingHologramProposal(
  messages: ChatMessage[],
  now: number = Date.now(),
): { id: string; commands: UmlCommand[] } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.sender_type !== 'AI') continue;
    if (m.executed_commands && m.executed_commands.length > 0) return null; // the AI already edited since
    if (m.suggested_commands && m.suggested_commands.length > 0) {
      if (m.resolutions?.[HOLOGRAM_RESOLUTION_KEY]) return null; // applied or discarded by someone
      return isProposalFresh(m.created_at, now) ? { id: m.id, commands: m.suggested_commands } : null;
    }
  }
  return null;
}

export function latestPendingHologram(
  messages: ChatMessage[],
  now: number = Date.now(),
): UmlCommand[] | null {
  return latestPendingHologramProposal(messages, now)?.commands ?? null;
}

export const HOLOGRAM_RESOLUTION_KEY = 'hologram';

export function operationResolutionKey(index: number): string {
  return `op:${index}`;
}

export function getResolution(message: ChatMessage, key: string): ProposalResolution | null {
  return message.resolutions?.[key] ?? null;
}

/** "Aplicado por Ana" / "Descartado por Ana", with change counts for holograms. */
export function describeResolution(resolution: ProposalResolution): string {
  const who = resolution.by_name || 'alguien del equipo';
  if (resolution.status === 'DISCARDED') return `Descartado por ${who}`;
  const parts: string[] = [];
  if (typeof resolution.applied_count === 'number') {
    parts.push(`${resolution.applied_count} ${resolution.applied_count === 1 ? 'cambio' : 'cambios'}`);
  }
  if (resolution.skipped_count) {
    parts.push(`${resolution.skipped_count} ${resolution.skipped_count === 1 ? 'omitido' : 'omitidos'}`);
  }
  return parts.length > 0 ? `Aplicado por ${who} (${parts.join(', ')})` : `Aplicado por ${who}`;
}

export function isViewerRole(
  collaborators: ProjectCollaborator[],
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  return collaborators.find((c) => c.user_id === userId)?.role === 'VIEWER';
}

export interface ResolveErrorView {
  kind: 'conflict' | 'expired' | 'forbidden' | 'other';
  message: string;
  /** Fresh server copy of the chat message (409 already-resolved), to replace the local one. */
  updatedMessage: ChatMessage | null;
}

/** Maps a failed resolve request (ApiError-like: status + body) to user-facing Spanish copy. */
export function describeResolveError(err: unknown, resolutionKey: string): ResolveErrorView {
  const status = (err as { status?: number } | null)?.status;
  const body = (err as { body?: { message?: ChatMessage } } | null)?.body;
  const fallback = err instanceof Error && err.message ? err.message : 'No se pudo completar la acción.';
  const updatedMessage = body?.message && typeof body.message === 'object' ? body.message : null;

  if (status === 410) {
    return { kind: 'expired', message: 'Propuesta vencida: pedísela de nuevo a la IA.', updatedMessage };
  }
  if (status === 403) {
    return { kind: 'forbidden', message: 'Tu rol es de solo lectura: no podés aprobar cambios.', updatedMessage };
  }
  if (status === 409) {
    const resolution = updatedMessage ? getResolution(updatedMessage, resolutionKey) : null;
    if (resolution) {
      return { kind: 'conflict', message: describeResolution(resolution), updatedMessage };
    }
    return {
      kind: 'conflict',
      message: 'El diagrama cambió desde que se hizo la propuesta. Revisá el historial y pedila de nuevo.',
      updatedMessage,
    };
  }
  return { kind: 'other', message: fallback, updatedMessage };
}
