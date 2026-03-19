import { useState, useCallback, useRef, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
import { getElevenLabsService } from "../services/elevenlabsService";

interface UseElevenLabsAgentProps {
  agentId: string;
  onTranscript?: (text: string, role: "user" | "ai") => void;
  onStatusChange?: (status: string) => void;
  onError?: (error: any) => void;
}

export const useElevenLabsAgent = ({
  agentId,
  onTranscript,
  onStatusChange,
  onError
}: UseElevenLabsAgentProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [micMuted, setMicMuted] = useState(false);

  const conversation = useConversation({
    micMuted,
    onConnect: () => {
      console.log("ElevenLabs: Connected");
      setIsConnecting(false);
      onStatusChange?.("Connected");
    },
    onDisconnect: () => {
      console.log("ElevenLabs: Disconnected");
      setIsConnecting(false);
      onStatusChange?.("Disconnected");
    },
    onMessage: (message) => {
      console.log("ElevenLabs Message:", message);
      if (message.source === "user" || message.source === "ai") {
        onTranscript?.(message.message, message.source);
      }
    },
    onError: (error) => {
      console.error("ElevenLabs Error:", error);
      setIsConnecting(false);
      onStatusChange?.("Error");
      onError?.(error);
    },
  });

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
      
      await conversation.startSession({
        signedUrl,
        dynamicVariables
      });
    } catch (error) {
      console.error("Failed to start ElevenLabs conversation:", error);
      setIsConnecting(false);
      onError?.(error);
    }
  }, [agentId, conversation, onStatusChange, onError]);

  const stopConnection = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (error) {
      console.error("Failed to end ElevenLabs conversation:", error);
    }
  }, [conversation]);

  const sendText = useCallback(async (text: string) => {
    try {
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
    setVolume: (volume: number) => conversation.setVolume({ volume }),
    setIsMuted: setMicMuted,
    isConnected: conversation.status === "connected",
    isConnecting,
    isAiSpeaking: conversation.isSpeaking,
    audioLevel: 0, // Placeholder
    micMuted: conversation.micMuted,
    conversationId: (conversation as any).conversationId || (conversation as any).id,
  };
};
