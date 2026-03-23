export interface ElevenLabsConfig {
  apiKey: string;
}

export class ElevenLabsService {
  private config: ElevenLabsConfig;

  constructor(config: ElevenLabsConfig) {
    this.config = config;
  }

  async generateSpeech(text: string, voiceId: string = "21m00Tcm4TlvDq8ikWAM"): Promise<string | undefined> {
    try {
      console.log(`ElevenLabsService: Requesting TTS via proxy for voice: ${voiceId}`);
      const response = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ElevenLabs Proxy Error:", errorText);
        throw new Error(`ElevenLabs Proxy error! status: ${response.status} Details: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);
      
      return base64Audio;
    } catch (error) {
      console.error("ElevenLabs TTS Service Error:", error);
      throw error;
    }
  }

  async getVoices(): Promise<any[]> {
    try {
      const response = await fetch("/api/elevenlabs/voices");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch voices (${response.status})`);
      }
      const data = await response.json();
      return data.voices || [];
    } catch (error: any) {
      console.error("ElevenLabs getVoices Error:", error);
      throw error;
    }
  }

  async createAgent(name: string, instructions: string, voiceId: string, voiceSettings?: any): Promise<string> {
    const response = await fetch("/api/elevenlabs/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        conversation_config: {
          agent: {
            prompt: { prompt: instructions },
            first_message: `Hello! I'm ${name}. How can I help you today?`,
            dynamic_variables: {
              dynamic_variable_placeholders: {
                current_time: "current_time",
                user_id: "user_id",
                business_id: "business_id",
                business_name: "business_name",
                call_source: "call_source"
              }
            },
            analysis_config: {
              transcript_summary_config: { enabled: true }
            },
            data_collection: {
              fields: [
                {
                  name: "name",
                  type: "string",
                  description: "The caller's full name"
                },
                {
                  name: "email",
                  type: "string",
                  description: "The caller's email address"
                },
                {
                  name: "phone",
                  type: "string",
                  description: "The caller's phone number"
                },
                {
                  name: "bookingTime",
                  type: "string",
                  description: "The requested date and time for the appointment. MUST be in ISO 8601 format WITH the correct timezone offset (e.g., 2026-03-23T15:00:00+08:00)"
                },
                {
                  name: "bookingPurpose",
                  type: "string",
                  description: "The reason or service requested for the appointment"
                }
              ]
            }
          },
          tts: { 
            voice_id: voiceId,
            model_id: "eleven_turbo_v2",
            voice_settings: voiceSettings 
          }
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to create agent: ${err}`);
    }

    const data = await response.json();
    return data.agent_id;
  }

  async updateAgent(agentId: string, name: string, instructions: string, voiceId: string, voiceSettings?: any): Promise<void> {
    const response = await fetch(`/api/elevenlabs/agents/${agentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        conversation_config: {
          agent: {
            prompt: { prompt: instructions },
            first_message: `Hello! I'm ${name}. How can I help you today?`,
            dynamic_variables: {
              dynamic_variable_placeholders: {
                current_time: "current_time",
                user_id: "user_id",
                business_id: "business_id",
                business_name: "business_name",
                call_source: "call_source"
              }
            },
            analysis_config: {
              transcript_summary_config: { enabled: true }
            },
            data_collection: {
              fields: [
                {
                  name: "name",
                  type: "string",
                  description: "The caller's full name"
                },
                {
                  name: "email",
                  type: "string",
                  description: "The caller's email address"
                },
                {
                  name: "phone",
                  type: "string",
                  description: "The caller's phone number"
                },
                {
                  name: "bookingTime",
                  type: "string",
                  description: "The requested date and time for the appointment. MUST be in ISO 8601 format WITH the correct timezone offset (e.g., 2026-03-23T15:00:00+08:00)"
                },
                {
                  name: "bookingPurpose",
                  type: "string",
                  description: "The reason or service requested for the appointment"
                }
              ]
            }
          },
          tts: { 
            voice_id: voiceId,
            model_id: "eleven_turbo_v2",
            voice_settings: voiceSettings 
          }
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to update agent: ${err}`);
    }
  }

  async getSignedUrl(agentId: string): Promise<string> {
    const response = await fetch(`/api/elevenlabs/signed-url?agent_id=${agentId}`);
    if (!response.ok) throw new Error("Failed to get signed URL");
    const data = await response.json();
    return data.signed_url;
  }

  async getConversationDetails(conversationId: string): Promise<any> {
    const response = await fetch(`/api/elevenlabs/conversations/${conversationId}`);
    if (!response.ok) throw new Error("Failed to fetch conversation details");
    return await response.json();
  }
}

export const getElevenLabsService = async () => {
  return new ElevenLabsService({ apiKey: "" });
};
