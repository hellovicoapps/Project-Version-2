import { GoogleGenAI, Modality, GenerateContentResponse, ThinkingLevel, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    this.ai = new GoogleGenAI({ apiKey });
  }

  async processTranscript(transcript: string, timezone: string = "UTC", currentDate: string = new Date().toISOString()) {
    try {
      // If API key is missing on client, use server proxy
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
        console.log("GeminiService: Using server proxy for transcript processing");
        const response = await fetch("/api/gemini/process-transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, timezone })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Server proxy failed");
        }
        return await response.json();
      }

      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [{
            text: `Analyze the following call transcript between an AI Agent and a User.
              
              Current Date/Time: ${currentDate}
              Business Timezone: ${timezone}
              
              Transcript:
              ${transcript}
              
              Your goal is to extract key information and determine if a booking/appointment was made.
              
              Instructions:
              1. STATUS: 
                 - Set to "BOOKED" if the user explicitly agreed to a date/time for an appointment, or if the agent confirmed a booking was successful.
                 - Set to "INQUIRY" if the user was just asking questions, checking availability without committing, or if the call was purely informational.
                 - Set to "COMPLAINT" if the user expressed dissatisfaction, reported an issue, or made a formal complaint.
                 - Set to "FOLLOW_UP" if the user is calling back about a previous interaction or if the agent promised a follow-up.
                 - Set to "DROPPED" if the call ended before any conclusion or if the user hung up in frustration.
              
              2. BOOKING DETAILS:
                 - Extract the caller's name, phone number, and email if mentioned.
                 - Extract the date and time of the appointment. 
                 - IMPORTANT: Resolve relative times (like "tomorrow at 3pm") based on the Current Date/Time provided above and the Business Timezone.
                 - Return the dateTime in ISO 8601 format including the offset for the Business Timezone if possible.
                 - Extract the purpose of the appointment (e.g., "Dental checkup", "Haircut", "Sales demo").
              
              3. SUMMARY:
                 - Provide a 1-2 sentence summary of what happened during the call.
              
              If any information is missing, omit those specific fields from the JSON object instead of using null. Do NOT use the string "null".`
          }]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: "A concise summary of the call." },
              status: { type: Type.STRING, enum: ["BOOKED", "INQUIRY", "COMPLAINT", "FOLLOW_UP", "DROPPED"], description: "The determined status of the call." },
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
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Process Transcript Error:", error);
      throw error;
    }
  }

  async generateResponse(prompt: string, history: any[] = [], systemInstruction?: string): Promise<string> {
    try {
      const contents = history.length > 0 ? history : [{ role: "user", parts: [{ text: prompt }] }];
      const response = await this.ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction
        }
      });

      return response.text || "No response generated";
    } catch (error) {
      console.error("Gemini Generation Error:", error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceName: string = "Kore"): Promise<string | undefined> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
            },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return audioData;
    } catch (error) {
      console.error("Gemini TTS Error:", error);
      throw error;
    }
  }

  async connectLive(callbacks: any, systemInstruction: string, voiceName: string = "Zephyr") {
    return this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
        systemInstruction,
      },
    });
  }
}

export const getGeminiService = async () => {
  return new GeminiService();
};
