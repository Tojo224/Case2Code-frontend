export type Visibility = 'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'PACKAGE';

export type RelationshipType =
  | 'ONE_TO_ONE'
  | 'ONE_TO_MANY'
  | 'MANY_TO_ONE'
  | 'MANY_TO_MANY'
  | 'INHERITANCE'
  | 'AGGREGATION'
  | 'COMPOSITION';

export interface Position {
  x: number;
  y: number;
}

export interface UmlAttribute {
  id: string;
  name: string;
  type: string;
  primary_key: boolean;
  nullable: boolean;
  default_value?: string | null;
  visibility: Visibility;
  [key: string]: unknown;
}

export interface UmlClass {
  id: string;
  name: string;
  position: Position;
  attributes: UmlAttribute[];
  is_abstract: boolean;
  stereotype?: string | null;
  [key: string]: unknown;
}

export interface UmlRelationship {
  id: string;
  name?: string | null;
  type: RelationshipType;
  source_class_id: string;
  target_class_id: string;
  source_cardinality: string;
  target_cardinality: string;
  source_role?: string | null;
  target_role?: string | null;
  [key: string]: unknown;
}

export interface CanonicalUmlDocument {
  id: string;
  name: string;
  description?: string | null;
  version: number;
  classes: UmlClass[];
  relationships: UmlRelationship[];
  created_at: string;
  updated_at: string;
}

export type CommandType =
  | 'CREATE_CLASS'
  | 'RENAME_CLASS'
  | 'DELETE_CLASS'
  | 'MOVE_CLASS'
  | 'ADD_ATTRIBUTE'
  | 'UPDATE_ATTRIBUTE'
  | 'DELETE_ATTRIBUTE'
  | 'CREATE_RELATIONSHIP'
  | 'UPDATE_RELATIONSHIP'
  | 'DELETE_RELATIONSHIP';

export interface BaseCommand {
  command_type: CommandType;
}

export interface CreateClassCommand extends BaseCommand {
  command_type: 'CREATE_CLASS';
  class_id?: string;
  name: string;
  position?: Position;
  is_abstract?: boolean;
  stereotype?: string | null;
}

export interface RenameClassCommand extends BaseCommand {
  command_type: 'RENAME_CLASS';
  class_id: string;
  new_name: string;
}

export interface DeleteClassCommand extends BaseCommand {
  command_type: 'DELETE_CLASS';
  class_id: string;
}

export interface MoveClassCommand extends BaseCommand {
  command_type: 'MOVE_CLASS';
  class_id: string;
  position: Position;
}

export interface AddAttributeCommand extends BaseCommand {
  command_type: 'ADD_ATTRIBUTE';
  class_id: string;
  attribute_id?: string;
  name: string;
  type?: string;
  primary_key?: boolean;
  nullable?: boolean;
  default_value?: string | null;
  visibility?: Visibility;
}

export interface UpdateAttributeCommand extends BaseCommand {
  command_type: 'UPDATE_ATTRIBUTE';
  class_id: string;
  attribute_id: string;
  name?: string;
  type?: string;
  primary_key?: boolean;
  nullable?: boolean;
  default_value?: string | null;
  visibility?: Visibility;
}

export interface DeleteAttributeCommand extends BaseCommand {
  command_type: 'DELETE_ATTRIBUTE';
  class_id: string;
  attribute_id: string;
}

export interface CreateRelationshipCommand extends BaseCommand {
  command_type: 'CREATE_RELATIONSHIP';
  relationship_id?: string;
  name?: string | null;
  type: RelationshipType;
  source_class_id: string;
  target_class_id: string;
  source_cardinality?: string;
  target_cardinality?: string;
  source_role?: string | null;
  target_role?: string | null;
}

export interface DeleteRelationshipCommand extends BaseCommand {
  command_type: 'DELETE_RELATIONSHIP';
  relationship_id: string;
}

export type UmlCommand =
  | CreateClassCommand
  | RenameClassCommand
  | DeleteClassCommand
  | MoveClassCommand
  | AddAttributeCommand
  | UpdateAttributeCommand
  | DeleteAttributeCommand
  | CreateRelationshipCommand
  | DeleteRelationshipCommand;

export interface CommandExecutionResponse {
  success: boolean;
  version: number;
  document: CanonicalUmlDocument;
  error?: string | null;
}

export interface AssistantPromptResponse {
  success: boolean;
  reply: string;
  executed_commands: UmlCommand[];
  document: CanonicalUmlDocument;
  error?: string | null;
}


