import type {
  CanonicalUmlDocument,
  UmlAttribute,
  UmlClass,
  UmlCommand,
  UmlRelationship,
} from '../types/uml';

export interface InverseEntry {
  undo: UmlCommand[];
  redo: UmlCommand[];
  label: string;
}

const ATTR_FIELDS = ['name', 'type', 'primary_key', 'nullable', 'default_value', 'visibility'] as const;
const REL_FIELDS = [
  'name',
  'type',
  'source_cardinality',
  'target_cardinality',
  'source_role',
  'target_role',
  'source_handle',
  'target_handle',
] as const;

const incident = (doc: CanonicalUmlDocument, classId: string): UmlRelationship[] =>
  doc.relationships.filter((r) => r.source_class_id === classId || r.target_class_id === classId);

const attrCommandFields = (a: UmlAttribute) => ({
  name: a.name,
  type: a.type,
  primary_key: a.primary_key,
  nullable: a.nullable,
  default_value: a.default_value ?? null,
  visibility: a.visibility,
});

const relCommandFields = (r: UmlRelationship) => ({
  relationship_id: r.id,
  name: r.name ?? null,
  type: r.type,
  source_class_id: r.source_class_id,
  target_class_id: r.target_class_id,
  source_cardinality: r.source_cardinality,
  target_cardinality: r.target_cardinality,
  source_role: r.source_role ?? null,
  target_role: r.target_role ?? null,
  source_handle: r.source_handle ?? null,
  target_handle: r.target_handle ?? null,
});

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const findClass = (doc: CanonicalUmlDocument, id: string): UmlClass | undefined =>
  doc.classes.find((c) => c.id === id);

/**
 * Computes the commands that revert (undo) and replay (redo) `command`, given the document
 * before and after it ran. Returns null for commands that are not recorded (e.g. MOVE_CLASS).
 */
export function buildInverse(
  before: CanonicalUmlDocument,
  after: CanonicalUmlDocument,
  command: UmlCommand
): InverseEntry | null {
  switch (command.command_type) {
    case 'DELETE_CLASS': {
      const cls = findClass(before, command.class_id);
      if (!cls) return null;
      return {
        undo: [
          { command_type: 'RESTORE_CLASS', class_data: clone(cls), relationships: clone(incident(before, cls.id)) },
        ],
        redo: [{ command_type: 'DELETE_CLASS', class_id: cls.id }],
        label: `Clase ${cls.name} eliminada`,
      };
    }
    case 'CREATE_CLASS': {
      const beforeIds = new Set(before.classes.map((c) => c.id));
      const cls = after.classes.find((c) => !beforeIds.has(c.id));
      if (!cls) return null;
      return {
        undo: [{ command_type: 'DELETE_CLASS', class_id: cls.id }],
        redo: [
          { command_type: 'RESTORE_CLASS', class_data: clone(cls), relationships: clone(incident(after, cls.id)) },
        ],
        label: `Clase ${cls.name} creada`,
      };
    }
    case 'RENAME_CLASS': {
      const cls = findClass(before, command.class_id);
      if (!cls) return null;
      return {
        undo: [{ command_type: 'RENAME_CLASS', class_id: cls.id, new_name: cls.name }],
        redo: [command],
        label: `Clase ${cls.name} renombrada`,
      };
    }
    case 'ADD_ATTRIBUTE': {
      const prev = findClass(before, command.class_id);
      const next = findClass(after, command.class_id);
      if (!prev || !next) return null;
      const ids = new Set(prev.attributes.map((a) => a.id));
      const attr = next.attributes.find((a) => !ids.has(a.id));
      if (!attr) return null;
      return {
        undo: [{ command_type: 'DELETE_ATTRIBUTE', class_id: next.id, attribute_id: attr.id }],
        redo: [
          { command_type: 'ADD_ATTRIBUTE', class_id: next.id, attribute_id: attr.id, ...attrCommandFields(attr) },
        ],
        label: `Atributo ${attr.name} agregado`,
      };
    }
    case 'DELETE_ATTRIBUTE': {
      const cls = findClass(before, command.class_id);
      const attr = cls?.attributes.find((a) => a.id === command.attribute_id);
      if (!cls || !attr) return null;
      return {
        undo: [
          { command_type: 'ADD_ATTRIBUTE', class_id: cls.id, attribute_id: attr.id, ...attrCommandFields(attr) },
        ],
        redo: [command],
        label: `Atributo ${attr.name} eliminado`,
      };
    }
    case 'UPDATE_ATTRIBUTE': {
      const cls = findClass(before, command.class_id);
      const attr = cls?.attributes.find((a) => a.id === command.attribute_id);
      if (!cls || !attr) return null;
      const prevValues: Record<string, unknown> = {};
      for (const f of ATTR_FIELDS) {
        if (command[f] !== undefined) prevValues[f] = attr[f];
      }
      return {
        undo: [
          {
            command_type: 'UPDATE_ATTRIBUTE',
            class_id: cls.id,
            attribute_id: attr.id,
            ...prevValues,
          } as UmlCommand,
        ],
        redo: [command],
        label: `Atributo ${attr.name} modificado`,
      };
    }
    case 'UPDATE_RELATIONSHIP': {
      const rel = before.relationships.find((r) => r.id === command.relationship_id);
      if (!rel) return null;
      const prevValues: Record<string, unknown> = {};
      for (const f of REL_FIELDS) {
        if (command[f] !== undefined) prevValues[f] = rel[f];
      }
      return {
        undo: [{ command_type: 'UPDATE_RELATIONSHIP', relationship_id: rel.id, ...prevValues } as UmlCommand],
        redo: [command],
        label: 'Relación modificada',
      };
    }
    case 'CREATE_RELATIONSHIP': {
      const ids = new Set(before.relationships.map((r) => r.id));
      const rel = after.relationships.find((r) => !ids.has(r.id));
      if (!rel) return null;
      return {
        undo: [{ command_type: 'DELETE_RELATIONSHIP', relationship_id: rel.id }],
        redo: [{ command_type: 'CREATE_RELATIONSHIP', ...relCommandFields(rel) }],
        label: 'Relación creada',
      };
    }
    case 'DELETE_RELATIONSHIP': {
      const rel = before.relationships.find((r) => r.id === command.relationship_id);
      if (!rel) return null;
      return {
        undo: [{ command_type: 'CREATE_RELATIONSHIP', ...relCommandFields(rel) }],
        redo: [command],
        label: 'Relación eliminada',
      };
    }
    default:
      return null;
  }
}
