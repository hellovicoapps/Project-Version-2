import 'dotenv/config';

async function testInworld() {
  const key = process.env.INWORLD_KEY;
  const secret = process.env.INWORLD_SECRET;
  
  if (!key || !secret) {
    console.log("Missing credentials");
    return;
  }
  
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json'
  };
  
  const endpoints = [
    "https://api.inworld.ai/v1/voices",
    "https://api.inworld.ai/studio/v1/voices",
    "https://api.inworld.ai/v1/workspaces/default/voices",
    "https://api.inworld.ai/studio/v1/workspaces/default/voices"
  ];
  
  for (const url of endpoints) {
    console.log(`Testing ${url}`);
    try {
      const res = await fetch(url, { headers });
      console.log(`Status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        console.log("Success! Data keys:", Object.keys(data));
        if (data.voices) {
          console.log("Voices:", data.voices.slice(0, 2).map((v: any) => v.name));
        }
      } else {
        const text = await res.text();
        console.log("Error:", text);
      }
    } catch (e) {
      console.log("Fetch error:", e);
    }
  }
}

testInworld();
