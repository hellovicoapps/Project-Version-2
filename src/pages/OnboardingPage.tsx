import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  User, 
  Mail, 
  Lock, 
  Building2, 
  Bot, 
  Mic, 
  Play, 
  Pause,
  FileText, 
  Clock, 
  Globe,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Calendar,
  Phone,
  Loader2,
  RefreshCw
} from "lucide-react";
import { ROUTES, TIMEZONES } from "../constants";
import { AuthService } from "../services/authService";
import { Logo } from "../components/Logo";
import { db, storage, handleFirestoreError, OperationType } from "../firebase";
import { doc, setDoc, updateDoc, collection, addDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "../components/Toast";
import { SubscriptionPlan } from "../types";

import { useElevenLabsAgent } from "../hooks/useElevenLabsAgent";
import { getElevenLabsService } from "../services/elevenlabsService";

// --- Types ---
interface BusinessHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

interface OnboardingData {
  businessName: string;
  email: string;
  password?: string;
  agentTemplate: string;
  agentName: string;
  agentVoice: string;
  knowledgeBase: string;
  timezone: string;
  businessHours: BusinessHours[];
  step: number;
  elevenLabsAgentId?: string;
  logoUrl?: string;
  backgroundUrl?: string;
}

const AGENT_TEMPLATES = [
  {
    id: "receptionist",
    name: "Front Desk Receptionist",
    description: "Handles bookings, answers general questions, and routes calls.",
    useCase: "Receptionist",
    icon: Calendar,
    color: "text-[var(--color-info)]",
    bg: "bg-[var(--color-info)]/10",
    instructions: "You are a professional and helpful AI Receptionist. Your goal is to greet callers, handle bookings, and answer general questions about the business using the knowledge base provided. Be polite, organized, and efficient.\n\nBOOKING INSTRUCTIONS:\nIf the user wants to book an appointment, you MUST collect:\n1. Their full name\n2. Their email address\n3. Their phone number\n4. The specific date and time for the booking\n\nConfirm these details with the user before ending the call."
  },
  {
    id: "sales",
    name: "Sales Representative",
    description: "Qualifies leads, explains pricing, and schedules demos.",
    useCase: "Sales",
    icon: Zap,
    color: "text-[var(--color-accent)]",
    bg: "bg-[var(--color-accent)]/10",
    instructions: "You are an energetic and persuasive Sales Representative. Your goal is to understand the customer's needs, highlight the key benefits of our products/services, and guide them towards a purchase or a follow-up meeting.\n\nDATA COLLECTION:\nTo provide the best service, you MUST collect:\n1. Their full name\n2. Their email address\n3. Their phone number\n4. The purpose of their inquiry or the service they are interested in\n5. A preferred time for a follow-up demo or call\n\nConfirm these details with the user before ending the call."
  },
  {
    id: "support",
    name: "Customer Support",
    description: "Troubleshoots issues and provides technical information.",
    useCase: "Support",
    icon: MessageSquare,
    color: "text-[var(--color-success)]",
    bg: "bg-[var(--color-success)]/10",
    instructions: "You are a professional and empathetic Customer Support Assistant. Your goal is to help customers with their inquiries, resolve issues, and provide accurate information about our services based on the knowledge base.\n\nDATA COLLECTION:\nTo assist the customer properly and create a support ticket, you MUST collect:\n1. Their full name\n2. Their email address\n3. Their phone number\n4. A detailed description of the issue or purpose of the call\n5. A preferred time for a technician to call back if needed\n\nConfirm these details with the user before ending the call."
  }
];

const VOICES = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", sample: "Professional & Clear" },
  { id: "pNInz6obpg8pYp38z75w", name: "Adam", sample: "Deep & Narrative" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", sample: "Soft & Friendly" },
  { id: "ErXw78iS239Q4w95qjiS", name: "Antoni", sample: "Well-rounded & Deep" }
];

const DEFAULT_HOURS: BusinessHours[] = [
  { day: "Monday", open: "09:00", close: "17:00", closed: false },
  { day: "Tuesday", open: "09:00", close: "17:00", closed: false },
  { day: "Wednesday", open: "09:00", close: "17:00", closed: false },
  { day: "Thursday", open: "09:00", close: "17:00", closed: false },
  { day: "Friday", open: "09:00", close: "17:00", closed: false },
  { day: "Saturday", open: "10:00", close: "14:00", closed: false },
  { day: "Sunday", open: "09:00", close: "17:00", closed: true },
];

// --- Components ---

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = ["Account", "Type", "Voice", "Knowledge", "Branding", "Test"];
  return (
    <div className="flex items-center justify-between w-full max-w-3xl mx-auto mb-6">
      {steps.map((label, idx) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center space-y-2 relative">
            <div 
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                idx + 1 <= currentStep 
                  ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20" 
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-main)]"
              }`}
            >
              {idx + 1 < currentStep ? <Check className="w-3 h-3" /> : idx + 1}
            </div>
            <span className={`text-[9px] font-bold uppercase tracking-widest absolute -bottom-5 whitespace-nowrap ${
              idx + 1 <= currentStep ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"
            }`}>
              {label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className="flex-1 h-[1px] mx-2 bg-[var(--border-main)] relative overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: idx + 1 < currentStep ? "100%" : "0%" }}
                className="absolute inset-0 bg-[var(--brand-primary)]"
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>(() => {
    const saved = localStorage.getItem("onboarding_draft");
    const baseData = {
      businessName: "",
      email: "",
      agentTemplate: "receptionist",
      agentName: "",
      agentVoice: "21m00Tcm4TlvDq8ikWAM",
      knowledgeBase: "",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      businessHours: DEFAULT_HOURS,
      step: 1,
      elevenLabsAgentId: "",
      logoUrl: "",
      backgroundUrl: ""
    };
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...baseData, ...parsed, businessHours: parsed.businessHours || DEFAULT_HOURS };
    }
    return baseData;
  });

  const [businessId, setBusinessId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [transcript, setTranscript] = useState<{ role: string; text: string; isFinal?: boolean }[]>([]);
  const [status, setStatus] = useState("Ready to test");
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState(VOICES);

  // Fetch real voices from ElevenLabs to ensure they exist
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        const service = await getElevenLabsService();
        if (service) {
          const voices = await service.getVoices();
          if (voices && voices.length > 0) {
            // Map the first few voices to our UI structure
            const mapped = voices.slice(0, 6).map((v: any) => ({
              id: v.voice_id,
              name: v.name,
              sample: v.labels?.accent || v.category || "Professional"
            }));
            setAvailableVoices(mapped);
            
            // If current selected voice isn't in the new list, update it to the first one
            if (!mapped.find(v => v.id === data.agentVoice)) {
              updateData({ agentVoice: mapped[0].id });
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch dynamic voices, falling back to defaults", e);
      }
    };
    fetchVoices();
  }, []);

  const { 
    startConnection, 
    stopConnection, 
    isConnected, 
    isConnecting, 
    isAiSpeaking, 
    audioLevel 
  } = useElevenLabsAgent({
    agentId: data.elevenLabsAgentId || "",
    onTranscript: (text, role, isFinal) => {
      setTranscript(prev => {
        const newTranscript = [...prev];
        const lastMsg = newTranscript[newTranscript.length - 1];
        
        if (lastMsg && lastMsg.role === role && !lastMsg.isFinal) {
          lastMsg.text = text;
          lastMsg.isFinal = isFinal;
        } else {
          newTranscript.push({ role, text, isFinal });
        }
        return newTranscript;
      });
    },
    onStatusChange: (s) => setStatus(s),
    onError: (e) => {
      console.error("Test Agent Error:", e);
      showToast(e.message || "Failed to connect to agent", "error");
    }
  });

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem("onboarding_draft", JSON.stringify(data));
  }, [data]);

  // Real-time autosave to Firestore
  useEffect(() => {
    const timer = setTimeout(() => {
      if (businessId && data.step > 1) {
        saveToBackend(data.step);
      }
    }, 1000); // Debounce 1s
    return () => clearTimeout(timer);
  }, [data, businessId]);

  // Sync with Firestore if logged in
  useEffect(() => {
    const auth = AuthService.getAuthState();
    if (auth.isAuthenticated && auth.user) {
      setBusinessId(auth.user.id);
      // Load existing data if any
      const loadData = async () => {
        try {
          const docRef = doc(db, "businesses", auth.user!.id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const bData = snap.data();
            setData(prev => ({
              ...prev,
              businessName: bData.name || prev.businessName,
              email: bData.email || prev.email,
              timezone: bData.timezone || prev.timezone,
              businessHours: bData.businessHours || prev.businessHours,
              step: bData.onboardingStep || prev.step,
              logoUrl: bData.logoUrl || prev.logoUrl,
              backgroundUrl: bData.backgroundUrl || prev.backgroundUrl
            }));

            // Check for agent
            const agentSnap = await getDoc(doc(db, `businesses/${auth.user!.id}/agents`, "default"));
            if (agentSnap.exists()) {
              updateData({ elevenLabsAgentId: agentSnap.data().elevenLabsAgentId || "" });
            }
          }
        } catch (e) {
          console.error("Failed to load onboarding data", e);
        }
      };
      loadData();
    }
  }, []);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const saveToBackend = async (step: number) => {
    if (!businessId) return;
    try {
      const docRef = doc(db, "businesses", businessId);
      await updateDoc(docRef, {
        name: data.businessName,
        timezone: data.timezone,
        businessHours: data.businessHours,
        onboardingStep: step,
        logoUrl: data.logoUrl || "",
        backgroundUrl: data.backgroundUrl || ""
      });

      // Also update/create agent
      const agentsRef = collection(db, `businesses/${businessId}/agents`);
      const template = AGENT_TEMPLATES.find(t => t.id === data.agentTemplate) || AGENT_TEMPLATES[0];
      
      await setDoc(doc(db, `businesses/${businessId}/agents`, "default"), {
        name: data.agentName || `${data.businessName} Assistant`,
        voice: data.agentVoice,
        instructions: template.instructions,
        knowledgeBase: data.knowledgeBase,
        template: data.agentTemplate,
        businessId,
        updatedAt: new Date()
      }, { merge: true });

    } catch (e) {
      console.error("Failed to save progress", e);
    }
  };

  const handleNext = async () => {
    if (data.step === 1) {
      if (!data.businessName || !data.email || !data.password) {
        showToast("Please fill in all fields", "error");
        return;
      }
      setLoading(true);
      try {
        // Create account
        const user = await AuthService.register({
          email: data.email,
          password: data.password,
          businessName: data.businessName,
          name: data.businessName // Use business name as user name for now
        });
        setBusinessId(user.user?.id || null);
        updateData({ step: 2 });
        showToast("Account created! Let's set up your agent.", "success");
      } catch (e: any) {
        console.error("Registration error:", e);
        if (e.code === "auth/email-already-in-use") {
          showToast("This email is already in use. Please sign in instead.", "error");
          // Optionally redirect or show a login button
        } else {
          showToast(e.message || "Failed to create account", "error");
        }
      } finally {
        setLoading(false);
      }
    } else if (data.step === 4) {
      // Before moving to branding, ensure agent is created/updated
      setLoading(true);
      try {
        await saveToBackend(5);
        
        // Create or Update ElevenLabs Agent
        const elevenlabsService = await getElevenLabsService();
        if (elevenlabsService) {
          try {
            const agentName = data.agentName || `${data.businessName} Assistant`;
            const template = AGENT_TEMPLATES.find(t => t.id === data.agentTemplate) || AGENT_TEMPLATES[0];
            const fullInstructions = `${template.instructions}\n\nKNOWLEDGE BASE:\n${data.knowledgeBase}`;
            
            if (data.elevenLabsAgentId) {
              await elevenlabsService.updateAgent(
                data.elevenLabsAgentId,
                agentName,
                fullInstructions,
                data.agentVoice
              );
            } else {
              const agentId = await elevenlabsService.createAgent(
                agentName,
                fullInstructions,
                data.agentVoice
              );
              
              if (agentId) {
                updateData({ elevenLabsAgentId: agentId });
                // Save the agent ID to Firestore
                await updateDoc(doc(db, `businesses/${businessId}/agents`, "default"), {
                  elevenLabsAgentId: agentId
                });
              }
            }
          } catch (agentErr) {
            console.error("Failed to sync ElevenLabs agent:", agentErr);
          }
        }
        
        updateData({ step: 5 });
      } catch (e: any) {
        showToast("Failed to prepare agent", "error");
      } finally {
        setLoading(false);
      }
    } else if (data.step < 6) {
      const nextStep = data.step + 1;
      updateData({ step: nextStep });
      saveToBackend(nextStep);
    } else {
      // Final step -> Dashboard
      localStorage.removeItem("onboarding_draft");
      navigate(ROUTES.DASHBOARD);
    }
  };

  const handleBack = () => {
    if (data.step > 1) {
      updateData({ step: data.step - 1 });
    }
  };

  const playVoicePreview = async (voiceId: string) => {
    if (!voiceId || !audioRef.current) return;

    if (playingVoiceId === voiceId) {
      audioRef.current.pause();
      setPlayingVoiceId(null);
      return;
    }

    try {
      setPlayingVoiceId(voiceId);
      
      // Reset current audio
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Fetch the audio as a blob first to check for errors
      const proxyUrl = `/api/elevenlabs/preview/${voiceId}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        const errText = await response.text();
        console.error(`Audio fetch failed (${response.status}):`, errText);
        setPlayingVoiceId(null);
        showToast("Voice preview unavailable. Please check your API key.", "error");
        return;
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      audioRef.current.src = blobUrl;
      audioRef.current.load();

      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          const msg = err?.message || String(err);
          console.error("Audio playback failed:", msg);
          setPlayingVoiceId(null);
          if (err?.name !== 'AbortError') {
            showToast("Playback failed. Please try again.", "error");
          }
        });
      }

      audioRef.current.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(blobUrl); // Clean up
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Failed to set audio source:", msg);
      setPlayingVoiceId(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("File size too large. Max 2MB.", "error");
      return;
    }

    setLoading(true);
    try {
      const storageRef = ref(storage, `businesses/${businessId}/${type}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      if (type === 'logo') {
        updateData({ logoUrl: url });
      } else {
        updateData({ backgroundUrl: url });
      }
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded!`, "success");
    } catch (err) {
      console.error(`Failed to upload ${type}:`, err);
      showToast(`Failed to upload ${type}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-[var(--bg-main)] flex flex-col items-center justify-start overflow-hidden relative">
      <audio 
        ref={audioRef} 
        hidden 
        preload="auto" 
        onError={(e) => {
          const target = e.currentTarget as HTMLAudioElement;
          const errorCode = target.error?.code;
          const errorMessage = target.error?.message;
          console.error(`Audio element error: Code ${errorCode}, Message: ${errorMessage}`);
          setPlayingVoiceId(null);
        }}
      />
      
      {/* Header */}
      <div className="w-full p-6 flex items-center justify-between bg-[var(--bg-main)]/80 backdrop-blur-md z-50 shrink-0">
        <Link to={ROUTES.HOME} className="flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium tracking-tight">Back to Home</span>
        </Link>
        <Link to={ROUTES.HOME}>
          <Logo />
        </Link>
        <div className="w-24" /> {/* Spacer */}
      </div>

      <div className="w-full max-w-4xl flex-1 flex flex-col px-6 pb-6 overflow-hidden">
        <div className="shrink-0 py-4">
          <StepIndicator currentStep={data.step} />
        </div>

        <div className="glass-card flex-1 flex flex-col relative overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
            <AnimatePresence mode="wait">
            {/* STEP 1: ACCOUNT SETUP */}
            {data.step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Create your account</h2>
                  <p className="text-[var(--text-muted)]">
                    Start your 14-day free trial. Already have an account?{" "}
                    <Link to={ROUTES.LOGIN} className="text-[var(--brand-primary)] hover:underline font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 max-w-md mx-auto">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                      <Building2 className="w-3 h-3" />
                      <span>Business Name</span>
                    </label>
                    <input 
                      type="text"
                      value={data.businessName}
                      onChange={(e) => updateData({ businessName: e.target.value })}
                      placeholder="e.g. Acme Corp"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                      <Mail className="w-3 h-3" />
                      <span>Email Address</span>
                    </label>
                    <input 
                      type="email"
                      value={data.email}
                      onChange={(e) => updateData({ email: e.target.value })}
                      placeholder="you@company.com"
                      className="input-field"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                      <Lock className="w-3 h-3" />
                      <span>Password</span>
                    </label>
                    <input 
                      type="password"
                      value={data.password || ""}
                      onChange={(e) => updateData({ password: e.target.value })}
                      placeholder="••••••••"
                      className="input-field"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: AGENT TYPE SELECTION */}
            {data.step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Choose your agent type</h2>
                  <p className="text-[var(--text-muted)]">Select a template that best fits your business needs. <span className="text-[var(--brand-primary)]/80 italic">Don't worry, you can change this anytime later.</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {AGENT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => updateData({ agentTemplate: template.id })}
                      className={`p-6 rounded-2xl border transition-all text-left group relative ${
                        data.agentTemplate === template.id 
                          ? "bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/10" 
                          : "bg-[var(--bg-card)]/50 border-[var(--border-main)] hover:border-[var(--text-muted)]/50"
                      }`}
                    >
                      {data.agentTemplate === template.id && (
                        <div className="absolute top-4 right-4 w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className={`w-12 h-12 ${template.bg} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                        <template.icon className={`w-6 h-6 ${template.color}`} />
                      </div>
                      <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{template.name}</h3>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{template.description}</p>
                      <div className="mt-4 inline-block px-3 py-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-full text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        {template.useCase}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: AGENT CONFIGURATION */}
            {data.step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Configure your agent</h2>
                  <p className="text-[var(--text-muted)]">Give your agent a personality and a voice.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                        <Bot className="w-3 h-3" />
                        <span>Agent Name</span>
                      </label>
                      <input 
                        type="text"
                        value={data.agentName}
                        onChange={(e) => updateData({ agentName: e.target.value })}
                        placeholder="e.g. Sarah, Alex, Vico"
                        className="input-field"
                      />
                    </div>

                    <div className="p-6 bg-[var(--brand-primary)]/5 rounded-2xl border border-[var(--brand-primary)]/10">
                      <div className="flex items-center space-x-3 mb-4">
                        <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />
                        <h4 className="text-sm font-bold text-[var(--text-main)]">Pro Tip</h4>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        Choose a name that reflects your brand. Friendly names like "Sarah" often perform better for customer support.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                      <Mic className="w-3 h-3" />
                      <span>Select Voice</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {availableVoices.map((voice) => (
                        <div
                          key={voice.id}
                          role="button"
                          onClick={() => updateData({ agentVoice: voice.id })}
                          className={`p-4 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                            data.agentVoice === voice.id 
                              ? "bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]" 
                              : "bg-[var(--bg-card)] border-[var(--border-main)] hover:border-[var(--text-muted)]/50"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${data.agentVoice === voice.id ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--bg-main)] text-[var(--text-muted)]"}`}>
                              <Mic className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold text-[var(--text-main)]">{voice.name}</p>
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{voice.sample}</p>
                            </div>
                          </div>
                          <div 
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playVoicePreview(voice.id);
                            }}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${
                              playingVoiceId === voice.id 
                                ? "text-[var(--brand-primary)] bg-[var(--brand-primary)]/20" 
                                : "text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                            }`}
                          >
                            {playingVoiceId === voice.id ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: KNOWLEDGE BASE + TIME */}
            {data.step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Knowledge & Settings</h2>
                  <p className="text-[var(--text-muted)]">Tell your agent about your business and set your availability.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                      <FileText className="w-3 h-3" />
                      <span>Knowledge Base</span>
                    </label>
                    <textarea 
                      value={data.knowledgeBase}
                      onChange={(e) => updateData({ knowledgeBase: e.target.value })}
                      placeholder="Add information your agent should know (e.g. pricing, hours, services offered)..."
                      className="w-full h-48 px-4 py-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 transition-all resize-none custom-scrollbar"
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                        <Globe className="w-3 h-3" />
                        <span>Timezone</span>
                      </label>
                      <select 
                        value={data.timezone}
                        onChange={(e) => updateData({ timezone: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 transition-all"
                      >
                        {TIMEZONES.map(tz => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>

                    <div className="p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Clock className="w-5 h-5 text-[var(--text-muted)]" />
                          <h4 className="text-sm font-bold text-[var(--text-main)]">Business Hours</h4>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {(data.businessHours || DEFAULT_HOURS).map((bh, idx) => (
                          <div key={bh.day} className="flex items-center justify-between">
                            <span className="text-xs text-[var(--text-muted)] w-20">{bh.day}</span>
                            <div className="flex items-center space-x-2">
                              {bh.closed ? (
                                <span className="text-[10px] font-bold text-[var(--color-danger)] uppercase tracking-widest">Closed</span>
                              ) : (
                                <>
                                  <input 
                                    type="time" 
                                    value={bh.open}
                                    onChange={(e) => {
                                      const newHours = [...data.businessHours];
                                      newHours[idx].open = e.target.value;
                                      updateData({ businessHours: newHours });
                                    }}
                                    className="bg-[var(--bg-main)] border border-[var(--border-main)] rounded px-1 text-[10px] text-[var(--text-main)] focus:outline-none"
                                  />
                                  <span className="text-[var(--text-muted)]/50">-</span>
                                  <input 
                                    type="time" 
                                    value={bh.close}
                                    onChange={(e) => {
                                      const newHours = [...data.businessHours];
                                      newHours[idx].close = e.target.value;
                                      updateData({ businessHours: newHours });
                                    }}
                                    className="bg-[var(--bg-main)] border border-[var(--border-main)] rounded px-1 text-[10px] text-[var(--text-main)] focus:outline-none"
                                  />
                                </>
                              )}
                              <button 
                                onClick={() => {
                                  const newHours = [...data.businessHours];
                                  newHours[idx].closed = !newHours[idx].closed;
                                  updateData({ businessHours: newHours });
                                }}
                                className={`p-1 rounded transition-colors ${bh.closed ? "text-[var(--color-success)] hover:bg-[var(--color-success)]/10" : "text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"}`}
                              >
                                {bh.closed ? <CheckCircle2 className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!businessId) return;
                        setLoading(true);
                        try {
                          const elevenlabsService = await getElevenLabsService();
                          if (elevenlabsService) {
                            const agentName = data.agentName || `${data.businessName} Assistant`;
                            const template = AGENT_TEMPLATES.find(t => t.id === data.agentTemplate) || AGENT_TEMPLATES[0];
                            const fullInstructions = `${template.instructions}\n\nKNOWLEDGE BASE:\n${data.knowledgeBase}`;
                            
                            if (data.elevenLabsAgentId) {
                              await elevenlabsService.updateAgent(
                                data.elevenLabsAgentId,
                                agentName,
                                fullInstructions,
                                data.agentVoice
                              );
                              showToast("Agent updated successfully!", "success");
                            } else {
                              const agentId = await elevenlabsService.createAgent(
                                agentName,
                                fullInstructions,
                                data.agentVoice
                              );
                              if (agentId) {
                                updateData({ elevenLabsAgentId: agentId });
                                await setDoc(doc(db, `businesses/${businessId}/agents`, "default"), {
                                  elevenLabsAgentId: agentId
                                }, { merge: true });
                                showToast("Agent created successfully!", "success");
                              }
                            }
                          } else {
                            showToast("ElevenLabs API key not configured", "error");
                          }
                        } catch (e: any) {
                          console.error("Manual sync error:", e);
                          showToast(e.message || "Failed to sync agent", "error");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="w-full py-4 px-4 bg-[var(--bg-card)] hover:bg-[var(--bg-card)]/80 text-[var(--text-main)] rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-3 border border-[var(--border-main)] hover:border-[var(--text-muted)]/50 shadow-lg"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : "text-[var(--brand-primary)]"}`} />
                      <span>{data.elevenLabsAgentId ? "Update & Sync Agent" : "Create & Sync Agent"}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: BRANDING */}
            {data.step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Branding & Appearance</h2>
                  <p className="text-[var(--text-muted)]">Customize the look of your calling page. This will be shown to your customers.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                        <Building2 className="w-3 h-3" />
                        <span>Business Logo</span>
                      </label>
                      <div className="flex items-center space-x-6">
                        <div className="w-24 h-24 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center overflow-hidden relative group">
                          {data.logoUrl ? (
                            <img src={data.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <Bot className="w-8 h-8 text-[var(--text-muted)]/30" />
                          )}
                          <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Change</span>
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" />
                          </label>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-bold text-[var(--text-main)]">Upload Logo</p>
                          <p className="text-xs text-[var(--text-muted)]">Recommended: Square PNG or JPG, max 2MB.</p>
                          {!data.logoUrl && (
                            <label className="inline-block mt-2 px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--border-main)] text-[var(--text-main)] text-[10px] font-bold uppercase tracking-widest rounded-lg cursor-pointer transition-colors border border-[var(--border-main)]">
                              Select File
                              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'logo')} className="hidden" />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                        <Globe className="w-3 h-3" />
                        <span>Background Image</span>
                      </label>
                      <div className="space-y-4">
                        <div className="w-full aspect-video rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center overflow-hidden relative group">
                          {data.backgroundUrl ? (
                            <img src={data.backgroundUrl} alt="Background" className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center space-y-2">
                              <Sparkles className="w-8 h-8 text-[var(--text-muted)]/30 mx-auto" />
                              <p className="text-[10px] text-[var(--text-muted)]/50 uppercase tracking-widest">No background selected</p>
                            </div>
                          )}
                          <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Change Background</span>
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} className="hidden" />
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[var(--text-muted)]">Recommended: 1920x1080, max 2MB.</p>
                          <label className="px-4 py-2 bg-[var(--bg-card)] hover:bg-[var(--border-main)] text-[var(--text-main)] text-[10px] font-bold uppercase tracking-widest rounded-lg cursor-pointer transition-colors border border-[var(--border-main)]">
                            Upload New
                            <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'background')} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-[var(--brand-primary)]/5 rounded-3xl border border-[var(--brand-primary)]/10 space-y-4">
                      <h4 className="text-sm font-bold text-[var(--text-main)] flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                        <span>Live Preview</span>
                      </h4>
                      <div className="aspect-[9/16] max-w-[200px] mx-auto rounded-[2rem] border-4 border-[var(--border-main)] bg-[var(--bg-main)] overflow-hidden relative shadow-2xl">
                        {/* Mock Calling Page */}
                        <div className="absolute inset-0">
                          {data.backgroundUrl ? (
                            <img src={data.backgroundUrl} alt="" className="w-full h-full object-cover opacity-40" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-b from-[var(--brand-primary)]/10 to-[var(--bg-main)]" />
                          )}
                        </div>
                        <div className="relative h-full flex flex-col items-center justify-center p-4 space-y-4">
                          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center overflow-hidden shadow-xl">
                            {data.logoUrl ? (
                              <img src={data.logoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Bot className="w-8 h-8 text-[var(--brand-primary)]" />
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] font-bold text-[var(--text-main)] truncate w-32">{data.businessName || "Your Business"}</p>
                            <p className="text-[8px] text-[var(--brand-primary)] uppercase tracking-widest mt-1">Calling...</p>
                          </div>
                          <div className="flex space-x-2">
                            <div className="w-8 h-8 rounded-full bg-[var(--color-danger)] flex items-center justify-center">
                              <Phone className="w-3 h-3 text-white rotate-[135deg]" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                              <Mic className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] text-center italic">
                        This is how your customers will see your calling page.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: TEST AGENT */}
            {data.step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">Test your agent</h2>
                  <p className="text-[var(--text-muted)]">Have a real voice conversation with {data.agentName || "your agent"} to see how it handles your business info.</p>
                </div>

                <div className="max-w-3xl mx-auto bg-[var(--bg-main)] rounded-3xl border border-[var(--border-main)] overflow-hidden flex flex-col h-[750px] relative shadow-2xl">
                  {/* Background Image with Gradient Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {data.backgroundUrl ? (
                      <>
                        <img src={data.backgroundUrl} alt="" className="w-full h-full object-cover opacity-30" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-main)]/20 via-[var(--bg-main)]/80 to-[var(--bg-main)]" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-[var(--brand-primary)]/5 to-[var(--bg-main)]" />
                    )}
                  </div>

                  <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-card)]/40 backdrop-blur-md relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all overflow-hidden ${isConnected ? "bg-[var(--brand-primary)] shadow-lg shadow-[var(--brand-primary)]/20" : "bg-[var(--bg-card)]"}`}>
                        {data.logoUrl ? (
                          <img src={data.logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Bot className={`w-5 h-5 ${isConnected ? "text-white" : "text-[var(--text-muted)]"}`} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-main)]">{data.agentName || "Vico"}</p>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isConnected ? "text-[var(--color-success)]" : "text-[var(--text-muted)]"}`}>
                          {isConnected ? "Live" : isConnecting ? "Connecting..." : "Offline"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-[var(--color-success)] animate-pulse" : "bg-[var(--text-muted)]/30"}`} />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{status}</span>
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar bg-[var(--bg-main)]/40 backdrop-blur-sm relative z-10">
                    {transcript.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                        <MessageSquare className="w-12 h-12 text-[var(--text-muted)]" />
                        <p className="text-sm text-[var(--text-muted)]">Transcript will appear here <br /> once the call starts.</p>
                      </div>
                    ) : (
                      transcript.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                            msg.role === "ai" 
                              ? "bg-[var(--bg-card)] text-[var(--text-main)] rounded-tl-none border border-[var(--border-main)]" 
                              : "bg-[var(--brand-primary)] text-white font-medium rounded-tr-none"
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-6 bg-[var(--bg-card)]/60 backdrop-blur-md border-t border-[var(--border-main)] flex flex-col items-center space-y-4 relative z-10">
                    {!data.elevenLabsAgentId && !isConnecting && (
                      <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-xl text-center">
                        <p className="text-xs text-[var(--color-danger)]">
                          ElevenLabs Agent not created. Please check your API key in settings or try going back and clicking Next again.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center space-x-1 h-8">
                      {isConnected && Array.from({ length: 20 }).map((_, i) => (
                        <motion.div 
                          key={i}
                          animate={{ 
                            height: isAiSpeaking 
                              ? [4, 4 + Math.random() * 20, 4] 
                              : [4, 4 + Math.random() * 8, 4] 
                          }}
                          transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                          className={`w-1 rounded-full ${isAiSpeaking ? "bg-[var(--brand-primary)]" : "bg-[var(--brand-primary)]/30"}`}
                        />
                      ))}
                    </div>

                    <button 
                      onClick={isConnected ? stopConnection : startConnection}
                      disabled={isConnecting}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
                        isConnected 
                          ? "bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/90 text-white shadow-[var(--color-danger)]/20 rotate-[135deg]" 
                          : "bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white shadow-[var(--brand-primary)]/20"
                      }`}
                    >
                      {isConnecting ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <Phone className="w-8 h-8" />
                      )}
                    </button>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                      {isConnected ? "End Call" : "Start Voice Test"}
                    </p>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="p-6 border-t border-[var(--border-main)] flex items-center justify-between shrink-0 bg-[var(--bg-card)]/20">
            <button 
              onClick={handleBack}
              disabled={data.step === 1 || loading}
              className={`flex items-center space-x-2 text-sm font-bold transition-all ${
                data.step === 1 || loading ? "opacity-0 pointer-events-none" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button 
              onClick={handleNext}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{data.step === 6 ? "Proceed to Dashboard" : "Next Step"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Background Accents */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--brand-primary)]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--color-accent)]/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
