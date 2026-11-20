export type MessageRole = 'user' | 'assistant';

export interface ChatFeedback {
  id?: string;
  rating: number; // 1 or -1
  comment?: string | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  intent?: string | null;
  modelUsed?: string | null;
  tokensUsed?: number | null;
  latencyMs?: number | null;
  createdAt?: string;
  feedbacks?: ChatFeedback[];
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  userRole: string;
  title: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface ChatRequestPayload {
  message: string;
  sessionId?: string;
  userLocation?: UserLocation;
}

export interface SessionListResponse {
  data: ChatSession[];
  total: number;
  page: number;
  limit: number;
}
