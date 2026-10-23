export interface SuggestedDish {
  dishId: string;
  dishName: string;
  restaurantId: string;
  restaurantName: string;
  price: number;
  rating: number;
  matchReason: string;
  imageUrl?: string;
  isAvailable?: boolean;
}

export interface ExtractedPreferences {
  category?: string;
  maxPrice?: number;
  dietary: string[];
  mood?: string;
  keywords: string[];
}

export interface RecommendationResponse {
  message: string;
  extractedPreferences: ExtractedPreferences;
  suggestedDishes: SuggestedDish[];
  source: 'LLM_POWERED' | 'FALLBACK_RULE_BASED';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestedDishes?: SuggestedDish[];
  source?: 'LLM_POWERED' | 'FALLBACK_RULE_BASED';
  timestamp: number;
}

export interface RecommendDishPayload {
  prompt: string;
  lat?: number;
  lng?: number;
  budget?: number;
  dietary?: string[];
}

export interface AiChatPayload {
  message: string;
  sessionId?: string;
  history?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: {
    lat?: number;
    lng?: number;
    budget?: number;
  };
}

export interface ChatResponse {
  reply: string;
  sessionId: string;
  suggestedDishes: SuggestedDish[];
  source: 'LLM_POWERED' | 'FALLBACK_RULE_BASED';
}
