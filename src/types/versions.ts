import type { CanonicalUmlDocument } from './uml';

// CONTRACT mirrored from backend app/domain/models/versioning.py

export type VersionAuthorType = 'USER' | 'AI' | 'SYSTEM';
export type VersionKind = 'CHECKPOINT' | 'AUTO' | 'PRE_AI' | 'PRE_RESTORE';

export interface DiagramVersion {
  id: string;
  diagram_id: string;
  number: number;
  kind: VersionKind;
  label?: string | null;
  message?: string | null;
  author_id: string;
  author_name: string;
  author_type: VersionAuthorType;
  document_version: number;
  class_count: number;
  relationship_count: number;
  created_at: string;
}

export interface DiagramVersionDetail extends DiagramVersion {
  snapshot: CanonicalUmlDocument;
}

export interface DiagramChange {
  kind: string;
  target_id: string;
  description: string;
}

export interface VersionDiff {
  diagram_id: string;
  from_number: number | null;
  to_number: number | null; // null = current state
  changes: DiagramChange[];
  summary: string;
}

// Operations the AI proposes and a human approves (ChatMessage.suggested_operations)
export type SuggestedOperation =
  | { op: 'RESTORE_VERSION'; version_number: number; reason?: string }
  | { op: 'CREATE_CHECKPOINT'; label?: string; reason?: string };
