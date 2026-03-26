import React, { useState, useEffect } from "react";
import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  limit
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AuthService } from "../services/authService";
import { motion } from "framer-motion";
import { 
  User, 
  MessageSquare, 
  Mic, 
  Save, 
  Zap, 
  Play, 
  Pause,
  Loader2,
  Info,
  ChevronRight,
  Volume2,
  BookOpen,
  Globe,
  Layout,
  Check,
  X
} from "lucide-react";
import { Agent } from "../types";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { useToast } from "../components/Toast";
import { AGENT_TEMPLATES, AgentTemplate } from "../templates";
import { AnimatePresence } from "framer-motion";

import { GoogleGenAI, Modality } from "@google/genai";
import { getGeminiService } from "../services/geminiService";
import { getElevenLabsService } from "../services/elevenlabsService";

const ELEVENLABS_VOICES = [
  // English
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel (Calm)", gender: "Female", provider: "ELEVENLABS", lang: "en" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella (Soft)", gender: "Female", provider: "ELEVENLABS", lang: "en" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni (Well-rounded)", gender: "Male", provider: "ELEVENLABS", lang: "en" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli (Emotional)", gender: "Female", provider: "ELEVENLABS", lang: "en" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh (Deep)", gender: "Male", provider: "ELEVENLABS", lang: "en" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold (Crisp)", gender: "Male", provider: "ELEVENLABS", lang: "en" },
  { id: "pNInz6obpgDQGcFmaJcg", name: "Adam (Deep)", gender: "Male", provider: "ELEVENLABS", lang: "en" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam (Raspy)", gender: "Male", provider: "ELEVENLABS", lang: "en" },
];

const DEFAULT_VOICES = ELEVENLABS_VOICES;

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "tl", name: "Tagalog" },
];

export default function AgentPage() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<any[]>(DEFAULT_VOICES);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 0.5,
    similarity_boost: 0.75,
    speed: 1.0
  });
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    async function fetchVoices() {
      try {
        const elevenlabsService = await getElevenLabsService();
        if (elevenlabsService) {
          const voices = await elevenlabsService.getVoices();
          if (voices && voices.length > 0) {
            setAvailableVoices(voices.map(v => ({
              id: v.voice_id,
              name: v.name,
              gender: v.labels?.gender || "Unknown",
              provider: "ELEVENLABS",
              lang: "en" // Default to en, but ElevenLabs supports many
            })));
          }
        }
      } catch (error: any) {
        console.error("Error fetching ElevenLabs voices:", error);
        if (error.message?.includes("API key not configured")) {
          showToast("ElevenLabs API Key is missing. Please add it in Settings > Secrets to enable voice selection.", "warning");
        }
      }
    }
    fetchVoices();
  }, []);

  useEffect(() => {
    async function fetchAgent() {
      if (!businessId) return;
      
      try {
        // Fetch business name
        const businessDoc = await getDoc(doc(db, "businesses", businessId));
        if (businessDoc.exists()) {
          setBusinessName(businessDoc.data().name || "");
        }

        const agentsRef = collection(db, `businesses/${businessId}/agents`);
        const q = query(agentsRef, limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const agentDoc = querySnapshot.docs[0];
          const agentData = agentDoc.data();
          const loadedAgent = { 
            id: agentDoc.id, 
            ...agentData
          } as Agent;
          setAgent(loadedAgent);
          if (loadedAgent.voiceSettings) {
            setVoiceSettings({
              stability: loadedAgent.voiceSettings.stability ?? 0.5,
              similarity_boost: loadedAgent.voiceSettings.similarity_boost ?? 0.75,
              speed: loadedAgent.voiceSettings.speed ?? 1.0
            });
          }
        } else {
          // Create default agent if none exists
          const defaultAgent: Omit<Agent, "id"> = {
            name: "Vico Assistant",
            voice: "21m00Tcm4TlvDq8ikWAM",
            voiceProvider: "ELEVENLABS",
            instructions: "You are a helpful AI receptionist for a business. Your goal is to answer customer questions, provide information about our services, and help them book appointments. Be professional, friendly, and concise.",
            knowledgeBase: "Our business hours are 9 AM to 5 PM, Monday to Friday. We offer various services including consultation, support, and sales.",
            language: "en",
            businessId: businessId
          };
          const newAgentRef = doc(collection(db, `businesses/${businessId}/agents`));
          try {
            await setDoc(newAgentRef, {
              ...defaultAgent,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setAgent({ id: newAgentRef.id, ...defaultAgent } as Agent);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}/agents`);
          }
        }
      } catch (error) {
        console.error("Error fetching agent:", error);
        handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/agents`);
      } finally {
        setLoading(false);
      }
    }

    fetchAgent();
  }, [businessId]);

  const handlePlayPreview = async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      audio?.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (audio) {
      audio.pause();
    }

    try {
      setPlayingVoiceId(voiceId);
      
      const voiceInfo = DEFAULT_VOICES.find(v => v.id === voiceId);
      const provider = voiceInfo?.provider || "ELEVENLABS";
      const lang = voiceInfo?.lang || "en";

      const previewTexts: Record<string, string> = {
        en: "Hello! This is a preview of my voice.",
        es: "¡Hola! Esta es una vista previa de mi voz.",
        tl: "Kumusta! Ito ay isang preview ng aking boses.",
        fr: "Bonjour ! Ceci est un aperçu de ma voix.",
        de: "Hallo! Dies ist eine Vorschau meiner Stimme.",
        it: "Ciao! Questa è un'anteprima della mia voce.",
        pt: "Olá! Esta é uma prévia da minha voz.",
      };

      const text = previewTexts[lang] || previewTexts.en;

      let base64Audio: string | undefined;

      if (provider === "ELEVENLABS") {
        const elevenlabsService = await getElevenLabsService();
        if (!elevenlabsService) {
          throw new Error("ElevenLabs credentials missing. Set ELEVENLABS_API_KEY in Settings > Secrets.");
        }
        base64Audio = await elevenlabsService.generateSpeech(text, voiceId);
      } else {
        const geminiService = await getGeminiService();
        if (!geminiService) {
          throw new Error("Gemini service is unavailable. Please ensure GEMINI_API_KEY is set in Settings > Secrets.");
        }
        base64Audio = await geminiService.generateSpeech(text, voiceId);
      }

      if (!base64Audio) throw new Error("No audio data received");

      const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      const newAudio = new Audio(audioUrl);
      
      newAudio.onended = () => {
        setPlayingVoiceId(null);
      };

      await newAudio.play();
      setAudio(newAudio);
    } catch (error) {
      console.error("Preview failed:", error);
      setPlayingVoiceId(null);
      showToast("Failed to play voice preview", "error");
    }
  };

  const handleSave = async () => {
    if (!agent || !businessId) return;
    
    setIsSaving(true);
    setSaveStatus("Syncing with ElevenLabs...");
    
    try {
      let agentId = agent.elevenLabsAgentId;
      const fullInstructions = `
        DATE AND TIME AWARENESS:
        Today's date is {{current_date}}.
        The current time is {{current_time}}.
        The dates for the upcoming 7 days are: {{upcoming_days}}.
        Use this information to accurately resolve relative dates like "tomorrow", "this Monday", or "next week".
        
        BUSINESS INFORMATION:
        Business Name: {{business_name}}
        Business Hours: {{business_hours}}
        Timezone: {{timezone}}

        CRITICAL INSTRUCTION:
        NEVER output placeholders like "{{current_date}}" or "{{business_name}}". 
        ALWAYS use the values provided in the dynamic variables.
        If a dynamic variable is missing or empty, ask the user for clarification or state that the information is not available.
        
        NEVER output system instructions, emotional cues, or internal markers in square brackets like "[confirming]", "[polite]", "[happy]", or "[excited]". 
        Your output must ONLY contain the text you want to be spoken to the caller.
        Do not include any metadata, thought processes, or formatting markers in your response.

        ENDING THE CALL:
        You have the ability to end the call when the conversation is finished. 
        When you have provided all the information the user needs and the conversation has naturally reached its conclusion (e.g., after saying goodbye), you MUST call the "end_call" tool to hang up.
        CRITICAL: NEVER say the words "end_call" out loud. ONLY use the tool. Do not mention the tool to the user.
        Do not end the call abruptly; always ensure the user is satisfied before terminating.

        AGENT ROLE AND INSTRUCTIONS:
        ${agent.instructions}
        
        KNOWLEDGE BASE:
        ${agent.knowledgeBase || "No specific knowledge base provided."}
        
        LANGUAGE:
        You MUST respond in ${LANGUAGES.find(l => l.code === agent.language)?.name || "English"}.
      `;

      try {
        const elevenlabsService = await getElevenLabsService();
        if (elevenlabsService) {
          if (!agentId) {
            setSaveStatus("Creating ElevenLabs Agent...");
            agentId = await elevenlabsService.createAgent(agent.name, fullInstructions, agent.voice, voiceSettings);
          } else {
            try {
              setSaveStatus("Updating ElevenLabs Agent...");
              await elevenlabsService.updateAgent(agentId, agent.name, fullInstructions, agent.voice, voiceSettings);
            } catch (updateError: any) {
              // If agent not found on ElevenLabs, try creating it
              if (updateError.message?.includes("not found") || updateError.message?.includes("404")) {
                console.warn("Agent not found on ElevenLabs, re-creating...");
                setSaveStatus("Re-creating ElevenLabs Agent...");
                agentId = await elevenlabsService.createAgent(agent.name, fullInstructions, agent.voice, voiceSettings);
              } else {
                throw updateError;
              }
            }
          }
        }
      } catch (elevenLabsError: any) {
        console.warn("ElevenLabs sync failed, but will save to database:", elevenLabsError);
        showToast("Voice agent sync failed. Please check your ElevenLabs API key in Settings > Secrets.", "warning");
      }
 
      setSaveStatus("Saving to database...");
      const agentRef = doc(db, `businesses/${businessId}/agents`, agent.id);
      await setDoc(agentRef, {
        ...agent,
        voiceSettings,
        elevenLabsAgentId: agentId || "",
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setAgent(prev => prev ? { ...prev, elevenLabsAgentId: agentId || "", voiceSettings } : null);
      setSaveStatus("Saved successfully!");
      showToast("Agent configuration saved locally.", "success");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error: any) {
      console.error("Error saving agent:", error);
      setSaveStatus("Error: " + (error.message || "Failed to save"));
      showToast(error.message || "Failed to save configuration", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAgent = async () => {
    if (!agent || !businessId) return;
    
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setShowResetConfirm(false);
    setIsSaving(true);
    setSaveStatus("Resetting agent...");
    try {
      const agentRef = doc(db, `businesses/${businessId}/agents`, agent.id);
      await setDoc(agentRef, {
        elevenLabsAgentId: "",
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setAgent(prev => prev ? { ...prev, elevenLabsAgentId: "" } : null);
      showToast("Agent configuration reset.", "info");
    } catch (error: any) {
      showToast("Failed to reset agent", "error");
    } finally {
      setIsSaving(false);
      setSaveStatus("");
    }
  };

  const handleApplyTemplate = (template: AgentTemplate) => {
    if (!agent) return;
    setAgent({
      ...agent,
      instructions: template.instructions
    });
    setShowTemplatesModal(false);
    showToast(`Applied ${template.name} template`, "success");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-main tracking-tight">Agent Configuration</h1>
          <p className="text-muted mt-1">Customize your AI receptionist's personality and voice.</p>
        </div>
        <div className="flex items-center space-x-3">
          {saveStatus && (
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-sm font-medium ${saveStatus.includes("Error") ? "text-danger" : "text-brand-primary"}`}
            >
              {saveStatus}
            </motion.span>
          )}
          {showResetConfirm ? (
            <div className="flex items-center space-x-2 bg-danger/10 border border-danger/20 rounded-xl px-3 py-1.5">
              <span className="text-xs text-danger font-bold">Are you sure?</span>
              <button 
                onClick={handleResetAgent}
                disabled={isSaving}
                className="px-3 py-1 bg-danger text-white text-xs font-bold rounded-lg hover:bg-danger/90 transition-all"
              >
                Yes
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)}
                disabled={isSaving}
                className="px-3 py-1 bg-border-main text-muted text-xs font-bold rounded-lg hover:bg-bg-card-hover transition-all"
              >
                No
              </button>
            </div>
          ) : (
            <button 
              onClick={handleResetAgent}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-border-main text-muted hover:text-main hover:border-muted transition-all text-sm font-medium disabled:opacity-50"
            >
              Reset AI ID
            </button>
          )}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Agent"}</span>
          </button>
        </div>
      </div>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplatesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplatesModal(false)}
              className="absolute inset-0 bg-[var(--bg-main)]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-bg-main border border-border-main rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-border-main flex items-center justify-between bg-bg-main/50 backdrop-blur-md sticky top-0 z-10">
                <div>
                  <h2 className="text-2xl font-bold text-main">Agent Templates</h2>
                  <p className="text-muted text-sm mt-1">Select a pre-built personality for your AI agent.</p>
                </div>
                <button 
                  onClick={() => setShowTemplatesModal(false)}
                  className="p-2 hover:bg-bg-card-hover rounded-full text-muted hover:text-main transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AGENT_TEMPLATES.map((template) => (
                    <motion.div
                      key={template.id}
                      whileHover={{ y: -4 }}
                      className="group p-5 bg-bg-card border border-border-main rounded-2xl hover:border-brand-primary/50 hover:bg-bg-card-hover transition-all cursor-pointer flex flex-col h-full"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="px-2 py-1 bg-bg-card-hover rounded text-[10px] font-bold text-muted uppercase tracking-wider">
                          {template.category}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Check className="w-4 h-4 text-brand-primary" />
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-main mb-2 group-hover:text-brand-primary transition-colors">{template.name}</h3>
                      <p className="text-muted text-sm flex-1">{template.description}</p>
                      <div className="mt-4 pt-4 border-t border-border-main/50 flex items-center text-xs font-semibold text-brand-primary">
                        <span>Apply Template</span>
                        <ChevronRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-border-main bg-bg-main/50 text-center">
                <p className="text-xs text-muted">Templates will overwrite your current System Instructions.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        {/* Basic Info */}
        <div className="glass-card p-8 space-y-6 card-hover">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
              <User className="w-5 h-5 text-brand-primary" />
            </div>
            <h2 className="text-xl font-bold text-main tracking-tight">Basic Identity</h2>
          </div>
          <div className="h-px bg-border-main" />
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted ml-1">Agent Name</label>
              <div className="relative group">
                <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-brand-primary transition-colors" />
                <input 
                  type="text" 
                  value={agent.name}
                  onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                  placeholder="e.g. Sarah from Vico" 
                  className="input-field pl-12"
                />
              </div>
              <p className="text-[10px] text-muted uppercase tracking-widest font-bold ml-1">This is how the agent will introduce itself.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted ml-1">Primary Language</label>
              <div className="relative group">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted group-focus-within:text-brand-primary transition-colors" />
                <select 
                  value={agent.language || "en"}
                  onChange={(e) => setAgent({ ...agent, language: e.target.value })}
                  className="input-field pl-12 appearance-none cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted rotate-90 pointer-events-none" />
              </div>
              <p className="text-[10px] text-muted uppercase tracking-widest font-bold ml-1">The primary language your agent will speak and understand.</p>
            </div>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="glass-card p-8 space-y-6 card-hover border-blue-500/10 bg-blue-50/5 dark:bg-blue-900/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Mic className="w-5 h-5 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-main tracking-tight">Voice Persona</h2>
            </div>
            <div className="px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Premium Voices</span>
            </div>
          </div>
          <div className="h-px bg-blue-500/10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
            {availableVoices.map((voice) => (
              <div
                key={voice.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between group ${
                  agent.voice === voice.id 
                    ? "bg-blue-500/10 border-blue-500/40 text-main shadow-sm shadow-blue-500/10" 
                    : "bg-bg-card border-border-main text-muted hover:border-blue-500/30 hover:bg-blue-50/10 dark:hover:bg-blue-900/10"
                }`}
              >
                <div 
                  className="flex items-center space-x-3 cursor-pointer flex-grow"
                  onClick={() => setAgent({ ...agent, voice: voice.id })}
                >
                  <div className={`p-2 rounded-xl transition-colors ${
                    agent.voice === voice.id ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30" : "bg-bg-card-hover group-hover:bg-blue-500/10"
                  }`}>
                    <Volume2 className={`w-4 h-4 ${agent.voice === voice.id ? "text-white" : "text-blue-500"}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${agent.voice === voice.id ? "text-blue-600 dark:text-blue-400" : ""}`}>{voice.name}</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">{voice.gender}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePlayPreview(voice.id)}
                    className={`p-2 rounded-full transition-all ${
                      playingVoiceId === voice.id 
                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                        : "bg-bg-card-hover text-blue-500 hover:bg-blue-500 hover:text-white"
                    }`}
                  >
                    {playingVoiceId === voice.id ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                  <div 
                    onClick={() => setAgent({ 
                      ...agent, 
                      voice: voice.id, 
                      voiceProvider: voice.provider as any,
                      language: voice.lang || agent.language 
                    })}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
                      agent.voice === voice.id ? "border-blue-500 bg-blue-500" : "border-border-main group-hover:border-blue-500/50"
                    }`}
                  >
                    {agent.voice === voice.id && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Voice Settings */}
          <div className="mt-8 pt-6 border-t border-blue-500/10 space-y-6">
            <div className="flex items-center space-x-2 text-blue-500">
              <Zap className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Voice Fine-tuning</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Stability</label>
                  <span className="text-xs font-mono text-blue-500 font-bold">{Math.round(voiceSettings.stability * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={voiceSettings.stability}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, stability: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-blue-500/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-[9px] text-muted leading-relaxed">Lower values make the voice more expressive but can be unstable.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Clarity</label>
                  <span className="text-xs font-mono text-blue-500 font-bold">{Math.round(voiceSettings.similarity_boost * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01"
                  value={voiceSettings.similarity_boost}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, similarity_boost: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-blue-500/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-[9px] text-muted leading-relaxed">Higher values boost clarity and similarity to the original voice.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Speaking Speed</label>
                  <span className="text-xs font-mono text-blue-500 font-bold">{voiceSettings.speed}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1"
                  value={voiceSettings.speed}
                  onChange={(e) => setVoiceSettings({ ...voiceSettings, speed: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-blue-500/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-[9px] text-muted leading-relaxed">Adjust how fast the agent speaks. 1.0 is normal speed.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="glass-card p-8 space-y-6 card-hover">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
                <MessageSquare className="w-5 h-5 text-brand-primary" />
              </div>
              <h2 className="text-xl font-bold text-main tracking-tight">System Instructions</h2>
            </div>
            <button 
              onClick={() => setShowTemplatesModal(true)}
              className="px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white transition-all text-xs font-bold flex items-center space-x-2"
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Use Template</span>
            </button>
          </div>
          <div className="h-px bg-border-main" />
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted ml-1">Behavior & Persona</label>
              <textarea 
                rows={6}
                value={agent.instructions}
                onChange={(e) => setAgent({ ...agent, instructions: e.target.value })}
                placeholder="Tell the AI how to behave, what to say, and its personality..." 
                className="input-field resize-none focus:border-blue-500/50"
              />
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Define the agent's tone, style, and general behavior.</p>
                <span className="text-[10px] text-muted font-bold">{agent.instructions.length} characters</span>
              </div>
            </div>
          </div>
        </div>

        {/* Knowledge Base */}
        <div className="glass-card p-8 space-y-6 card-hover">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-brand-primary/10 rounded-lg border border-brand-primary/20">
              <BookOpen className="w-5 h-5 text-brand-primary" />
            </div>
            <h2 className="text-xl font-bold text-main tracking-tight">Business Knowledge Base</h2>
          </div>
          <div className="h-px bg-border-main" />
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted ml-1">Facts & Information</label>
              <textarea 
                rows={8}
                value={agent.knowledgeBase || ""}
                onChange={(e) => setAgent({ ...agent, knowledgeBase: e.target.value })}
                placeholder="Add your business hours, services, pricing, FAQs, and other specific information..." 
                className="input-field resize-none"
              />
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">This is the source of truth for the agent's answers.</p>
                <span className="text-[10px] text-muted font-bold">{(agent.knowledgeBase || "").length} characters</span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="p-8 bg-brand-primary/5 border border-brand-primary/10 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/20">
              <Play className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-main">Test your configuration</h3>
              <p className="text-muted text-sm">Open the voice interface to see your agent in action.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate(ROUTES.VOICE_INTERFACE)}
            className="btn-primary px-8 py-3 flex items-center space-x-2"
          >
            <span>Go to Voice Lab</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
