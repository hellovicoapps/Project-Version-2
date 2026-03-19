export const API_BASE_URL = "/api";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  INBOX: "/inbox",
  CONTACTS: "/contacts",
  VOICE_INTERFACE: "/voice",
  SETTINGS: "/settings",
  AGENT: "/agent",
  CALENDAR: "/calendar",
  LOGIN: "/login",
  PRICING: "/pricing",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  COOKIES: "/cookies",
  LINKS: "/links",
  ONBOARDING: "/onboarding",
  ADMIN_DASHBOARD: "/admin",
  PUBLIC_CALL: "/call/:businessId",
  BOTCAKE_REDIRECT: "/botcake/:businessId",
};

export const CALL_STATUS_COLORS = {
  IN_PROGRESS: "text-blue-500",
  BOOKED: "text-purple-500",
  INQUIRY: "text-yellow-500",
  COMPLAINT: "text-rose-500",
  FOLLOW_UP: "text-orange-500",
  DROPPED: "text-zinc-500",
};

export const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Hong_Kong",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];
