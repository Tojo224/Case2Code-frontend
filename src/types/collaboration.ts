import { CanonicalUmlDocument, UmlCommand } from './uml';

export type CollaboratorRole = 'OWNER' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_color: string;
  created_at?: string;
}

export interface ProjectCollaborator {
  id: string;
  diagram_id: string;
  user_id: string;
  role: CollaboratorRole;
  user_email?: string;
  user_name?: string;
  avatar_color?: string;
  created_at?: string;
}

export interface UserPresence {
  user_id: string;
  name: string;
  email: string;
  avatar_color: string;
  cursor_x?: number | null;
  cursor_y?: number | null;
  selected_class_id?: string | null;
  last_active?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type WebSocketMessage =
  | {
      type: 'ROOM_STATE';
      diagram_id: string;
      users: UserPresence[];
    }
  | {
      type: 'USER_JOINED';
      diagram_id: string;
      user: UserPresence;
    }
  | {
      type: 'USER_LEFT';
      diagram_id: string;
      user_id: string;
      name: string;
    }
  | {
      type: 'CURSOR_MOVE';
      diagram_id: string;
      user_id: string;
      name: string;
      avatar_color: string;
      x: number;
      y: number;
    }
  | {
      type: 'SELECTION_CHANGE';
      diagram_id: string;
      user_id: string;
      selected_class_id?: string | null;
    }
  | {
      type: 'DOCUMENT_UPDATED';
      diagram_id: string;
      document: CanonicalUmlDocument;
      version?: number;
      command?: UmlCommand;
    }
  | {
      type: 'PING' | 'PONG';
    };

