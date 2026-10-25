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

export type SenderType = 'USER' | 'AI';

export interface ChatMessage {
  id: string;
  diagram_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar_color: string;
  sender_type: SenderType;
  content: string;
  addressed_to?: string | null;
  ai_engine?: string | null;
  executed_commands?: UmlCommand[] | null;
  applied_commands_count?: number;
  created_at: string;
}

export interface AiProviderStatus {
  provider_mode: 'local' | 'hybrid' | 'gemini';
  local_base_url: string;
  local_model: string;
  local_online: boolean;
  local_available_models: string[];
  gemini_configured: boolean;
  gemini_model?: string | null;
  last_used_engine: string;
}

export interface ChatHistoryResponse {
  diagram_id: string;
  messages: ChatMessage[];
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
      type: 'CHAT_MESSAGE';
      diagram_id: string;
      message: ChatMessage;
    }
  | {
      type: 'TYPING_INDICATOR';
      diagram_id: string;
      user_id: string;
      user_name: string;
      is_typing: boolean;
    }
  | {
      type: 'PING' | 'PONG';
    };

