
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
    try {
      console.log(`InworldService: Requesting TTS via proxy for voice: ${voiceId}`);
      const response = await fetch("/api/inworld/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text, voiceId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Inworld Proxy Error:", errorText);
        throw new Error(`Inworld Proxy error! status: ${response.status} Details: ${errorText}`);
      }

      const result = await response.json();
      // Inworld API might return audio in 'audio' or 'audioContent' field depending on version
      const base64Audio = result.audio || result.audioContent || result.audio_content;
      
      return base64Audio;
    } catch (error) {
      console.error("Inworld TTS Service Error:", error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch("/api/inworld/tts", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: "test", voiceId: "Clive" })
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}

export const getInworldService = async () => {
  return new InworldService({ key: "", secret: "" });
};
