import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { AuthState } from "./types";
import { AuthService } from "./services/authService";
import { ROUTES } from "./constants";
import { fetchConfig } from "./services/geminiService";
import { testConnection } from "./firebase";

// Pages
import LandingPage from "./pages/LandingPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardHome from "./pages/DashboardHome";
import InboxPage from "./pages/InboxPage";
import ContactsPage from "./pages/ContactsPage";
import VoiceInterface from "./pages/VoiceInterface";
import AgentPage from "./pages/AgentPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import PricingPage from "./pages/PricingPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import LinksPage from "./pages/LinksPage";
import PublicCallPage from "./pages/PublicCallPage";
import BotcakeRedirectPage from "./pages/BotcakeRedirectPage";
import AdminDashboard from "./pages/AdminDashboard";
import CalendarPage from "./pages/CalendarPage";

// Components
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { ToastProvider } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BookingProcessor } from "./components/BookingProcessor";

export default function App() {
  const [authState, setAuthState] = useState<AuthState>(AuthService.getAuthState());
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    fetchConfig();
    testConnection();
    const unsubscribe = AuthService.subscribeToAuthChanges((state) => {
      setAuthState(state);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-zinc-950">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }
    if (!authState.isAuthenticated) {
      return <Navigate to={ROUTES.HOME} replace />;
    }
    return <>{children}</>;
  };

  const isPublicCallPage = location.pathname.startsWith("/call/");

  return (
    <ToastProvider>
      <BookingProcessor />
      <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
        {authState.isAuthenticated && !isPublicCallPage && location.pathname !== ROUTES.ONBOARDING && <Sidebar />}
        <div className="flex-1 flex flex-col min-h-screen">
          {authState.isAuthenticated && !isPublicCallPage && location.pathname !== ROUTES.ONBOARDING && <Navbar user={authState.user} />}
          <main className={`flex-1 ${authState.isAuthenticated && !isPublicCallPage && location.pathname !== ROUTES.ONBOARDING ? "p-6" : ""}`}>
            <ErrorBoundary>
              <Routes>
                {/* Public Routes */}
                <Route path={ROUTES.HOME} element={
                  authState.isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <LandingPage />
                } />
                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                <Route path="/register" element={<Navigate to={ROUTES.ONBOARDING} replace />} />
                <Route path={ROUTES.ONBOARDING} element={<OnboardingPage />} />
                <Route path={ROUTES.PRICING} element={<PricingPage />} />
                <Route path={ROUTES.PRIVACY} element={<PrivacyPolicy />} />
                <Route path={ROUTES.TERMS} element={<TermsOfService />} />
                <Route path={ROUTES.COOKIES} element={<CookiePolicy />} />
                <Route path={ROUTES.PUBLIC_CALL} element={<PublicCallPage />} />
                <Route path={ROUTES.BOTCAKE_REDIRECT} element={<BotcakeRedirectPage />} />

                {/* Protected Routes */}
                <Route
                  path={ROUTES.DASHBOARD}
                  element={
                    <ProtectedRoute>
                      <DashboardHome />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.INBOX}
                  element={
                    <ProtectedRoute>
                      <InboxPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.CONTACTS}
                  element={
                    <ProtectedRoute>
                      <ContactsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.AGENT}
                  element={
                    <ProtectedRoute>
                      <AgentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.VOICE_INTERFACE}
                  element={
                    <ProtectedRoute>
                      <VoiceInterface />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.SETTINGS}
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.LINKS}
                  element={
                    <ProtectedRoute>
                      <LinksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.CALENDAR}
                  element={
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.ADMIN_DASHBOARD}
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
              </Routes>
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
