import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
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
  User, 
  MessageSquare,
  Activity,
  ShieldCheck,
  Settings,
  Maximize2,
  Send,
  Loader2,
  AlertCircle
} from "lucide-react";
import { Agent } from "../types";
import { 
  collection, 
  query, 
  onSnapshot, 
  limit,
  doc,
  updateDoc,
  increment,
  getDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType, auth } from "../firebase";
import { AuthService } from "../services/authService";
import { useToast } from "../components/Toast";
import { Logo } from "../components/Logo";
import { useElevenLabsAgent } from "../hooks/useElevenLabsAgent";
import { Business, CallStatus } from "../types";
import { getGeminiService } from "../services/geminiService";
import { getElevenLabsService } from "../services/elevenlabsService";
import { PRODUCTION_URL } from "../constants";

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
  vi: "Xin chào! Tôi là {name}. Tôi có thể giúp gì for bạn hôm nay?",
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

export default function VoiceInterface() {
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("Ready to call");
  const [transcript, setTranscript] = useState<{ role: string; text: string; isFinal?: boolean }[]>([]);
  const transcriptRef = useRef<{ role: string; text: string; isFinal?: boolean }[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [agent, setAgent] = useState<Agent>({
    id: "1",
    name: "Vico Assistant",
    voice: "21m00Tcm4TlvDq8ikWAM",
    instructions: "You are a professional AI receptionist. Your goal is to answer questions and book appointments. \n\nCRITICAL: If a customer wants to book an appointment, you MUST ask for:\n1. Their full name\n2. Their email address\n3. The specific date and time they want to book.\n\nAlways confirm the date and time with the customer before ending the call. Be professional, friendly, and concise.",
    businessId: "1"
  });

  const durationRef = useRef(0);
  const timerRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const handleCallEndRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const isSavingRef = useRef(false);
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;
  const extractedDataRef = useRef<any>({});

  const handleCallEnd = async () => {
    if (isSavingRef.current) return;
    
    // Add a small delay to ensure all messages are captured from the hook's onTranscript
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalDuration = durationRef.current;
    const finalTranscript = transcriptRef.current;
    
    console.log("VoiceInterface: handleCallEnd triggered", { 
      finalDuration, 
      transcriptCount: finalTranscript.length,
      businessId 
    });

    if (finalDuration === 0 && finalTranscript.length === 0) return;
    if (!businessId) return;

    isSavingRef.current = true;
    try {
      setStatus("Analyzing call...");
      
      // 1. Get the full transcript text
      const transcriptText = finalTranscript.map(m => `${m.role.toUpperCase()}: ${m.text}`).join("\n");
      console.log("VoiceInterface: Full Transcript for Analysis:\n", transcriptText);

      // 2. Try to fetch ElevenLabs data as a secondary source/backup
      const conversationId = elevenLabsAgent.conversationId;
      let elevenLabsData: any = {};
      
      if (conversationId) {
        try {
          console.log(`VoiceInterface: Fetching background details for conversation ${conversationId}`);
          const elevenlabsService = await getElevenLabsService();
          const details = await elevenlabsService.getConversationDetails(conversationId);
          
          if (details.analysis?.data_collection_results) {
            const results = details.analysis.data_collection_results;
            elevenLabsData = {
              name: results.name?.value,
              email: results.email?.value,
              phone: results.phone?.value,
              bookingTime: results.bookingTime?.value,
              bookingPurpose: results.bookingPurpose?.value,
              summary: details.analysis.transcript_summary
            };
          }
        } catch (e) {
          console.error("VoiceInterface: Failed to fetch ElevenLabs details:", e);
        }
      }

      // 3. Use Gemini as the PRIMARY extractor for accuracy and carefulness
      let callStatus = CallStatus.INQUIRY;
      let summary = elevenLabsData.summary || "No summary available.";
      let callerName = elevenLabsData.name || "";
      let callerEmail = elevenLabsData.email || "";
      let callerPhone = elevenLabsData.phone || "";
      let bookingTime = elevenLabsData.bookingTime || "";
      let bookingPurpose = elevenLabsData.bookingPurpose || "";
      let answeredCorrectly = true;

      if (finalDuration < 2 && finalTranscript.length < 1) {
        callStatus = CallStatus.DROPPED;
        summary = "Test call was dropped or ended very quickly.";
      } else {
        const gemini = await getGeminiService();
        if (gemini && transcriptText.length > 0) {
          console.log("VoiceInterface: Performing primary extraction with Gemini...");
          const currentTime = new Date().toLocaleString();
          
          const prompt = `
            You are an expert data extraction assistant. Your task is to analyze the transcript of a call between a customer and an AI receptionist and extract specific details with HIGH PRECISION.
            
            Current Date and Time: ${currentTime}
            
            Transcript:
            ${transcriptText}
            
            INSTRUCTIONS:
            1. Extract the following fields ONLY if they are explicitly stated or clearly implied. Be CAREFUL not to hallucinate details.
            2. SUMMARY: A concise 1-sentence summary of the call.
            3. TAG: Classify the call as one of: [INQUIRY, BOOKED, COMPLAINT, FOLLOW_UP, DROPPED].
               - Use 'BOOKED' if the caller requested an appointment/visit/meeting and a specific date/time was discussed, requested, or confirmed. THIS IS THE HIGHEST PRIORITY.
               - If the caller says "I want to book for tomorrow at 10am" -> TAG is 'BOOKED'.
               - If the caller provides their name/email/phone in the context of a booking -> TAG is 'BOOKED'.
               - Use 'INQUIRY' ONLY for general questions where NO appointment was discussed.
            4. REASONING: A brief explanation of why you chose the TAG.
            5. CALLER_NAME: The full name of the caller.
            6. CALLER_EMAIL: The email address provided by the caller.
            7. CALLER_PHONE: The phone number provided by the caller.
            8. BOOKING_TIME: If the call is 'BOOKED', resolve the requested date and time into a standard ISO format (e.g., 2026-03-20T14:30:00Z). Use the Current Date and Time (${currentTime}) to resolve relative terms like "tomorrow", "next Monday", etc.
            9. BOOKING_PURPOSE: The reason for the booking or the service requested.
            10. ANSWERED_CORRECTLY: A boolean indicating if the AI agent provided helpful and accurate information based on the conversation flow.
            
            CRITICAL RULES:
            - If a piece of information (like email or name) was NOT mentioned, leave the field as an empty string ("").
            - Be extremely careful with phone numbers and emails; ensure they are captured exactly as spoken.
            - If multiple times were discussed, use the final agreed-upon time.
            
            Return the result as a JSON object.
            
            Example Output:
            {
              "summary": "Customer booked a consultation for next Wednesday at 10 AM.",
              "tag": "BOOKED",
              "reasoning": "Caller explicitly requested a consultation and agreed on a time (next Wednesday 10 AM).",
              "callerName": "Jane Smith",
              "callerEmail": "jane.smith@example.com",
              "callerPhone": "555-0199",
              "bookingTime": "2026-03-25T10:00:00Z",
              "bookingPurpose": "Consultation",
              "answeredCorrectly": true
            }
          `;
          
          try {
            const result = await gemini.generateResponse(prompt);
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              summary = parsed.summary ?? summary;
              callStatus = (parsed.tag as CallStatus) ?? callStatus;
              callerName = parsed.callerName ?? callerName;
              callerEmail = parsed.callerEmail ?? callerEmail;
              callerPhone = parsed.callerPhone ?? callerPhone;
              bookingTime = parsed.bookingTime ?? bookingTime;
              bookingPurpose = parsed.bookingPurpose ?? bookingPurpose;
              answeredCorrectly = parsed.answeredCorrectly ?? true;
              
              console.log("VoiceInterface: Gemini Primary Extraction Success:", { 
                callStatus, 
                callerName, 
                bookingTime,
                reasoning: parsed.reasoning 
              });
            }
          } catch (e) {
            console.error("VoiceInterface: Gemini extraction failed, falling back to ElevenLabs/Local data:", e);
          }
        }
      }

      console.log("VoiceInterface: Saving final call record to Firestore...", { 
        businessId, 
        status: callStatus,
        callerName,
        bookingTime 
      });

      const callsRef = collection(db, `businesses/${businessId}/calls`);
      await addDoc(callsRef, {
        businessId,
        agentId: agent.id || "unknown",
        duration: finalDuration,
        status: callStatus,
        transcript: transcriptText,
        summary,
        callerName,
        callerEmail,
        phoneNumber: callerPhone,
        bookingTime,
        bookingPurpose,
        answeredCorrectly,
        createdAt: serverTimestamp()
      });
      
      // Send confirmation email if booked
      if (callStatus === CallStatus.BOOKED && callerEmail && bookingTime) {
        try {
          const businessDoc = await getDoc(doc(db, "businesses", businessId));
          const businessTimezone = businessDoc.exists() ? (businessDoc.data().timezone || "UTC") : "UTC";
          const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(bookingTime);
          const bookingDate = hasOffset ? new Date(bookingTime) : fromZonedTime(bookingTime, businessTimezone);
          const formattedTime = formatInTimeZone(bookingDate, businessTimezone, "MMMM d, yyyy 'at' h:mm a");
          const idToken = await auth.currentUser?.getIdToken();
          await fetch("/api/send-email", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify({
              to: callerEmail,
              subject: "Appointment Confirmation",
              text: `Hi ${callerName || "there"},\n\nYour appointment has been confirmed for ${formattedTime} (${businessTimezone}).\n\nPurpose: ${bookingPurpose || "Appointment"}\n\nThank you!`,
              html: `<p>Hi ${callerName || "there"},</p><p>Your appointment has been confirmed for <strong>${formattedTime} (${businessTimezone})</strong>.</p><p>Purpose: ${bookingPurpose || "Appointment"}</p><p>Thank you!</p>`
            })
          });
          console.log(`VoiceInterface: Sent confirmation email to ${callerEmail}`);
        } catch (emailError) {
          console.error(`VoiceInterface: Failed to send confirmation email to ${callerEmail}:`, emailError);
        }
      }

      setStatus("Call saved");

      // Deduct credits
      const businessRef = doc(db, "businesses", businessId);
      const minutesUsed = Math.max(0.1, finalDuration / 60);
      await updateDoc(businessRef, {
        usedMinutes: increment(minutesUsed)
      });
      
      setStatus("Activity saved");
    } catch (error) {
      console.error("Error saving test call:", error);
      handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}/calls`);
    } finally {
      setDuration(0);
      durationRef.current = 0;
      transcriptRef.current = [];
      setTranscript([]);
      extractedDataRef.current = {}; // Reset extracted data
      isSavingRef.current = false;
    }
  };

  const dynamicVariables = useMemo(() => ({
    current_time: new Date().toLocaleString(),
    business_name: authState.user?.businessName || "Vico Business",
    user_id: authState.user?.id || "anonymous",
    business_id: businessId || "anonymous",
    call_source: "Vico Web Interface"
  }), [businessId, authState.user?.id, authState.user?.businessName]);

  const elevenLabsAgent = useElevenLabsAgent({
    agentId: agent.elevenLabsAgentId || "",
    clientReferenceId: businessId || "anonymous",
    dynamicVariables,
    onTranscript: (text, role, isFinal) => {
      // Filter out bracketed instructions like [confirming], [polite], etc.
      const cleanText = text.replace(/\[.*?\]/g, '').trim();
      if (!cleanText && role === 'ai') return; // Don't add empty AI messages

      console.log(`VoiceInterface: Transcript [${role}] (final: ${isFinal}): ${cleanText}`);
      setTranscript(prev => {
        const newTranscript = [...prev];
        const lastMsg = newTranscript[newTranscript.length - 1];
        
        // If the last message is from the same role and was NOT final, update it
        if (lastMsg && lastMsg.role === role && !lastMsg.isFinal) {
          lastMsg.text = cleanText;
          lastMsg.isFinal = isFinal;
        } else {
          // Otherwise, push a new message
          newTranscript.push({ role, text: cleanText, isFinal });
        }
        
        // Keep ref in sync
        transcriptRef.current = newTranscript;
        return newTranscript;
      });
    },
    onDataExtracted: (data) => {
      console.log("VoiceInterface: ElevenLabs Data Extracted:", data);
      extractedDataRef.current = { ...extractedDataRef.current, ...data };
    },
    onError: (error) => {
      console.error("ElevenLabs Agent error:", error);
      setStatus("Error");
      setIsCalling(false);
      
      let msg = error.message || "Voice connection error";
      if (msg.includes("not found") || msg.includes("404")) {
        msg = "AI Agent not found on ElevenLabs. Please re-save the agent in the Agent Configuration page.";
      }
      showToast(msg, "error");
    },
    onStatusChange: (newStatus) => {
      setStatus(newStatus);
    },
    onCallEnd: () => {
      console.log("VoiceInterface: AI requested call end");
      endCall();
    }
  });

  const { startConnection, stopConnection, sendText, isConnected, isConnecting, isAiSpeaking, audioLevel, setIsMuted: setAgentMuted, setVolume: setAgentVolume } = elevenLabsAgent;

  const [volume, setVolume] = useState(1);

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
  }, [volume, setIsSpeakerOn]);

  const handleResetAudio = async () => {
    // ElevenLabs SDK handles its own audio context
    showToast("Audio system reset", "info");
  };

  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (isConnected) {
      setStatus("Live");
      setIsCalling(true);
      wasConnectedRef.current = true;
    } else if (isConnecting) {
      setStatus("Connecting...");
    } else {
      setStatus("Ready to call");
      setIsCalling(false);
      
      // If we were connected and now we're not, trigger handleCallEnd
      if (wasConnectedRef.current) {
        console.log("VoiceInterface: Connection lost, triggering handleCallEnd");
        handleCallEndRef.current?.();
        wasConnectedRef.current = false;
      }
    }
  }, [isConnected, isConnecting]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (!businessId) return;
    
    const agentsRef = collection(db, `businesses/${businessId}/agents`);
    const q = query(agentsRef, limit(1));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const agentData = querySnapshot.docs[0].data() as Agent;
        setAgent({ ...agentData, id: querySnapshot.docs[0].id });
      }
    }, (error) => {
      console.error("Error listening to agent:", error);
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/agents`);
    });

    return () => unsubscribe();
  }, [businessId]);

  useEffect(() => {
    handleCallEndRef.current = handleCallEnd;
  }, [handleCallEnd]);

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startCall = async () => {
    if (isCalling || status === "Connecting...") {
      return;
    }

    // Check credits
    const businessDoc = await getDoc(doc(db, "businesses", businessId!));
    if (businessDoc.exists()) {
      const data = businessDoc.data();
      const limit = data.totalMinutes || 60;
      const used = data.usedMinutes || 0;
      if (used >= limit) {
        showToast("You have run out of AI minutes. Overage rates may apply.", "info");
      }
    }

    try {
      await startConnection();
    } catch (error: any) {
      console.error("Failed to start call:", error);
      setStatus("Error");
      setIsCalling(false);
      
      const msg = error.message || "";
      if (msg.includes("API key not configured") || msg.includes("Missing API Key")) {
        showToast("ElevenLabs API Key is missing. Please add it in Settings > Secrets.", "error");
      } else {
        showToast(msg || "Failed to start voice session. Check console for details.", "error");
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

  const testAudio = async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
      
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      
      oscillator.start();
      oscillator.stop(ctx.currentTime + 1);
      
      showToast("Test tone played. If you didn't hear it, check your volume.", "info");
    } catch (e) {
      console.error("Test audio failed:", e);
      showToast("Failed to play test tone", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Voice Lab</h1>
          <p className="text-zinc-500 mt-1">Testing agent: <span className="text-blue-400 font-semibold">{agent.name}</span></p>
        </div>
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all ${
            isCalling ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }`}>
            <Activity className={`w-4 h-4 ${isCalling ? "animate-pulse" : ""}`} />
            <span className="text-xs font-bold uppercase tracking-wider">{status}</span>
          </div>
          <button className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Real-time Transcript */}
        <div className="glass-card flex flex-col overflow-hidden h-[600px] card-hover">
          <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Live Transcript</h3>
            </div>
            <div className="flex items-center space-x-3">
              {isAiThinking && (
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <button 
                onClick={() => setTranscript([])}
                className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
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
                        ? "bg-zinc-800/80 text-zinc-200 rounded-tl-none border border-zinc-700/50" 
                        : "bg-blue-500 text-zinc-950 font-medium rounded-tr-none shadow-blue-500/10"
                    }`}>
                      {msg.text}
                    </div>
                    <span className={`text-[10px] text-[var(--text-muted)] mt-2 uppercase tracking-widest font-bold flex items-center space-x-1 ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
                      <span>{msg.role === "ai" ? agent.name : "You"}</span>
                      <span>•</span>
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </motion.div>
                ))}
                <div ref={transcriptEndRef} />
              </>
            )}
          </div>
          <div className="p-4 bg-zinc-900/50 border-t border-zinc-900">
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
                disabled={!isCalling || isAiThinking}
                placeholder={isCalling ? "Type a message to AI..." : "Start a call to chat..."}
                className="w-full pl-4 pr-12 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!isCalling || isAiThinking || !inputText.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-500 text-zinc-950 rounded-lg hover:bg-blue-400 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Call Controls & Visualizer */}
        <div className="lg:col-span-2 flex flex-col space-y-6 min-h-[500px] lg:min-h-0">
          <div className="flex-1 glass-card relative overflow-hidden flex flex-col items-center justify-center p-6 md:p-12 card-hover">
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

            <div className="relative z-10 flex flex-col items-center text-center space-y-8">
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
                <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500 ${
                  isCalling ? "bg-zinc-900 border-blue-500 shadow-2xl shadow-blue-500/20" : "bg-zinc-900 border-zinc-800"
                }`}>
                  <Logo 
                    iconSize={60} 
                    className={`transition-all duration-500 ${
                      isAiSpeaking ? "scale-125 animate-pulse" : isCalling ? "scale-110" : "opacity-30 grayscale"
                    }`} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">{agent.name}</h2>
                <div className="flex items-center justify-center space-x-2 text-zinc-500 font-mono">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              <div className="flex flex-col items-center space-y-6 pt-8">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-2xl border transition-all ${
                      isMuted ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>

                  <button 
                    onClick={handleCall}
                    className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all transform active:scale-95 ${
                      isCalling 
                        ? "bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 rotate-[135deg]" 
                        : "bg-blue-500 hover:bg-blue-600 text-zinc-950 shadow-blue-500/20"
                    }`}
                    style={{
                      boxShadow: isAiSpeaking ? `0 0 ${20 + audioLevel * 100}px rgba(59, 130, 246, ${0.2 + audioLevel})` : undefined,
                      scale: isAiSpeaking ? 1 + audioLevel * 0.2 : 1
                    }}
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
                      !isSpeakerOn ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </button>
                </div>

                {isCalling && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center space-x-3 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-2xl"
                  >
                    <Volume2 className="w-4 h-4 text-zinc-500" />
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-32 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-12 flex items-end justify-center space-x-1 px-12 pb-4 pointer-events-none">
              {Array.from({ length: 40 }).map((_, i) => (
                <motion.div 
                  key={i}
                  animate={isCalling ? { 
                    height: isAiSpeaking 
                      ? [6, 6 + Math.random() * (audioLevel * 60), 6] 
                      : [6, Math.random() * 10 + 6, 6] 
                  } : { height: 4 }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.02 }}
                  className={`w-1 rounded-full ${isCalling ? (isAiSpeaking ? "bg-blue-500" : "bg-blue-500/40") : "bg-zinc-800"}`}
                />
              ))}
            </div>
          </div>

          {/* Removed security footer */}
        </div>
      </div>
      <footer className="p-8 text-center border-t border-zinc-900 relative z-10">
        <p className="text-zinc-500 text-xs">
          Powered by <a href={PRODUCTION_URL} className="text-blue-500 hover:text-blue-400 transition-colors font-bold">Vico</a>
        </p>
      </footer>
    </div>
  );
}
