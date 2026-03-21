import { useState, useEffect, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Zap, 
  Clock, 
  Activity,
  ShieldCheck,
  Loader2,
  MessageSquare,
  Send,
  Settings
} from "lucide-react";
import { Agent, CallStatus, Business, SubscriptionPlan } from "../types";
import { PLAN_DETAILS } from "../constants";
import { Logo } from "../components/Logo";
import { useElevenLabsAgent } from "../hooks/useElevenLabsAgent";
import { ROUTES } from "../constants";
import { 
  collection, 
  query, 
  onSnapshot, 
  limit,
  doc,
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  increment,
  getDocs,
  where
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useToast } from "../components/Toast";
import { getGeminiService } from "../services/geminiService";
import { useCallback } from "react";

const GREETINGS: Record<string, string> = {
  en: "Hello! I'm {name}. How can I help you today?",
  es: "¡Hola! Soy {name}. ¿En qué puedo ayudarte hoy?",
  fr: "Bonjour ! Je suis {name}. Comment puis-je vous aider aujourd'hui ?",
  de: "Hallo! Ich bin {name}. Wie kann ich Ihnen heute helfen?",
  it: "Ciao! Sono {name}. Come posso aiutarti oggi?",
  pt: "Olá! Eu sou {name}. Como posso ajudar você hoje?",
  hi: "नमस्ते! मैं {name} हूँ। मैं आज आपकी कैसे मदद कर सकता हूँ?",
  zh: "你好！我是 {name}。今天我能为您做些什么？",
  ja: "こんにちは！私は {name} です。今日はどのようなご用件でしょうか？",
  ko: "안녕하세요! 저는 {name}입니다. 오늘 무엇을 도와드릴까요?",
  vi: "Xin chào! Tôi là {name}. Tôi có thể giúp gì cho bạn hôm nay?",
  id: "Halo! Saya {name}. Ada yang bisa saya bantu hari ini?",
  tl: "Halo! Ako si {name}. Paano kita matutulungan ngayon?",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  hi: "Hindi",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  vi: "Vietnamese",
  id: "Indonesian",
  tl: "Tagalog",
};

export default function PublicCallPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [searchParams] = useSearchParams();
  const psid = searchParams.get("psid");
  const userName = searchParams.get("userName");
  const { showToast } = useToast();
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [volume, setVolume] = useState(1);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("Ready to call");
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const transcriptRef = useRef<{ role: string; text: string }[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  const agentRef = useRef<Agent | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [hasCredits, setHasCredits] = useState(true);

  const elevenLabsAgent = useElevenLabsAgent({
    agentId: agent?.elevenLabsAgentId || "",
    onTranscript: (text, role) => {
      setTranscript(prev => {
        const newTranscript = [...prev];
        const lastMsg = newTranscript[newTranscript.length - 1];
        if (lastMsg && lastMsg.role === role) {
          lastMsg.text = text;
        } else {
          newTranscript.push({ role, text });
        }
        return newTranscript;
      });
      
      const lastMsgRef = transcriptRef.current[transcriptRef.current.length - 1];
      if (lastMsgRef && lastMsgRef.role === role) {
        lastMsgRef.text = text;
      } else {
        transcriptRef.current = [...transcriptRef.current, { role, text }];
      }
    },
    onError: (error) => {
      console.error("ElevenLabs Agent error:", error);
      setStatus("Error");
      setIsCalling(false);
      
      let msg = error.message || "Voice connection error";
      if (msg.includes("not found") || msg.includes("404")) {
        msg = "AI Agent not found on ElevenLabs. Please re-save the agent in the Dashboard.";
      }
      showToast(msg, "error");
    },
    onStatusChange: (newStatus) => {
      setStatus(newStatus);
    }
  });

  const { 
    startConnection, 
    stopConnection, 
    sendText, 
    isConnected, 
    isConnecting, 
    setIsMuted: setAgentMuted, 
    setVolume: setAgentVolume 
  } = elevenLabsAgent;

  // Sync mute and volume with ElevenLabs agent
  useEffect(() => {
    if (isConnected) {
      setAgentMuted(isMuted);
    }
  }, [isMuted, isConnected, setAgentMuted]);

  useEffect(() => {
    if (isConnected) {
      setAgentVolume(volume);
    }
  }, [volume, isConnected, setAgentVolume]);

  useEffect(() => {
    setIsSpeakerOn(volume > 0);
  }, [volume]);

  useEffect(() => {
    if (isConnected) {
      setStatus("Live");
      setIsCalling(true);
      setDuration(0);
      durationRef.current = 0;
    } else if (isConnecting) {
      setStatus("Connecting...");
    } else {
      if (status !== "Ready to call" && status !== "Agent Not Found") {
        setStatus("Disconnected");
      }
      setIsCalling(false);
    }
  }, [isConnected, isConnecting, status]);

  const timerRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [keyCheck, setKeyCheck] = useState(0);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    console.log("PublicCallPage: businessId from URL:", businessId);
    if (!businessId || businessId === "undefined") {
      console.error("PublicCallPage: Invalid or missing businessId");
      setLoading(false);
      return;
    }

    // Listen for Business changes
    const businessUnsubscribe = onSnapshot(doc(db, "businesses", businessId), (businessDoc) => {
      if (businessDoc.exists()) {
        const data = businessDoc.data();
        console.log("PublicCallPage: business data received:", data);
        setBusinessName(data.name || "Our Business");
        setLogoUrl(data.logoUrl || "");
        setBackgroundUrl(data.backgroundUrl || "");
        
        // Check credits
        const currentPlan = data.plan as SubscriptionPlan || SubscriptionPlan.FREE;
        const planDetails = PLAN_DETAILS[currentPlan];
        const limit = data.totalMinutes || planDetails?.minutes || 30;
        const used = data.usedMinutes || 0;
        
        // Only block if it's the free tier and they are out of minutes
        if (currentPlan === SubscriptionPlan.FREE && used >= limit) {
          setHasCredits(false);
        } else {
          setHasCredits(true);
        }
      } else {
        console.warn("PublicCallPage: business doc does not exist for ID:", businessId);
      }
    }, (error) => {
      console.error("PublicCallPage: error listening to business:", error);
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}`);
    });

    // Listen for Agent changes in real-time
    const agentsPath = `businesses/${businessId}/agents`;
    console.log("PublicCallPage: listening to agents at path:", agentsPath);
    const agentsRef = collection(db, agentsPath);
    const q = query(agentsRef, limit(1));
    
    const agentUnsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const agentData = querySnapshot.docs[0].data() as Agent;
        console.log("PublicCallPage: agent found:", agentData.name);
        const fullAgent = { ...agentData, id: querySnapshot.docs[0].id };
        setAgent(fullAgent);
        agentRef.current = fullAgent;
      } else {
        console.warn("PublicCallPage: no agent found for businessId:", businessId);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to agent:", error);
      handleFirestoreError(error, OperationType.LIST, agentsPath);
      setLoading(false);
    });

    return () => {
      businessUnsubscribe();
      agentUnsubscribe();
    };
  }, [businessId]);

  const durationRef = useRef(0);

  useEffect(() => {
    if (isCalling) {
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => {
      clearInterval(timerRef.current);
    };
  }, [isCalling]);

  const handleCallEndRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const isSavingRef = useRef(false);

  const handleCallEnd = async () => {
    if (isSavingRef.current) return;
    
    const finalDuration = durationRef.current;
    const finalTranscript = transcriptRef.current;
    const finalConversationId = elevenLabsAgent.conversationId;
    
    console.log("PublicCallPage: handleCallEnd triggered", { 
      finalDuration, 
      transcriptCount: finalTranscript.length,
      businessId,
      finalConversationId
    });

    if (finalDuration === 0 && finalTranscript.length === 0) {
      console.log("PublicCallPage: Skipping save - no duration or transcript");
      return;
    }

    if (!businessId) {
      console.error("PublicCallPage: Cannot save call log - businessId is missing");
      return;
    }

    isSavingRef.current = true;
    try {
      setStatus("Saving activity...");
      
      const transcriptText = finalTranscript.map(m => {
        const role = m.role === 'ai' ? 'Agent' : 'User';
        return `${role}: ${m.text}`;
      }).join("\n");

      // Save to Firestore with status IN_PROGRESS
      // We process it here instead of relying on BookingProcessor
      const callsPath = `businesses/${businessId}/calls`;
      const callData = {
        businessId,
        agentId: agentRef.current?.id || "unknown",
        duration: finalDuration,
        status: "IN_PROGRESS",
        transcript: transcriptText,
        phoneNumber: "Web Caller",
        psid: psid || null,
        callerName: userName || null,
        elevenLabsConversationId: finalConversationId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      let callDocRef;
      if (finalConversationId) {
        callDocRef = doc(db, callsPath, finalConversationId);
        await setDoc(callDocRef, callData, { merge: true });
      } else {
        callDocRef = await addDoc(collection(db, callsPath), callData);
      }
      
      const callId = callDocRef.id;
      setStatus("Call saved");

      // 4. Process transcript with Gemini for summary and status
      try {
        const gemini = await getGeminiService();
        if (gemini) {
          const result = await gemini.processTranscript(transcriptText);
          if (result) {
            await updateDoc(doc(db, `businesses/${businessId}/calls`, callId), {
              summary: result.summary || null,
              status: result.status || "INQUIRY",
              bookingDetails: result.bookingDetails || null,
              bookingTime: result.bookingDetails?.dateTime || null,
              updatedAt: serverTimestamp(),
            });

            // Send Booking Confirmation Email
            if (result.status === "BOOKED" && result.bookingDetails?.email) {
              try {
                console.log(`PublicCallPage: Sending confirmation email to ${result.bookingDetails.email}`);
                const emailResponse = await fetch("/api/email/send-booking-confirmation", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: result.bookingDetails.email,
                    name: result.bookingDetails.name || userName || "Customer",
                    dateTime: result.bookingDetails.dateTime || "TBD",
                    purpose: result.bookingDetails.purpose || "Appointment",
                    businessName: businessName || "Vico AI"
                  })
                });
                
                if (!emailResponse.ok) {
                  console.error("PublicCallPage: Failed to send email", await emailResponse.text());
                } else {
                  console.log("PublicCallPage: Confirmation email sent successfully");
                }
              } catch (emailError) {
                console.error("PublicCallPage: Error sending confirmation email:", emailError);
              }
            }
            
            // CRM Integration: Update or Create Contact
            const phoneNumber = result.bookingDetails?.phone || "Web Caller";
            if (phoneNumber && phoneNumber !== "Unknown") {
              try {
                const contactsRef = collection(db, `businesses/${businessId}/contacts`);
                const contactQuery = query(contactsRef, where("phone", "==", phoneNumber));
                const contactSnapshot = await getDocs(contactQuery);
                
                const contactStatus = result.status === "BOOKED" ? "BOOKED" : "INQUIRED";
                const contactData = {
                  name: result.bookingDetails?.name || userName || "Unknown",
                  phone: phoneNumber,
                  email: result.bookingDetails?.email || "",
                  status: contactStatus,
                  lastCallId: callId,
                  lastCallSummary: result.summary,
                  updatedAt: serverTimestamp(),
                  createdAt: serverTimestamp(), // Will be merged if exists
                };

                if (!contactSnapshot.empty) {
                  const contactDoc = contactSnapshot.docs[0];
                  // Don't overwrite createdAt
                  const { createdAt, ...updateContactData } = contactData;
                  await updateDoc(contactDoc.ref, updateContactData);
                  console.log(`PublicCallPage: Updated contact ${contactDoc.id}`);
                } else {
                  const newContactRef = doc(contactsRef);
                  await setDoc(newContactRef, contactData);
                  console.log(`PublicCallPage: Created new contact ${newContactRef.id}`);
                }
              } catch (contactError) {
                console.error("PublicCallPage: Error creating/updating contact:", contactError);
              }
            }
          }
        }
      } catch (err) {
        console.error("Error processing transcript with Gemini:", err);
        // Fallback to INQUIRY if processing fails
        await updateDoc(doc(db, `businesses/${businessId}/calls`, callId), {
          status: "INQUIRY",
          updatedAt: serverTimestamp(),
        });
      }

      // Deduct AI minutes
      const businessRef = doc(db, "businesses", businessId);
      const minutesUsed = Math.max(0.1, finalDuration / 60);
      await updateDoc(businessRef, {
        usedMinutes: increment(minutesUsed)
      });
      
    } catch (error) {
      console.error("PublicCallPage: Operation failed:", error);
      setStatus("Error saving call");
    } finally {
      setDuration(0);
      durationRef.current = 0;
      transcriptRef.current = [];
      setTranscript([]);
      isSavingRef.current = false;
    }
  };

  useEffect(() => {
    handleCallEndRef.current = handleCallEnd;
  }, [handleCallEnd]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startCall = async () => {
    if (isCalling || status === "Connecting...") {
      return;
    }

    if (!agent || businessId === "undefined") {
      console.error("PublicCallPage: Cannot start call, agent not loaded or businessId is undefined", { agent, businessId });
      setStatus("Agent not loaded");
      return;
    }

    if (!agent.elevenLabsAgentId) {
      console.error("PublicCallPage: Agent is missing elevenLabsAgentId");
      setStatus("Config Error");
      return;
    }

    if (!hasCredits) {
      setStatus("Out of credits");
      showToast("This business has run out of AI minutes.", "error");
      return;
    }

    try {
      // Fetch business data if not already fully loaded
      const businessDoc = await getDoc(doc(db, "businesses", businessId));
      const businessData = businessDoc.data();
      
      const dynamicVariables = {
        business_id: businessId,
        business_name: businessName || businessData?.name || "Our Business",
        current_date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        current_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        business_hours: businessData?.businessHours ? businessData.businessHours.map((h: any) => `${h.day}: ${h.closed ? 'Closed' : `${h.open} - ${h.close}`}`).join(", ") : "Not provided",
        timezone: businessData?.timezone || "Not provided",
      };

      console.log("PublicCallPage: Starting call with dynamic variables:", dynamicVariables);
      await startConnection(dynamicVariables);
    } catch (error: any) {
      console.error("Failed to start call:", error);
      setStatus("Error");
      setIsCalling(false);
      
      if (error.message?.includes("API Key is missing")) {
        showToast("ElevenLabs API Key is missing. Please add it in Settings > Secrets.", "error");
      } else {
        showToast("Failed to start voice session. Check console for details.", "error");
      }
    }
  };

  const endCall = async () => {
    stopConnection();
    handleCallEndRef.current?.();
  };

  const toggleMute = async () => {
    setIsMuted(!isMuted);
  };

  const handleCall = async () => {
    if (status === "Connecting...") {
      return;
    }

    if (isCalling) {
      await endCall();
    } else {
      setTranscript([]);
      transcriptRef.current = [];
      durationRef.current = 0;
      setDuration(0);
      await startCall();
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !isCalling) return;
    
    // Add user message to local transcript
    const userMsg = { role: "user" as const, text: text.trim() };
    setTranscript(prev => [...prev, userMsg]);
    transcriptRef.current = [...transcriptRef.current, userMsg];
    
    // Send to ElevenLabs
    await sendText(text.trim());
    
    // Clear input
    setInputText("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-[var(--brand-primary)] animate-spin mb-4" />
        <p className="text-[var(--text-muted)] font-medium">Loading AI Agent...</p>
      </div>
    );
  }

  if (!agent || businessId === "undefined") {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-[var(--color-danger)]/10 rounded-full flex items-center justify-center mb-6">
          <PhoneOff className="w-10 h-10 text-[var(--color-danger)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Agent Not Found</h1>
        <p className="text-[var(--text-muted)] max-w-md">
          {businessId === "undefined" 
            ? "The link is incomplete. Please ask the business owner for a valid shareable link."
            : "This business hasn't set up their AI agent yet or the link is invalid."}
        </p>
        <Link to="/" className="mt-8 text-[var(--brand-primary)] hover:opacity-80 font-semibold flex items-center space-x-2">
          <span>Go to Vico</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col relative">
      {/* Background Image */}
      {backgroundUrl && (
        <div className="fixed inset-0 z-0 overflow-hidden">
          <img 
            src={backgroundUrl} 
            alt="Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      
      {/* Public Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-[var(--brand-primary)]/10">
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <Logo iconSize={32} />
          )}
          <div>
            <h1 className="text-lg font-bold text-[var(--text-main)] tracking-tight">{businessName}</h1>
          </div>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
          isCalling ? "bg-[var(--color-success)]/10 border-[var(--color-success)]/20 text-[var(--color-success)]" : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)]"
        }`}>
          <Activity className={`w-3 h-3 ${isCalling ? "animate-pulse" : ""}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{status}</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-6 flex flex-col lg:flex-row lg:items-start gap-6 relative z-10">
        {/* Call Controls */}
        <div className="flex-1 flex flex-col space-y-6 lg:sticky lg:top-24">
          <div className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 md:p-12 h-[500px] lg:h-[600px]">
            <AnimatePresence>
              {isCalling && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/5 to-transparent pointer-events-none"
                />
              )}
            </AnimatePresence>

            <div className="relative z-10 flex flex-col items-center text-center space-y-8 w-full">
              <div className="relative">
                <AnimatePresence>
                  {isCalling && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-[var(--brand-primary)] rounded-full blur-3xl"
                    />
                  )}
                </AnimatePresence>
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                  isCalling ? "bg-[var(--bg-card)] border-[var(--brand-primary)] shadow-2xl shadow-[var(--brand-primary)]/20" : "bg-[var(--bg-card)] border-[var(--border-main)]"
                }`}>
                  <Logo 
                    iconSize={60} 
                    className={`transition-all duration-500 ${isCalling ? "scale-110" : "opacity-30 grayscale"}`} 
                  />
                </div>
              </div>

              <div className="space-y-6 w-full max-w-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] tracking-tight">{businessName || "AI Assistant"}</h2>
                  <div className="flex items-center justify-center space-x-2 text-[var(--text-muted)] font-mono text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* Futuristic Soundwave Animation */}
                <div className="flex items-end justify-center space-x-1.5 h-16 px-4">
                  {[...Array(24)].map((_, i) => {
                    const baseHeight = 15 + (i % 7) * 6;
                    return (
                      <motion.div
                        key={i}
                        animate={isCalling ? {
                          height: [8, baseHeight, 12, baseHeight + 12, 8],
                          opacity: [0.3, 1, 0.3],
                        } : {
                          height: 4,
                          opacity: 0.1
                        }}
                        transition={{
                          duration: 1 + (i % 4) * 0.2,
                          repeat: Infinity,
                          delay: i * 0.04,
                          ease: "easeInOut"
                        }}
                        className={`w-1 rounded-full transition-colors ${
                          isCalling ? "bg-gradient-to-t from-[var(--brand-primary)] to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "bg-[var(--border-main)]"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col items-center space-y-6 pt-4">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-2xl border transition-all ${
                      isMuted ? "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-[var(--color-danger)]" : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button 
                    onClick={handleCall}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
                      isCalling 
                        ? "bg-[var(--color-danger)] hover:opacity-90 text-white shadow-[var(--color-danger)]/20 rotate-[135deg]" 
                        : "bg-[var(--brand-primary)] hover:opacity-90 text-[var(--bg-main)] shadow-[var(--brand-primary)]/20"
                    }`}
                  >
                    {status === "Connecting..." ? <Loader2 className="w-8 h-8 animate-spin" /> : <Phone className="w-8 h-8" />}
                  </button>

                  <button 
                    onClick={() => {
                      if (isSpeakerOn) {
                        setVolume(0);
                      } else {
                        setVolume(1);
                      }
                      setIsSpeakerOn(!isSpeakerOn);
                    }}
                    className={`p-4 rounded-2xl border transition-all ${
                      !isSpeakerOn ? "bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20 text-[var(--color-danger)]" : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </button>
                </div>

                {isCalling && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-3 bg-[var(--bg-card)]/50 backdrop-blur-md border border-[var(--border-main)] px-4 py-2 rounded-2xl"
                  >
                    <Volume2 className="w-4 h-4 text-[var(--text-muted)]" />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-32 h-1 bg-[var(--border-main)] rounded-lg appearance-none cursor-pointer accent-[var(--brand-primary)]"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Removed security footer */}
        </div>

        {/* Transcript */}
        <div className="w-full lg:w-96 glass-card flex flex-col h-[500px] lg:h-[600px] lg:sticky lg:top-24 overflow-hidden">
          <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-[var(--brand-primary)]" />
              <h3 className="font-semibold text-[var(--text-main)]">Live Transcript</h3>
            </div>
            <div className="flex items-center space-x-3">
              {isAiThinking && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-[var(--brand-primary)] rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-[var(--brand-primary)] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-[var(--brand-primary)] rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <button 
                onClick={() => setTranscript([])}
                className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors uppercase tracking-widest"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                <MessageSquare className="w-12 h-12" />
                <p className="text-sm">Transcript will appear here <br /> once the call starts.</p>
              </div>
            ) : (
              <>
                {transcript.map((msg, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col w-full ${msg.role === "ai" ? "items-start" : "items-end"}`}
                  >
                    <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "ai" 
                        ? "bg-[var(--bg-card)]/80 text-[var(--text-main)] rounded-tl-none border border-[var(--border-main)]/50" 
                        : "bg-[var(--brand-primary)] text-white font-medium rounded-tr-none shadow-[var(--brand-primary)]/10"
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>
          <div className="p-4 bg-[var(--bg-card)]/50 border-t border-[var(--border-main)]">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputText);
              }}
              className="relative"
            >
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={!isCalling}
                placeholder={isCalling ? "Type a message..." : "Start a call to chat..."}
                className="w-full pl-4 pr-12 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 transition-all disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!isCalling || !inputText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--brand-primary)] text-white rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="p-8 text-center relative z-10">
        <p className="text-[var(--text-muted)] text-xs">
          Powered by <a href="/" className="hover:text-[var(--brand-primary)] transition-colors font-medium">Vico</a>
        </p>
      </footer>
    </div>
  );
}
