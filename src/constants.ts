import { SubscriptionPlan } from "./types";

export const API_BASE_URL = "/api";
export const PRODUCTION_URL = "https://vicoapps.com";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
export const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;

export const PLAN_DETAILS = {
  [SubscriptionPlan.FREE]: {
    minutes: 30,
    overageRate: 0.5,
  },
  [SubscriptionPlan.STARTER]: {
    minutes: 100,
    overageRate: 0.4,
  },
  [SubscriptionPlan.GROWTH]: {
    minutes: 500,
    overageRate: 0.3,
  },
  [SubscriptionPlan.SCALE]: {
    minutes: 2000,
    overageRate: 0.2,
  },
};

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
  CALL_STATUS: "/call-status/:callId",
  HELP_CENTER: "/help",
};

export const CALL_STATUS_COLORS = {
  IN_PROGRESS: "text-blue-500",
  BOOKED: "text-emerald-500",
  INQUIRY: "text-yellow-500",
  COMPLAINT: "text-rose-500",
  FOLLOW_UP: "text-orange-500",
  DROPPED: "text-[var(--text-muted)]",
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
