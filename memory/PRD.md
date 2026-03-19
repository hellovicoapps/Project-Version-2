# Vico AI - Product Requirements Document (PRD)

## Project Overview
Vico AI is an enterprise-grade AI Voice Receptionist designed to handle customer calls, inquiries, and bookings. It features an Admin Dashboard for managing calls, contacts, and settings, and a Voice Interface for real-time interactions.

## Core Features
- **AI Voice Connection:** Real-time voice interaction using Gemini and ElevenLabs.
- **Admin Dashboard:** Analytics, call status overviews, and charts.
- **Inbox:** Tab-based filtering and search for recent calls.
- **Contacts:** Management of booked and inquired contacts with CRUD operations.
- **Calendar Integration:** Google Calendar integration for bookings with timezone management.
- **Follow-up System:** Automated follow-ups via Botcake.
- **Authentication:** JWT-based email/password and Google OAuth.
- **SaaS Pricing:** PayPal subscription integration.

## Project Structure
- `/src/components/`: Reusable UI components.
- `/src/pages/`: Main application pages (Dashboard, Inbox, Contacts, VoiceInterface, etc.).
- `/src/services/`: API and service logic (Gemini, ElevenLabs, Auth).
- `/src/types.ts`: Global TypeScript types.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Motion, Lucide React.
- **Backend:** FastAPI (Monolithic).
- **Database:** MongoDB.
- **AI:** Gemini (STT/LLM), ElevenLabs (TTS).
- **Payments:** PayPal.
