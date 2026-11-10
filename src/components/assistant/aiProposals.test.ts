import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../types/collaboration';
import {
  PROPOSAL_TTL_MS,
  describeOperation,
  isProposalFresh,
  latestPendingHologram,
  operationKey,
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

describe('operationKey', () => {
  it('is unique per message and index', () => {
    expect(operationKey('a', 0)).not.toBe(operationKey('a', 1));
    expect(operationKey('a', 0)).not.toBe(operationKey('b', 0));
  });
});
