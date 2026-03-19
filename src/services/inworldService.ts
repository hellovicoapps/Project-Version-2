
export interface InworldConfig {
  key: string;
  secret: string;
}

export class InworldService {
  private config: InworldConfig;

  constructor(config: InworldConfig) {
    this.config = config;
  }

  private getAuthHeader(): string {
    return `Basic ${btoa(`${this.config.key}:${this.config.secret}`)}`;
  }

  async generateSpeech(text: string, voiceId: string = "Clive"): Promise<string | undefined> {
    if (!this.config.key || !this.config.secret) {
      throw new Error("Inworld credentials missing. Please set INWORLD_KEY and INWORLD_SECRET in Settings > Secrets.");
    }

    try {
      // Standard Inworld Studio TTS API v1
      const url = `https://api.inworld.ai/tts/v1/voice`;
      
      const options = {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text,
          voiceId: voiceId,
          modelId: "inworld-tts-1",
          audioConfig: {
            audioEncoding: "AUDIO_ENCODING_MP3",
            sampleRateHertz: 22050
          }
        }),
      };

      console.log(`InworldService: Requesting TTS for voice: ${voiceId}`);
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorData = {};
        try {
          errorData = await response.json();
        } catch (e) {
          try {
            const text = await response.text();
            errorData = { message: text };
          } catch (e2) {}
        }
        console.error("Inworld TTS Error Details:", errorData);
        throw new Error(`Inworld TTS error! status: ${response.status} URL: ${url} Details: ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      // Inworld API might return audio in 'audio' or 'audioContent' field depending on version
      const base64Audio = result.audio || result.audioContent;
      
      if (!base64Audio) {
        console.warn("Inworld Service: No audio content in response", result);
        // If we got a successful response but no audio, maybe the format is different
        if (result.audio_content) return result.audio_content;
      }
      
      return base64Audio;
    } catch (error) {
      console.error("Inworld TTS Service Error:", error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Try to hit the TTS endpoint to verify credentials
      const url = "https://api.inworld.ai/tts/v1/voice";
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: "test", voiceId: "Clive" })
      });
      return response.ok || response.status === 400; // 400 means auth succeeded but payload might be invalid
    } catch (e) {
      return false;
    }
  }
}

let cachedInworldConfig: InworldConfig | null = null;

export const getInworldService = async () => {
  if (cachedInworldConfig) return new InworldService(cachedInworldConfig);

  try {
    const r = await fetch(`/api/config?t=${Date.now()}`);
    if (!r.ok) return null;
    
    const config = await r.json();
    if (config.INWORLD_KEY && config.INWORLD_SECRET) {
      cachedInworldConfig = {
        key: config.INWORLD_KEY,
        secret: config.INWORLD_SECRET
      };
      return new InworldService(cachedInworldConfig);
    }
  } catch (e) {
    console.error("Failed to fetch Inworld config:", e);
  }
  return null;
};
