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
  Settings,
  ChevronDown
} from "lucide-react";
import { Agent, CallStatus, Business, SubscriptionPlan } from "../types";
import { Logo } from "../components/Logo";
import { useElevenLabsAgent } from "../hooks/useElevenLabsAgent";
import { ROUTES, PRODUCTION_URL } from "../constants";
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
  increment
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
  const [businessTimezone, setBusinessTimezone] = useState("UTC");
  const [logoUrl, setLogoUrl] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [hasCredits, setHasCredits] = useState(true);
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState(false);

  const elevenLabsAgent = useElevenLabsAgent({
    agentId: agent?.elevenLabsAgentId || "",
    onTranscript: (text, role) => {
      // Filter out bracketed instructions like [confirming], [polite], etc.
      const cleanText = text.replace(/\[.*?\]/g, '').trim();
      if (!cleanText && role === 'ai') return; // Don't add empty AI messages

      setTranscript(prev => {
        const newTranscript = [...prev];
        const lastMsg = newTranscript[newTranscript.length - 1];
        if (lastMsg && lastMsg.role === role) {
          lastMsg.text = cleanText;
        } else {
          newTranscript.push({ role, text: cleanText });
        }
        return newTranscript;
      });
      
      const lastMsgRef = transcriptRef.current[transcriptRef.current.length - 1];
      if (lastMsgRef && lastMsgRef.role === role) {
        lastMsgRef.text = cleanText;
      } else {
        transcriptRef.current = [...transcriptRef.current, { role, text: cleanText }];
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
    },
    onCallEnd: () => {
      console.log("PublicCallPage: AI requested call end");
      endCall();
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
        setBusinessTimezone(data.timezone || "UTC");
        setLogoUrl(data.logoUrl || "");
        setBackgroundUrl(data.backgroundUrl || "");
        
        // Check credits
        const limit = data.totalMinutes || 60;
        const used = data.usedMinutes || 0;
        setHasCredits(used < limit);
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

      // Save to Firestore with status PENDING_PROCESSING
      // This will trigger the BookingProcessor (which runs in App.tsx) to use Gemini
      const callsPath = `businesses/${businessId}/calls`;
      const callData = {
        businessId,
        agentId: agentRef.current?.id || "unknown",
        duration: finalDuration,
        status: "PENDING_PROCESSING",
        transcript: transcriptText,
        phoneNumber: "Web Caller",
        elevenLabsConversationId: finalConversationId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (finalConversationId) {
        await setDoc(doc(db, callsPath, finalConversationId), callData, { merge: true });
      } else {
        await addDoc(collection(db, callsPath), callData);
      }
      
      setStatus("Call saved");
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

    try {
      // Fetch business data if not already fully loaded
      const businessDoc = await getDoc(doc(db, "businesses", businessId));
      const businessData = businessDoc.data();
      
      const timezone = businessTimezone || businessData?.timezone || "UTC";
      const now = new Date();
      
      const dynamicVariables = {
        business_id: businessId,
        business_name: businessName || businessData?.name || "Our Business",
        current_date: now.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          timeZone: timezone 
        }),
        current_time: now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: timezone 
        }),
        business_hours: businessData?.businessHours ? businessData.businessHours.map((h: any) => `${h.day}: ${h.closed ? 'Closed' : `${h.open} - ${h.close}`}`).join(", ") : "Not provided",
        timezone: timezone,
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
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-[var(--text-muted)] font-medium">Loading AI Agent...</p>
      </div>
    );
  }

  if (!agent || businessId === "undefined") {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6">
          <PhoneOff className="w-10 h-10 text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Agent Not Found</h1>
        <p className="text-[var(--text-muted)] max-w-md">
          {businessId === "undefined" 
            ? "The link is incomplete. Please ask the business owner for a valid shareable link."
            : "This business hasn't set up their AI agent yet or the link is invalid."}
        </p>
        <a href={PRODUCTION_URL} className="mt-8 text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-2">
          <span>Go to Vico</span>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col relative overflow-hidden">
      {/* Background Image */}
      {backgroundUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src={backgroundUrl} 
            alt="Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      
      <main className="flex-1 w-full p-6 flex flex-col items-center justify-center relative z-10">
        {/* Call Controls */}
        <div className="w-full max-w-2xl flex flex-col space-y-6">
          <div className="glass-card relative overflow-hidden flex flex-col items-center justify-center p-8 md:p-12 min-h-[600px]">
            <AnimatePresence>
              {isCalling && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"
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
                      className="absolute inset-0 bg-blue-500 rounded-full blur-3xl"
                    />
                  )}
                </AnimatePresence>
                <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                  isCalling ? "bg-[var(--bg-card)] border-blue-500 shadow-2xl shadow-blue-500/20" : "bg-[var(--bg-card)] border-[var(--border-main)]"
                }`}>
                  <Logo 
                    iconSize={60} 
                    className={`transition-all duration-500 ${isCalling ? "scale-110" : "opacity-30 grayscale"}`} 
                  />
                </div>
              </div>

              <div className="space-y-6 w-full max-w-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] tracking-tight">{agent?.name || "AI Assistant"}</h2>
                  <div className="flex items-center justify-center space-x-4 text-[var(--text-muted)] font-mono text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatDuration(duration)}</span>
                    </div>
                    {isConnected && (
                      <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Connected</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Futuristic Soundwave Animation */}
                <div className="flex items-end justify-center space-x-1.5 h-10 px-4">
                  {[...Array(24)].map((_, i) => {
                    const baseHeight = 10 + (i % 7) * 4;
                    return (
                      <motion.div
                        key={i}
                        animate={isCalling ? {
                          height: [6, baseHeight, 8, baseHeight + 8, 6],
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
                          isCalling ? "bg-gradient-to-t from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]" : "bg-[var(--border-main)]"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Collapsible Transcript Section */}
              <div className="w-full max-w-md mx-auto space-y-4">
                <div className="flex flex-col w-full bg-[var(--bg-card)]/50 border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-sm">
                  <button 
                    onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-widest">Live Transcript</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {isAiThinking && (
                        <div className="flex items-center space-x-1">
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                      )}
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-300 ${isTranscriptExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isTranscriptExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 200, opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="flex flex-col border-t border-[var(--border-main)]"
                      >
                        <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-[var(--bg-main)]/30">
                          {transcript.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center space-y-2 opacity-30">
                              <MessageSquare className="w-8 h-8 text-[var(--text-muted)]" />
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">No messages yet</p>
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
                                  <div className={`max-w-[85%] p-3 rounded-xl text-xs leading-relaxed shadow-sm ${
                                    msg.role === "ai" 
                                      ? "bg-[var(--bg-card)] text-[var(--text-main)] rounded-tl-none border border-[var(--border-main)]/50" 
                                      : "bg-blue-500 text-white font-medium rounded-tr-none shadow-blue-500/10"
                                  }`}>
                                    {msg.text}
                                  </div>
                                </motion.div>
                              ))}
                              <div ref={transcriptEndRef} />
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Chat Input Placeholder (Always visible when calling) */}
                  <div className="p-3 bg-[var(--bg-card)] border-t border-[var(--border-main)]">
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
                        className="w-full pl-4 pr-10 py-2.5 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
                      />
                      <button 
                        type="submit"
                        disabled={!isCalling || !inputText.trim()}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-6 pt-4">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-2xl border transition-all ${
                      isMuted ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button 
                    onClick={handleCall}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
                      isCalling 
                        ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 rotate-[135deg]" 
                        : "bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20"
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
                      !isSpeakerOn ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
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
                      className="w-32 h-1 bg-[var(--border-main)] rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Removed security footer */}
        </div>

      </main>
    </div>
  );
}
