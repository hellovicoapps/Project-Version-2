import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useConversation } from "@elevenlabs/react";
import { getElevenLabsService } from "../services/elevenlabsService";

interface UseElevenLabsAgentProps {
  agentId: string;
  onTranscript?: (text: string, role: "user" | "ai", isFinal: boolean) => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: any) => void;
  onDataExtracted?: (data: any) => void;
  onCallEnd?: () => void;
  clientReferenceId?: string;
  dynamicVariables?: Record<string, any>;
}

export const useElevenLabsAgent = ({
  agentId,
  onTranscript,
  onStatusChange,
  onError,
  onDataExtracted,
  onCallEnd,
  clientReferenceId,
  dynamicVariables: defaultDynamicVariables
}: UseElevenLabsAgentProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micMuted, setMicMuted] = useState(false);

  const onTranscriptRef = useRef(onTranscript);
  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorRef = useRef(onError);
  const onDataExtractedRef = useRef(onDataExtracted);
  const onCallEndRef = useRef(onCallEnd);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onStatusChangeRef.current = onStatusChange;
    onErrorRef.current = onError;
    onDataExtractedRef.current = onDataExtracted;
    onCallEndRef.current = onCallEnd;
  }, [onTranscript, onStatusChange, onError, onDataExtracted, onCallEnd]);

  const handleConnect = useCallback(() => {
    console.log("ElevenLabs: Connected");
    setIsConnecting(false);
    onStatusChangeRef.current?.("Connected");
  }, []);

  const handleDisconnect = useCallback(() => {
    console.log("ElevenLabs: Disconnected");
    setIsConnecting(false);
    onStatusChangeRef.current?.("Disconnected");
  }, []);

  const handleMessage = useCallback((message: any) => {
    console.log("ElevenLabs Message:", message);
    if (message.source === "user" || message.source === "ai") {
      const isFinal = message.isFinal !== undefined ? message.isFinal : true;
      onTranscriptRef.current?.(message.message, message.source, isFinal);
    }
    
    if (message.type === "client_tool_call") {
      console.log("ElevenLabs Client Tool Call:", message);
      if (message.tool_name === "end_call") {
        console.log("AI requested to end the call");
        onCallEndRef.current?.();
      }
    }

    if (message.type === "data_extraction" || message.data) {
      onDataExtractedRef.current?.(message.data || message);
    }
  }, []);

  const handleError = useCallback((error: any) => {
    console.error("ElevenLabs Error:", error);
    setIsConnecting(false);
    onStatusChangeRef.current?.("Error");
    onErrorRef.current?.(error);
  }, []);

  const conversationOptions = useMemo(() => ({
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
    onError: handleError,
  }), [handleConnect, handleDisconnect, handleMessage, handleError]);

  const conversation = useConversation(conversationOptions);

  const startConnection = useCallback(async (dynamicVariables?: Record<string, any>) => {
    if (!agentId) {
      onError?.(new Error("No ElevenLabs Agent ID provided. Please save your agent first."));
      return;
    }

    setIsConnecting(true);
    onStatusChange?.("Connecting...");

    try {
      const elevenlabsService = await getElevenLabsService();
      if (!elevenlabsService) {
        throw new Error("ElevenLabs service not available");
      }

      // Get a signed URL for secure connection
      const signedUrl = await elevenlabsService.getSignedUrl(agentId);
      
      const sessionOptions: any = {
        signedUrl,
        dynamicVariables: { ...defaultDynamicVariables, ...dynamicVariables }
      };
      
      if (clientReferenceId) {
        sessionOptions.userId = clientReferenceId;
      }
      
      await (conversation as any).startSession(sessionOptions);
    } catch (error) {
      console.error("Failed to start ElevenLabs conversation:", error);
      setIsConnecting(false);
      onError?.(error);
    }
  }, [agentId, conversation, onStatusChange, onError]);

  const stopConnection = useCallback(async () => {
    try {
      if (conversation.status === "connected") {
        await conversation.endSession();
      }
    } catch (error) {
      console.error("Failed to end ElevenLabs conversation:", error);
    }
  }, [conversation]);

  const sendText = useCallback(async (text: string) => {
    try {
      if (conversation.status !== "connected") {
        console.warn("Cannot send text: ElevenLabs conversation is not connected");
        return;
      }
      if (typeof conversation.sendUserMessage === 'function') {
        await conversation.sendUserMessage(text);
      } else {
        console.warn("sendUserMessage is not supported by this version of ElevenLabs SDK");
      }
    } catch (error) {
      console.error("Failed to send text to ElevenLabs:", error);
    }
  }, [conversation]);

  // Update audio level for visualization
  useEffect(() => {
    // The SDK might not expose raw audio levels easily in the same way, 
    // but we can mock it or use a default if not available.
    // In a real app, we'd use the Web Audio API on the stream if the SDK provides it.
  }, []);

  return {
    startConnection,
    stopConnection,
    sendText,
    setVolume: (volume: number) => {
      if (conversation.status === "connected") {
        conversation.setVolume({ volume });
      }
    },
    setIsMuted: async (muted: boolean) => {
      setMicMuted(muted);
      if (typeof (conversation as any).setMicMuted === 'function') {
        try {
          await (conversation as any).setMicMuted(muted);
        } catch (e) {
          console.warn("Failed to set mic muted via SDK:", e);
        }
      }
    },
    isConnected: conversation.status === "connected",
    isConnecting,
    isAiSpeaking: conversation.isSpeaking,
    audioLevel: 0, // Placeholder
    micMuted: conversation.micMuted,
    conversationId: (conversation as any).conversationId || (conversation as any).id,
  };
};
