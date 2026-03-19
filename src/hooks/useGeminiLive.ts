
import { useState, useEffect, useRef, useCallback } from "react";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { getGeminiService } from "../services/geminiService";
import { getElevenLabsService } from "../services/elevenlabsService";

interface UseGeminiLiveProps {
  onTranscript: (text: string, role: "user" | "model") => void;
  onError: (error: any) => void;
  onStatusChange: (status: string) => void;
  instructions: string;
  voiceName?: string;
  voiceProvider?: "GEMINI" | "ELEVENLABS";
  isSpeakerOn?: boolean;
}

export const useGeminiLive = ({
  onTranscript,
  onError,
  onStatusChange,
  instructions,
  voiceName = "21m00Tcm4TlvDq8ikWAM",
  voiceProvider = "ELEVENLABS",
  isSpeakerOn = true
}: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  // Sanitize voice name to ensure it's a valid Gemini voice if provider is GEMINI
  const validGeminiVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
  const isElevenLabsId = (id: string) => /^[a-zA-Z0-9]{20}$/.test(id);
  const sanitizedVoiceName = (voiceProvider === "GEMINI" && voiceName && validGeminiVoices.includes(voiceName)) 
    ? voiceName 
    : (voiceProvider === "GEMINI" ? "Zephyr" : (voiceProvider === "ELEVENLABS" && (!voiceName || !isElevenLabsId(voiceName)) ? "21m00Tcm4TlvDq8ikWAM" : voiceName));
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<AudioWorkletNode | null>(null);
  const sessionRef = useRef<any>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const audioTaskQueueRef = useRef<Promise<void>>(Promise.resolve());
  const modelTextBufferRef = useRef("");
  const allTextReceivedThisTurnRef = useRef("");
  const elevenlabsServiceRef = useRef<any>(null);
  const lastProcessedTextRef = useRef("");
  const flushLockRef = useRef(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);
    if (isAiSpeaking) {
      requestAnimationFrame(updateAudioLevel);
    } else {
      setAudioLevel(0);
    }
  }, [isAiSpeaking]);

  useEffect(() => {
    if (isAiSpeaking) {
      updateAudioLevel();
    }
  }, [isAiSpeaking, updateAudioLevel]);

  const playEncodedAudio = useCallback(async (base64Data: string) => {
    if (!audioContextRef.current) {
      console.error("Gemini Live: Cannot play audio - AudioContext is null");
      return;
    }

    if (audioContextRef.current.state === "suspended") {
      console.log("Gemini Live: Resuming suspended AudioContext");
      await audioContextRef.current.resume();
    }

    // Use a task queue to ensure sequential scheduling even if decoding is async
    audioTaskQueueRef.current = audioTaskQueueRef.current.then(async () => {
      console.log(`Gemini Live: playEncodedAudio processing chunk (${base64Data.length} chars)`);
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      try {
        // Use a copy of the buffer to be safe
        const bufferCopy = bytes.buffer.slice(0, bytes.length);
        const audioBuffer = await audioContextRef.current!.decodeAudioData(bufferCopy);
        
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        
        source.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
          if (activeSourcesRef.current.length === 0) {
            setIsAiSpeaking(false);
          }
        };
        activeSourcesRef.current.push(source);
        setIsAiSpeaking(true);

        if (gainNodeRef.current) {
          source.connect(gainNodeRef.current);
        } else {
          source.connect(audioContextRef.current!.destination);
        }

        const startTime = Math.max(audioContextRef.current!.currentTime, nextStartTimeRef.current);
        source.start(startTime);
        nextStartTimeRef.current = startTime + audioBuffer.duration;
        console.log(`Gemini Live: Scheduled audio at ${startTime.toFixed(2)}s (duration: ${audioBuffer.duration.toFixed(2)}s)`);
      } catch (e) {
        console.error("Failed to decode encoded audio", e);
      }
    });
    
    return audioTaskQueueRef.current;
  }, []);

  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!audioContextRef.current) {
      console.error("Gemini Live: Cannot play audio chunk - AudioContext is null");
      return;
    }

    if (voiceProvider === "ELEVENLABS") {
      console.log("Gemini Live: Explicitly ignoring native audio chunk in playAudioChunk");
      return;
    }

    // Ensure context is running
    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    // Use the same task queue for native chunks if they are enabled
    audioTaskQueueRef.current = audioTaskQueueRef.current.then(async () => {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcmLength = Math.floor(bytes.byteLength / 2);
      if (pcmLength === 0) return;
      
      const pcmData = new Int16Array(bytes.buffer, 0, pcmLength);
      const floatData = new Float32Array(pcmLength);
      for (let i = 0; i < pcmLength; i++) {
        floatData[i] = pcmData[i] / 32768.0;
      }

      const audioBuffer = audioContextRef.current!.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      const source = audioContextRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      
      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setIsAiSpeaking(false);
        }
      };
      activeSourcesRef.current.push(source);
      setIsAiSpeaking(true);

      if (gainNodeRef.current) {
        source.connect(gainNodeRef.current);
      } else {
        source.connect(audioContextRef.current!.destination);
      }

      const startTime = Math.max(audioContextRef.current!.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      console.log(`Gemini Live: Scheduled native audio at ${startTime.toFixed(2)}s`);
    });

    return audioTaskQueueRef.current;
  }, [voiceProvider]);

  const flushTextBuffer = useCallback(async (force = false) => {
    if (voiceProvider !== "ELEVENLABS" || !elevenlabsServiceRef.current) return;
    
    // Simple lock to prevent concurrent flushes from interfering
    if (flushLockRef.current) {
      // If already flushing, we'll wait or let the next trigger handle it
      // For "force" (turn complete), we should probably wait or retry
      if (force) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return flushTextBuffer(force);
      }
      return;
    }

    const text = modelTextBufferRef.current.trim();
    if (!text) return;

    // Only flush if forced (turn complete) or if we have a complete sentence/enough text
    if (!force && !text.match(/[.!?]\s*$/) && text.length < 60) return;

    flushLockRef.current = true;
    const textToPlay = modelTextBufferRef.current;
    modelTextBufferRef.current = "";

    console.log(`Gemini Live: Requesting ElevenLabs TTS for voice: ${sanitizedVoiceName}, text: "${textToPlay.substring(0, 30)}..."`);
    
    try {
      const base64 = await elevenlabsServiceRef.current.generateSpeech(textToPlay, sanitizedVoiceName);
      if (base64) {
        console.log(`Gemini Live: Received ElevenLabs audio (${base64.length} chars)`);
        await playEncodedAudio(base64);
      } else {
        console.warn("Gemini Live: ElevenLabs returned empty audio");
      }
    } catch (err: any) {
      console.error("Gemini Live: ElevenLabs TTS Error:", err);
      onStatusChange(`TTS Error: ${err.message || "Unknown"}`);
    } finally {
      flushLockRef.current = false;
    }
  }, [voiceProvider, sanitizedVoiceName, playEncodedAudio, onStatusChange]);

  const cleanup = useCallback(() => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
      source.disconnect();
    });
    activeSourcesRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    onStatusChange("Disconnected");
  }, [onStatusChange]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isSpeakerOn ? 1 : 0;
    }
  }, [isSpeakerOn]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startConnection = useCallback(async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    onStatusChange("Connecting...");
    nextStartTimeRef.current = 0;
    modelTextBufferRef.current = "";

    try {
      const geminiService = await getGeminiService();
      if (!geminiService) {
        throw new Error("Gemini API Key is missing. Please set GEMINI_API_KEY in the Secrets panel (Settings > Secrets).");
      }

      if (voiceProvider === "ELEVENLABS") {
        const elevenlabsService = await getElevenLabsService();
        if (elevenlabsService) {
          elevenlabsServiceRef.current = elevenlabsService;
        } else {
          console.warn("ElevenLabs Service not available, falling back to Gemini voice");
        }
      }

      // Force 16kHz sample rate for the AudioContext to match Gemini's input requirements
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        console.log(`Gemini Live: AudioContext created with sampleRate: ${audioContextRef.current.sampleRate}`);
      } catch (e) {
        console.warn("Could not create AudioContext with 16kHz, falling back to default", e);
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log(`Gemini Live: AudioContext created (fallback) with sampleRate: ${audioContextRef.current.sampleRate}`);
      }
      
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
      
      // Create gain node for volume control
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = isSpeakerOn ? 1 : 0;
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Gemini Live: Microphone stream acquired");
      
      const session = await geminiService.connectLive({
        onopen: () => {
          console.log("Gemini Live: Session opened");
          setIsConnected(true);
          setIsConnecting(false);
          onStatusChange("Live");
          
          // Start streaming audio from microphone
          const source = audioContextRef.current!.createMediaStreamSource(streamRef.current!);
          
          // Use AudioWorklet instead of deprecated ScriptProcessorNode
          const workletCode = `
            class AudioProcessor extends AudioWorkletProcessor {
              constructor() {
                super();
                this.bufferSize = 4096;
                this.buffer = new Float32Array(this.bufferSize);
                this.offset = 0;
              }
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input.length > 0) {
                  const inputData = input[0];
                  for (let i = 0; i < inputData.length; i++) {
                    this.buffer[this.offset++] = inputData[i];
                    if (this.offset >= this.bufferSize) {
                      this.port.postMessage(this.buffer);
                      this.buffer = new Float32Array(this.bufferSize);
                      this.offset = 0;
                    }
                  }
                }
                return true;
              }
            }
            registerProcessor('audio-processor', AudioProcessor);
          `;
          
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          
          audioContextRef.current!.audioWorklet.addModule(url).then(() => {
            if (!sessionRef.current || !audioContextRef.current) return;
            
            const processorNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
            
            processorNode.port.onmessage = (e) => {
              if (!sessionRef.current) return;
              
              const inputData = e.data;
              // Convert to 16-bit PCM
              const pcmData = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              
              // Convert to base64
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            };
            
            source.connect(processorNode);
            processorNodeRef.current = processorNode;
            URL.revokeObjectURL(url);
          }).catch(err => {
            console.error("Gemini Live: Failed to load AudioWorklet", err);
            // Fallback to ScriptProcessor if Worklet fails (optional, but let's try to be robust)
            try {
              const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
              processor.onaudioprocess = (e) => {
                if (!sessionRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }
                const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              };
              source.connect(processor);
              (processorNodeRef.current as any) = processor;
            } catch (e2) {
              console.error("Gemini Live: Fallback ScriptProcessor also failed", e2);
            }
          });
        },
        onmessage: async (message: LiveServerMessage) => {
          console.log("Gemini Live: Message received", JSON.stringify(message).substring(0, 200) + "...");
          
          if (message.serverContent?.modelTurn?.parts) {
            console.log(`Gemini Live: Received ${message.serverContent.modelTurn.parts.length} parts`);
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                console.log(`Gemini Live: Received native audio chunk (${part.inlineData.data.length} chars)`);
                if (voiceProvider === "GEMINI") {
                  console.log("Gemini Live: Playing native Gemini audio");
                  await playAudioChunk(part.inlineData.data);
                } else {
                  console.log("Gemini Live: Ignoring native audio chunk (using ElevenLabs)");
                  (part as any)._nativeAudio = part.inlineData.data;
                }
              }
              if (part.text) {
                console.log(`Gemini Live: Received text part: "${part.text.substring(0, 30)}..."`);
                
                // Avoid processing the same text twice if it comes from both parts and transcription
                if (part.text === lastProcessedTextRef.current) {
                  console.log("Gemini Live: Skipping duplicate text from parts");
                  continue;
                }
                lastProcessedTextRef.current = part.text;
                
                onTranscript(part.text, "model");
                
                if (voiceProvider === "ELEVENLABS") {
                  // Handle accumulated vs incremental text
                  let incremental = part.text;
                  if (allTextReceivedThisTurnRef.current && part.text.startsWith(allTextReceivedThisTurnRef.current)) {
                    incremental = part.text.substring(allTextReceivedThisTurnRef.current.length);
                  }
                  
                  if (incremental) {
                    modelTextBufferRef.current += incremental;
                    allTextReceivedThisTurnRef.current = part.text;
                    flushTextBuffer();
                  }
                }
              }
            }
          }

          // Handle model transcription (if enabled in config and not in parts)
          if ((message.serverContent as any)?.outputTranscription) {
            const trans = (message.serverContent as any).outputTranscription;
            const text = trans.text || "";
            const finished = trans.finished;
            
            if (text) {
              // Avoid processing the same text twice
              if (text === lastProcessedTextRef.current) {
                console.log("Gemini Live: Skipping duplicate text from transcription");
              } else {
                console.log("Gemini Live: Model transcription from outputTranscription:", text, "finished:", finished);
                lastProcessedTextRef.current = text;
                onTranscript(text, "model");
                
                if (voiceProvider === "ELEVENLABS") {
                  // Handle accumulated vs incremental text
                  let incremental = text;
                  if (allTextReceivedThisTurnRef.current && text.startsWith(allTextReceivedThisTurnRef.current)) {
                    incremental = text.substring(allTextReceivedThisTurnRef.current.length);
                  }
                  
                  if (incremental) {
                    modelTextBufferRef.current += incremental;
                    allTextReceivedThisTurnRef.current = text;
                    flushTextBuffer(finished);
                  }
                }
              }
            }
          }
          
          // If turn is complete but we still have text in the buffer, flush it
          if (message.serverContent?.turnComplete && voiceProvider === "ELEVENLABS") {
            flushTextBuffer(true);
            allTextReceivedThisTurnRef.current = "";
          }

          // Handle user transcription (if enabled in config)
          if (message.serverContent?.inputTranscription?.text) {
            console.log("Gemini Live: User transcription:", message.serverContent.inputTranscription.text);
            onTranscript(message.serverContent.inputTranscription.text, "user");
          }

          // Handle interruption
          if (message.serverContent?.interrupted) {
            console.log("Gemini Live: Interrupted");
            // Stop current playback
            activeSourcesRef.current.forEach(source => {
              try { source.stop(); } catch (e) {}
              source.disconnect();
            });
            activeSourcesRef.current = [];
            nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
            audioTaskQueueRef.current = Promise.resolve();
            modelTextBufferRef.current = "";
            allTextReceivedThisTurnRef.current = "";
            lastProcessedTextRef.current = "";
            flushLockRef.current = false;
          }
        },
        onerror: (err: any) => {
          console.error("Gemini Live Error:", err);
          onError(err);
          cleanup();
        },
        onclose: () => {
          cleanup();
        },
      }, instructions, sanitizedVoiceName);

      sessionRef.current = session;
    } catch (error) {
      console.error("Failed to connect to Gemini Live:", error);
      setIsConnecting(false);
      onError(error);
      cleanup();
    }
  }, [instructions, voiceName, voiceProvider, onTranscript, onError, onStatusChange, cleanup, playAudioChunk, isConnected, isConnecting]);

  const stopConnection = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const resetAudio = useCallback(async () => {
    console.log("Gemini Live: Manually resetting AudioContext");
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (e) {}
    }
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = isSpeakerOn ? 1 : 0;
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      
      nextStartTimeRef.current = 0;
      console.log("Gemini Live: AudioContext reset successfully");
    } catch (e) {
      console.error("Gemini Live: Failed to reset AudioContext", e);
    }
  }, [isSpeakerOn]);

  return {
    startConnection,
    stopConnection,
    isConnected,
    isConnecting,
    isAiSpeaking,
    audioLevel,
    resetAudio
  };
};
