import { GoogleGenAI, Modality, GenerateContentResponse, ThinkingLevel, Type } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API Key is required");
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async processTranscript(transcript: string) {
    return this.withRetry(async () => {
      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{
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
                    name: { type: Type.STRING, nullable: true },
                    phone: { type: Type.STRING, nullable: true },
                    email: { type: Type.STRING, nullable: true },
                    dateTime: { type: Type.STRING, description: "ISO 8601 format if possible, otherwise a descriptive string.", nullable: true },
                    purpose: { type: Type.STRING, nullable: true }
                  }
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
    });
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = JSON.stringify(error);
      const isRetryable = error?.message?.includes("503") || 
                         error?.message?.includes("high demand") ||
                         error?.message?.includes("UNAVAILABLE") ||
                         errorStr.includes("503") ||
                         errorStr.includes("UNAVAILABLE") ||
                         error?.status === 503 ||
                         error?.code === 503;

      if (isRetryable && retries > 0) {
        console.warn(`Gemini Service: High demand/Unavailable. Retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async generateResponse(prompt: string, history: any[] = [], systemInstruction?: string): Promise<string> {
    return this.withRetry(async () => {
      try {
        const contents = history.length > 0 ? history : [{ role: "user", parts: [{ text: prompt }] }];
        
        // If history is provided, we assume the last message is the prompt and it's already in history
        // But generateContent expects contents to be the full history
        
        const response: GenerateContentResponse = await this.ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
          },
        });
        return response.text || "No response generated";
      } catch (error) {
        console.error("Gemini Generation Error:", error);
        throw error;
      }
    });
  }

  async *generateResponseStream(prompt: string, systemInstruction?: string) {
    const startStream = async () => {
      return await this.ai.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        },
      });
    };

    try {
      const result = await this.withRetry(startStream);
      for await (const chunk of result) {
        yield chunk.text;
      }
    } catch (error) {
      console.error("Gemini Streaming Error:", error);
      throw error;
    }
  }

  async generateSpeech(text: string, voiceName: string = "Kore"): Promise<string | undefined> {
    const validVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    const sanitizedVoice = validVoices.includes(voiceName) ? voiceName : "Kore";

    return this.withRetry(async () => {
      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: sanitizedVoice },
              },
            },
          },
        });

        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      } catch (error) {
        console.error("Gemini TTS Error:", error);
        throw error;
      }
    });
  }

  async connectLive(callbacks: any, systemInstruction: string, voiceName: string = "Zephyr") {
    const validVoices = ["Puck", "Charon", "Kore", "Fenrir", "Zephyr"];
    const sanitizedVoice = validVoices.includes(voiceName) ? voiceName : "Zephyr";

    return this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-preview-09-2025",
      callbacks,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: sanitizedVoice } },
        },
        systemInstruction,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
      },
    });
  }
}

let cachedApiKey: string | null = null;

export const fetchConfig = async () => {
  try {
    console.log("GeminiService: Fetching config from /api/config...");
    const r = await fetch(`/api/config?t=${Date.now()}`);
    if (!r.ok) {
      console.error("GeminiService: /api/config fetch failed with status:", r.status);
      return null;
    }
    const config = await r.json();
    console.log("GeminiService: Received config keys:", Object.keys(config));
    console.log("GeminiService: GEMINI_API_KEY present in config:", !!config.GEMINI_API_KEY);
    console.log("GeminiService: API_KEY present in config:", !!config.API_KEY);
    console.log("GeminiService: VITE_GEMINI_API_KEY present in config:", !!config.VITE_GEMINI_API_KEY);
    
    const key = config.GEMINI_API_KEY || config.API_KEY || config.VITE_GEMINI_API_KEY || config.GOOGLE_API_KEY;
    if (key && !key.includes("TODO_") && key !== "MY_GEMINI_API_KEY" && key !== "undefined" && key !== "null" && key.length > 5) {
      console.log("GeminiService: Valid key found in server config.");
      cachedApiKey = key;
      return key;
    }
    
    console.log("GeminiService: No valid key in server config, will check client environment.");
    return null;
  } catch (e) {
    console.error("GeminiService: Failed to fetch config from server:", e);
  }
  return null;
};

export const getGeminiService = async () => {
  if (cachedApiKey) return new GeminiService(cachedApiKey);

  // Try to fetch from server first
  const serverKey = await fetchConfig();
  if (serverKey) return new GeminiService(serverKey);

  const getVal = (name: string) => {
    let val: string | undefined;
    
    if (name === "GEMINI_API_KEY") {
      try { val = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY; } catch (e) {}
      if (val) console.log(`GeminiService: Found ${name} in process.env (Vite define)`);
    }
    if (!val && name === "API_KEY") {
      try { val = process.env.API_KEY; } catch (e) {}
      if (val) console.log(`GeminiService: Found ${name} in process.env (Vite define)`);
    }

    if (!val) {
      const win = window as any;
      const env = (win.process?.env) || {};
      val = env[name] || win[name] || (import.meta as any).env?.[`VITE_${name}`] || (import.meta as any).env?.[name];
      if (val) console.log(`GeminiService: Found ${name} in window/import.meta.env`);
    }
    
    return val;
  };
  
  const envKey = getVal("GEMINI_API_KEY");
  const platformKey = getVal("API_KEY");
  const googleKey = getVal("GOOGLE_API_KEY");
  const viteKey = getVal("VITE_GEMINI_API_KEY");
  
  console.log("GeminiService: Discovery - envKey:", !!envKey, "platformKey:", !!platformKey, "googleKey:", !!googleKey, "viteKey:", !!viteKey);

  const apiKey = envKey || platformKey || googleKey || viteKey;
  
  if (!apiKey || apiKey.includes("TODO_") || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined" || apiKey === "null" || apiKey.length < 5) {
    console.warn(`Gemini API Key missing or invalid. Value: ${apiKey ? (apiKey.substring(0, 4) + "...") : "missing"}`);
    return null;
  }
  
  cachedApiKey = apiKey;
  console.log("GeminiService: Initializing with key source:", envKey ? "GEMINI_API_KEY" : "API_KEY");
  return new GeminiService(apiKey);
};
