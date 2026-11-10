import { describe, it, expect } from 'vitest';
import { buildInverse } from './undoLogic';
import type { CanonicalUmlDocument, UmlClass, UmlRelationship } from '../types/uml';

const attr = (id: string, name: string) => ({
  id,
  name,
  type: 'String',
  primary_key: false,
  nullable: true,
  default_value: null,
  visibility: 'PUBLIC' as const,
});
const cls = (id: string, name: string, attrs = [attr(`${id}-a`, 'x')]): UmlClass => ({
  id,
  name,
  position: { x: 0, y: 0 },
  attributes: attrs,
  is_abstract: false,
  stereotype: null,
});
const rel = (id: string, s: string, t: string): UmlRelationship => ({
  id,
  type: 'ONE_TO_MANY',
  source_class_id: s,
  target_class_id: t,
  source_cardinality: '1',
  target_cardinality: '*',
});
const doc = (classes: UmlClass[], relationships: UmlRelationship[] = []): CanonicalUmlDocument => ({
  id: 'd',
  name: 'D',
  version: 1,
  classes,
  relationships,
  created_at: '',
  updated_at: '',
});

describe('buildInverse', () => {
  it('DELETE_CLASS restores class with attributes and incident relationships', () => {
    const before = doc([cls('a', 'A'), cls('b', 'B'), cls('c', 'C')], [rel('r1', 'a', 'b'), rel('r2', 'b', 'c')]);
    const after = doc([cls('b', 'B'), cls('c', 'C')], [rel('r2', 'b', 'c')]);
    const inv = buildInverse(before, after, { command_type: 'DELETE_CLASS', class_id: 'a' })!;
    expect(inv.label).toBe('Clase A eliminada');
    expect(inv.undo).toHaveLength(1);
    const u = inv.undo[0] as any;
    expect(u.command_type).toBe('RESTORE_CLASS');
    expect(u.class_data.attributes[0].id).toBe('a-a');
    expect(u.relationships.map((r: any) => r.id)).toEqual(['r1']);
    expect(inv.redo).toEqual([{ command_type: 'DELETE_CLASS', class_id: 'a' }]);
  });

  it('CREATE_CLASS undoes with DELETE and redoes with RESTORE', () => {
    const before = doc([cls('b', 'B')]);
    const after = doc([cls('b', 'B'), cls('n', 'Nueva')]);
    const inv = buildInverse(before, after, { command_type: 'CREATE_CLASS', name: 'Nueva' })!;
    expect(inv.undo).toEqual([{ command_type: 'DELETE_CLASS', class_id: 'n' }]);
    expect((inv.redo[0] as any).command_type).toBe('RESTORE_CLASS');
    expect((inv.redo[0] as any).class_data.id).toBe('n');
    expect(inv.label).toBe('Clase Nueva creada');
  });

  it('ADD_ATTRIBUTE / DELETE_ATTRIBUTE are mutual inverses', () => {
    const before = doc([cls('a', 'A')]);
    const after = doc([cls('a', 'A', [attr('a-a', 'x'), attr('new', 'edad')])]);
    const add = buildInverse(before, after, { command_type: 'ADD_ATTRIBUTE', class_id: 'a', name: 'edad' })!;
    expect(add.undo).toEqual([{ command_type: 'DELETE_ATTRIBUTE', class_id: 'a', attribute_id: 'new' }]);
    expect((add.redo[0] as any).attribute_id).toBe('new');
    expect((add.redo[0] as any).name).toBe('edad');

    const del = buildInverse(after, before, { command_type: 'DELETE_ATTRIBUTE', class_id: 'a', attribute_id: 'new' })!;
    expect((del.undo[0] as any).command_type).toBe('ADD_ATTRIBUTE');
    expect((del.undo[0] as any).attribute_id).toBe('new');
    expect((del.undo[0] as any).type).toBe('String');
  });

  it('UPDATE_ATTRIBUTE undo carries previous values only for changed fields', () => {
    const before = doc([cls('a', 'A')]);
    const inv = buildInverse(before, before, {
      command_type: 'UPDATE_ATTRIBUTE',
      class_id: 'a',
      attribute_id: 'a-a',
      name: 'y',
    })!;
    expect(inv.undo).toEqual([
      { command_type: 'UPDATE_ATTRIBUTE', class_id: 'a', attribute_id: 'a-a', name: 'x' },
    ]);
  });

  it('DELETE_RELATIONSHIP undo recreates with id', () => {
    const before = doc([cls('a', 'A'), cls('b', 'B')], [rel('r1', 'a', 'b')]);
    const after = doc([cls('a', 'A'), cls('b', 'B')]);
    const inv = buildInverse(before, after, { command_type: 'DELETE_RELATIONSHIP', relationship_id: 'r1' })!;
    expect((inv.undo[0] as any).command_type).toBe('CREATE_RELATIONSHIP');
    expect((inv.undo[0] as any).relationship_id).toBe('r1');
    expect((inv.undo[0] as any).source_class_id).toBe('a');
  });

  it('MOVE_CLASS is not recorded', () => {
    const d = doc([cls('a', 'A')]);
    expect(buildInverse(d, d, { command_type: 'MOVE_CLASS', class_id: 'a', position: { x: 1, y: 1 } })).toBeNull();
  });
});
