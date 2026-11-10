import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../types/collaboration';
import {
  HOLOGRAM_RESOLUTION_KEY,
  PROPOSAL_TTL_MS,
  describeOperation,
  describeResolution,
  describeResolveError,
  getResolution,
  isProposalFresh,
  isViewerRole,
  latestPendingHologram,
  latestPendingHologramProposal,
  operationKey,
  operationResolutionKey,
  parseMessageTime,
} from './aiProposals';

const NOW = Date.parse('2026-01-01T12:00:00Z');

const cmd = { command_type: 'CREATE_CLASS', name: 'Producto' } as never;

function msg(partial: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'm',
    diagram_id: 'd',
    sender_id: 'ai-senior',
    sender_name: 'Senior AI',
    sender_avatar_color: '#000',
    sender_type: 'AI',
    content: '',
    created_at: '2026-01-01T11:50:00Z',
    ...partial,
  };
}

describe('parseMessageTime', () => {
  it('treats a zoneless timestamp as UTC', () => {
    expect(parseMessageTime('2026-01-01T12:00:00')).toBe(NOW);
    expect(parseMessageTime('2026-01-01T12:00:00+00:00')).toBe(NOW);
  });
  it('returns null for garbage or empty input', () => {
    expect(parseMessageTime('nope')).toBeNull();
    expect(parseMessageTime(undefined)).toBeNull();
  });
});

describe('isProposalFresh', () => {
  it('is true inside the TTL and false after it', () => {
    expect(isProposalFresh('2026-01-01T11:31:00Z', NOW)).toBe(true);
    expect(isProposalFresh(new Date(NOW - PROPOSAL_TTL_MS - 1000).toISOString(), NOW)).toBe(false);
  });
});

describe('describeOperation', () => {
  it('describes a restore with its target version', () => {
    const view = describeOperation({ op: 'RESTORE_VERSION', version_number: 4, reason: 'undo' });
    expect(view?.title).toBe('Restaurar a la versión 4');
    expect(view?.detail).toBe('undo');
  });
  it('describes a checkpoint, with or without a label', () => {
    expect(describeOperation({ op: 'CREATE_CHECKPOINT' })?.title).toBe('Crear checkpoint');
    expect(describeOperation({ op: 'CREATE_CHECKPOINT', label: 'Entrega' })?.title).toBe('Crear checkpoint: Entrega');
  });
  it('ignores unknown operations', () => {
    expect(describeOperation({ op: 'FORMAT_DISK' } as never)).toBeNull();
  });
});

describe('latestPendingHologram', () => {
  it('restores a fresh proposal', () => {
    expect(latestPendingHologram([msg({ suggested_commands: [cmd] })], NOW)).toEqual([cmd]);
  });
  it('does not restore an expired proposal', () => {
    expect(
      latestPendingHologram([msg({ suggested_commands: [cmd], created_at: '2026-01-01T10:00:00Z' })], NOW),
    ).toBeNull();
  });
  it('does not restore a proposal superseded by a later AI edit', () => {
    const later = msg({ id: 'm2', executed_commands: [cmd], created_at: '2026-01-01T11:55:00Z' });
    expect(latestPendingHologram([msg({ suggested_commands: [cmd] }), later], NOW)).toBeNull();
  });
  it('ignores human messages and returns null when there is nothing', () => {
    expect(latestPendingHologram([msg({ sender_type: 'USER', suggested_commands: [cmd] })], NOW)).toBeNull();
    expect(latestPendingHologram([], NOW)).toBeNull();
  });
});

describe('resolved proposals', () => {
  const resolved = {
    status: 'APPLIED' as const,
    by_id: 'u1',
    by_name: 'Ana',
    at: '2026-01-01T11:55:00Z',
  };

  it('does not restore a hologram somebody already resolved', () => {
    const m = msg({ suggested_commands: [cmd], resolutions: { hologram: resolved } });
    expect(latestPendingHologram([m], NOW)).toBeNull();
    expect(latestPendingHologramProposal([m], NOW)).toBeNull();
  });

  it('returns the message id with the pending hologram', () => {
    expect(latestPendingHologramProposal([msg({ id: 'm9', suggested_commands: [cmd] })], NOW)).toEqual({
      id: 'm9',
      commands: [cmd],
    });
  });

  it('describes who resolved a card, with counts for holograms', () => {
    expect(describeResolution(resolved)).toBe('Aplicado por Ana');
    expect(describeResolution({ ...resolved, status: 'DISCARDED' })).toBe('Descartado por Ana');
    expect(describeResolution({ ...resolved, applied_count: 3, skipped_count: 1 })).toBe(
      'Aplicado por Ana (3 cambios, 1 omitido)',
    );
  });

  it('reads resolutions by key', () => {
    const m = msg({ resolutions: { [operationResolutionKey(1)]: resolved } });
    expect(getResolution(m, 'op:1')).toEqual(resolved);
    expect(getResolution(m, 'op:0')).toBeNull();
    expect(getResolution(m, HOLOGRAM_RESOLUTION_KEY)).toBeNull();
  });
});

describe('isViewerRole', () => {
  const collabs = [
    { id: '1', diagram_id: 'd', user_id: 'v', role: 'VIEWER' as const },
    { id: '2', diagram_id: 'd', user_id: 'e', role: 'EDITOR' as const },
  ];
  it('is true only for a known viewer', () => {
    expect(isViewerRole(collabs, 'v')).toBe(true);
    expect(isViewerRole(collabs, 'e')).toBe(false);
    expect(isViewerRole(collabs, 'unknown')).toBe(false);
    expect(isViewerRole(collabs, null)).toBe(false);
  });
});

describe('describeResolveError', () => {
  const resolvedMsg = msg({
    resolutions: { 'op:0': { status: 'APPLIED', by_id: 'u1', by_name: 'Ana', at: 'x' } },
  });
  const apiErr = (status: number, body?: unknown) => Object.assign(new Error('boom'), { status, body });

  it('409 with a resolution shows who resolved it and returns the fresh message', () => {
    const view = describeResolveError(apiErr(409, { detail: 'x', message: resolvedMsg }), 'op:0');
    expect(view.kind).toBe('conflict');
    expect(view.message).toBe('Aplicado por Ana');
    expect(view.updatedMessage).toBe(resolvedMsg);
  });
  it('409 without a resolution is a version conflict', () => {
    const view = describeResolveError(apiErr(409, { detail: 'version' }), 'op:0');
    expect(view.message).toContain('cambió');
    expect(view.updatedMessage).toBeNull();
  });
  it('maps 410 and 403', () => {
    expect(describeResolveError(apiErr(410), 'op:0').message).toContain('Propuesta vencida');
    expect(describeResolveError(apiErr(403), 'op:0').kind).toBe('forbidden');
  });
  it('falls back to the error message', () => {
    expect(describeResolveError(apiErr(500), 'op:0')).toMatchObject({ kind: 'other', message: 'boom' });
  });
});

describe('operationKey', () => {
  it('is unique per message and index', () => {
    expect(operationKey('a', 0)).not.toBe(operationKey('a', 1));
    expect(operationKey('a', 0)).not.toBe(operationKey('b', 0));
  });
});
