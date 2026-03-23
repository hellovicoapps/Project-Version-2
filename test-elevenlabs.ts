import fetch from "node-fetch";

async function test() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.log("No API key");
    return;
  }
  
  const body = {
    name: "Test Agent",
    conversation_config: {
      agent: {
        prompt: { prompt: "You are a test agent." },
        first_message: "Hello!",
        dynamic_variables: {
          dynamic_variable_placeholders: {
            current_time: "current_time"
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
            }
          ]
        },
        tools: [
          {
            type: "client",
            name: "end_call",
            description: "Ends the current call.",
            parameters: {
              type: "object",
              properties: {}
            }
          }
        ]
      },
      tts: { 
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        model_id: "eleven_turbo_v2_5"
      }
    },
    data_collection: {
      fields: [
        {
          name: "name",
          type: "string",
          description: "The caller's full name"
        }
      ]
    },
    analysis_config: {
      transcript_summary_config: { enabled: true }
    }
  };

  const r = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: { 
      "xi-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  console.log("Status:", r.status);
  console.log("Response:", await r.text());
}

test();
