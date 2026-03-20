export enum CallStatus {
  IN_PROGRESS = "IN_PROGRESS",
  BOOKED = "BOOKED",
  INQUIRY = "INQUIRY",
  COMPLAINT = "COMPLAINT",
  FOLLOW_UP = "FOLLOW_UP",
  DROPPED = "DROPPED",
  PENDING_PROCESSING = "PENDING_PROCESSING",
  PROCESSING_ERROR = "PROCESSING_ERROR",
}

export enum SubscriptionPlan {
  FREE = "FREE",
  STARTER = "STARTER",
  GROWTH = "GROWTH",
  SCALE = "SCALE",
}

export interface User {
  id: string;
  email: string;
  name?: string;
  businessName?: string;
  role: "admin" | "user";
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  timezone: string;
  botcakeId?: string;
  fbId?: string;
  calendarConnected: boolean;
  googleCalendarId?: string;
  logoUrl?: string;
  backgroundUrl?: string;
  phone?: string;
  ownerName?: string;
  email?: string;
  plan: SubscriptionPlan;
  totalMinutes: number;
  usedMinutes: number;
  botcakeApiKey?: string;
  botcakePageId?: string;
  createdAt?: any;
}

export interface Contact {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone: string;
  status: "BOOKED" | "INQUIRED";
  createdAt: string;
}

export interface CallLog {
  id: string;
  businessId: string;
  agentId: string;
  status: CallStatus;
  duration: number;
  recordingUrl?: string;
  transcript?: string;
  summary?: string;
  phoneNumber: string;
  callerName?: string;
  callerEmail?: string;
  bookingTime?: string;
  bookingPurpose?: string;
  answeredCorrectly?: boolean;
  createdAt: any;
}

export interface VoicePersona {
  id: string;
  name: string;
  previewUrl: string;
  provider: "DEEPGRAM" | "GEMINI" | "ELEVENLABS";
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Agent {
  id: string;
  name: string;
  voice: string;
  voiceProvider?: "GEMINI" | "ELEVENLABS";
  instructions: string;
  knowledgeBase?: string;
  language?: string;
  businessId: string;
  elevenLabsAgentId?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  status: string;
}
