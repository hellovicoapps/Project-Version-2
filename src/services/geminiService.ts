import { GoogleGenAI, Modality, GenerateContentResponse, ThinkingLevel, Type } from "@google/genai";

export class GeminiService {
  async processTranscript(transcript: string) {
    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          contents: [{
            role: "user",
            parts: [{
              text: `Analyze the following call transcript between an AI Agent and a User.
              
              Transcript:
              ${transcript}
              
              Your goal is to extract key information and determine if a booking/appointment was made.
              
              Instructions:
              1. STATUS: 
                 - Set to "BOOKED" if the user explicitly agreed to a date/time for an appointment, or if the agent confirmed a booking was successful.
                 - Set to "INQUIRY" if the user was just asking questions, checking availability without committing, or if the call was purely informational.
                 - Set to "DROPPED" if the call ended before any conclusion or if the user hung up in frustration.
              
              2. BOOKING DETAILS:
                 - Extract the caller's name, phone number, and email if mentioned.
                 - Extract the date and time of the appointment. If they said "tomorrow at 3pm", try to resolve it relative to the current date (March 18, 2026).
                 - Extract the purpose of the appointment (e.g., "Dental checkup", "Haircut", "Sales demo").
              
              3. SUMMARY:
                 - Provide a 1-2 sentence summary of what happened during the call.
              
              If any information is missing, use null for those specific fields.`
            }]
          }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING, description: "A concise summary of the call." },
                status: { type: Type.STRING, enum: ["BOOKED", "INQUIRY", "DROPPED"], description: "The determined status of the call." },
                bookingDetails: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    email: { type: Type.STRING },
                    dateTime: { type: Type.STRING, description: "ISO 8601 format if possible, otherwise a descriptive string." },
                    purpose: { type: Type.STRING }
                  },
                  required: []
                }
              },
              required: ["summary", "status"]
            }
          }
        })
      });

      if (!response.ok) {
        let errorMessage = `Gemini Proxy Error (${response.status})`;
        try {
          const errorText = await response.text();
          console.error("Gemini Proxy Raw Error:", errorText);
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      const text = data.text;
      if (!text) throw new Error("No response from Gemini proxy");
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Proxy Process Transcript Error:", error);
      throw error;
    }
  }

  async generateResponse(prompt: string, history: any[] = [], systemInstruction?: string): Promise<string> {
    try {
      const contents = history.length > 0 ? history : [{ role: "user", parts: [{ text: prompt }] }];
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3-flash-preview",
          contents,
          config: {
            systemInstruction
          }
        })
      });

      if (!response.ok) {
        let errorMessage = `Gemini Proxy Error (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      return data.text || "No response generated";
    } catch (error) {
      console.error("Gemini Proxy Generation Error:", error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceName: string = "Kore"): Promise<string | undefined> {
    try {
      const response = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceName })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate speech via proxy (${response.status})`);
      }
      const data = await response.json();
      return data.audioData;
    } catch (error) {
      console.error("Gemini Proxy TTS Error:", error);
      throw error;
    }
  }

  // Live API is complex to proxy, we'll keep it as a placeholder to avoid build errors.
  async connectLive(callbacks: any, systemInstruction: string, voiceName: string = "Zephyr") {
    console.warn("Gemini Live API is not supported through the server proxy yet.");
    // Return a dummy session object to avoid build errors in useGeminiLive.ts
    return {
      sendRealtimeInput: (input: any) => {
        console.warn("Gemini Live: sendRealtimeInput called but not supported in proxy mode.");
      },
      close: () => {
        console.log("Gemini Live: close called.");
      }
    };
  }
}

export const getGeminiService = async () => {
  return new GeminiService();
};
