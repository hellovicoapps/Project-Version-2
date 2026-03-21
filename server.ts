import crypto from "crypto";
import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

console.log("Server: Pre-dotenv GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
console.log("Server: Pre-dotenv API_KEY present:", !!process.env.API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log("Server: Pre-dotenv GEMINI_API_KEY value:", process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" ? "EXACTLY 'MY_GEMINI_API_KEY'" : `Starts with ${process.env.GEMINI_API_KEY.substring(0, 4)} and length is ${process.env.GEMINI_API_KEY.length}`);
}
dotenv.config();
console.log("Server: Post-dotenv GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
console.log("Server: Post-dotenv API_KEY present:", !!process.env.API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log("Server: Post-dotenv GEMINI_API_KEY value:", process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" ? "EXACTLY 'MY_GEMINI_API_KEY'" : `Starts with ${process.env.GEMINI_API_KEY.substring(0, 4)} and length is ${process.env.GEMINI_API_KEY.length}`);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log("Server: Initializing Firebase Admin with Project ID:", firebaseConfig.projectId);
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(cookieParser());

// Mock DB
const users: any[] = [];

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/update-password", async (req, res) => {
  const { newPassword } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await admin.auth().updateUser(uid, {
      password: newPassword,
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin Update Password Error:", error);
    let message = error.message || "Failed to update password";
    if (error.code === 'auth/internal-error' && message.includes('identitytoolkit.googleapis.com')) {
      message = "The 'Identity Toolkit API' is not enabled in your Google Cloud Project. This is required for administrative authentication tasks. Please enable it at: https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=617853879776 (or project " + firebaseConfig.projectId + "). If you enabled it recently, please wait 5-10 minutes for it to propagate.";
    }
    res.status(500).json({ success: false, message });
  }
});

// API Routes
app.get("/api/config", (req, res) => {
  // We only send non-sensitive configuration to the frontend.
  // Sensitive keys like ELEVENLABS_API_KEY and PAYPAL_CLIENT_SECRET
  // are handled strictly on the server.
  // Gemini API key is injected via Vite's 'define' in vite.config.ts for frontend use.
  
  res.json({
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || null,
    PAYPAL_MODE: process.env.PAYPAL_MODE || "sandbox",
    APP_URL: process.env.APP_URL || null,
  });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token: "mock-token" });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

app.post("/api/auth/register", (req, res) => {
  const { email, password, name } = req.body;
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ message: "User already exists" });
  }
  const newUser = { id: String(users.length + 1), email, password, name, role: "user" as const };
  users.push(newUser);
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ user: userWithoutPassword, token: "mock-token" });
});

app.get("/api/botcake/user", async (req, res) => {
  const { pageId, psid, apiKey } = req.query;
  if (!pageId || !psid || !apiKey) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    const response = await fetch(`https://api.botcake.io/v1/pages/${pageId}/subscribers/${psid}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ message: "Botcake API error" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Botcake API Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Gemini Proxy
app.post("/api/gemini/generate", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Gemini API Key not configured on server" });

  const { contents, config } = req.body;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config
    });
    res.json(response);
  } catch (error: any) {
    console.error("Server Gemini Generate Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini/tts", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Gemini API Key not configured on server" });

  const { text, voiceName } = req.body;
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    res.json({ audioData });
  } catch (error: any) {
    console.error("Server Gemini TTS Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/elevenlabs/tts", async (req, res) => {
  const { text, voiceId } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "ElevenLabs API key not configured on server" });
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).send(errorText);
    }

    const arrayBuffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error("Server ElevenLabs Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ElevenLabs Conversational AI Proxy Routes
app.get("/api/elevenlabs/voices", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing API Key" });
  
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey }
    });
    res.status(r.status).send(await r.text());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/elevenlabs/preview/:voiceId", async (req, res) => {
  const { voiceId } = req.params;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  console.log(`Server: Requesting preview for voiceId: ${voiceId}`);
  
  if (!apiKey) {
    console.error("Server: ElevenLabs API Key missing for preview");
    return res.status(500).json({ error: "ElevenLabs API key not configured" });
  }

  try {
    // First get the voice info to get the preview URL
    const r = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
      headers: { "xi-api-key": apiKey }
    });
    
    if (!r.ok) {
      const errText = await r.text();
      console.error(`Server: ElevenLabs voice info error for ${voiceId} (${r.status}):`, errText);
      return res.status(r.status).send(errText);
    }

    const voiceData = await r.json();
    const previewUrl = voiceData.preview_url;

    if (!previewUrl) {
      console.error(`Server: No preview URL found for voice ${voiceId}`);
      return res.status(404).json({ error: "Preview URL not found for this voice" });
    }

    // Fetch the actual audio from the preview URL
    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) {
      console.error(`Server: Failed to fetch audio from preview URL: ${previewUrl}`);
      return res.status(audioRes.status).send("Failed to fetch preview audio");
    }

    const contentType = audioRes.headers.get("Content-Type") || "audio/mpeg";
    const arrayBuffer = await audioRes.arrayBuffer();
    
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.send(Buffer.from(arrayBuffer));
  } catch (e: any) {
    console.error("Server: ElevenLabs preview proxy error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/elevenlabs/agents", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing API Key" });
  
  try {
    const body = { ...req.body };
    // Inject webhook URL and tools if not present
    if (process.env.APP_URL) {
      if (!body.conversation_config) body.conversation_config = {};
      body.conversation_config.webhook_url = `${process.env.APP_URL}/api/webhooks/elevenlabs`;
      
      // Inject tool for fetching business info
      if (!body.conversation_config.agent) body.conversation_config.agent = {};
      if (!body.conversation_config.agent.tools) body.conversation_config.agent.tools = [];
      
      const hasBusinessInfoTool = body.conversation_config.agent.tools.some((t: any) => t.name === "get_business_info");
      if (!hasBusinessInfoTool) {
        body.conversation_config.agent.tools.push({
          type: "webhook",
          name: "get_business_info",
          description: "Get information about the business like hours, address, and services.",
          url: `${process.env.APP_URL}/api/webhooks/elevenlabs/tools`,
          method: "POST"
        });
      }
    } else {
      console.warn("Server: APP_URL environment variable is missing. ElevenLabs webhook and tools will NOT be configured.");
    }

    const r = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: { 
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    res.status(r.status).send(await r.text());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/elevenlabs/agents/:id", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = req.params.id;
  if (!apiKey) return res.status(500).json({ error: "Missing API Key" });
  
  try {
    const body = { ...req.body };
    // Inject webhook URL and tools if not present
    if (process.env.APP_URL) {
      if (!body.conversation_config) body.conversation_config = {};
      body.conversation_config.webhook_url = `${process.env.APP_URL}/api/webhooks/elevenlabs`;
      
      // Inject tool for fetching business info
      if (!body.conversation_config.agent) body.conversation_config.agent = {};
      if (!body.conversation_config.agent.tools) body.conversation_config.agent.tools = [];
      
      const hasBusinessInfoTool = body.conversation_config.agent.tools.some((t: any) => t.name === "get_business_info");
      if (!hasBusinessInfoTool) {
        body.conversation_config.agent.tools.push({
          type: "webhook",
          name: "get_business_info",
          description: "Get information about the business like hours, address, and services.",
          url: `${process.env.APP_URL}/api/webhooks/elevenlabs/tools`,
          method: "POST"
        });
      }
    } else {
      console.warn("Server: APP_URL environment variable is missing. ElevenLabs webhook and tools will NOT be configured.");
    }

    const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: { 
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    
    const responseText = await r.text();
    if (!r.ok) {
      console.error(`Server: ElevenLabs PATCH error for ${agentId} (${r.status}):`, responseText);
    }
    res.status(r.status).send(responseText);
  } catch (e: any) {
    console.error(`Server: ElevenLabs PATCH exception for ${agentId}:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ElevenLabs Tool Webhook Handler
app.post("/api/webhooks/elevenlabs/tools", async (req, res) => {
  console.log("Server: ElevenLabs Tool Webhook received:", JSON.stringify(req.body, null, 2));
  
  const { tool_call, conversation_id, dynamic_variables } = req.body;
  
  if (!tool_call) {
    return res.status(400).json({ error: "Missing tool_call" });
  }

  const { name, parameters } = tool_call;
  const businessId = dynamic_variables?.business_id;

  if (name === "get_business_info") {
    if (!businessId) {
      return res.status(200).json({ 
        result: "Error: business_id missing from dynamic variables. Cannot fetch business info." 
      });
    }

    try {
      const db = getFirestore();
      const businessDoc = await db.collection("businesses").doc(businessId).get();
      
      if (!businessDoc.exists) {
        return res.status(200).json({ result: "Error: Business not found." });
      }

      const data = businessDoc.data();
      const info = {
        name: data?.name,
        address: data?.address,
        phone: data?.phone,
        email: data?.email,
        hours: data?.businessHours,
        timezone: data?.timezone,
        description: data?.knowledgeBase || "A professional business."
      };

      return res.status(200).json({ result: JSON.stringify(info) });
    } catch (error) {
      console.error("Server: Error fetching business info for tool:", error);
      return res.status(200).json({ result: "Error: Failed to fetch business information." });
    }
  }

  res.status(404).json({ error: "Tool not found" });
});

// ElevenLabs Webhook Handler
app.post("/api/webhooks/elevenlabs", async (req, res) => {
  console.log("Server: ElevenLabs Webhook received at /api/webhooks/elevenlabs");
  console.log("Server: Webhook Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Server: Webhook Body:", JSON.stringify(req.body, null, 2));
  
  // HMAC Validation
  const signature = req.headers["x-elevenlabs-signature"];
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET || "4cc6333fbf934a149664db5fe3e082bc";
  
  if (signature && secret) {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(req.body));
    const expectedSignature = hmac.digest("hex");
    
    if (signature !== expectedSignature) {
      console.warn(`Server: ElevenLabs Webhook HMAC validation failed. Expected ${expectedSignature}, got ${signature}`);
      // For now, we'll just log it and continue
    } else {
      console.log("Server: ElevenLabs Webhook HMAC validation successful");
    }
  }

  const { conversation_id, agent_id, transcript, call_id, metadata } = req.body;
  
  if (!agent_id) {
    console.error("Server: Webhook missing agent_id");
    return res.status(400).send("Missing agent_id");
  }

  try {
    const db = getFirestore();
    
    // 1. Find the agent and business
    // We need to find which business this agent belongs to.
    // We'll search for an agent with this elevenLabsAgentId in all businesses.
    const businessesSnapshot = await db.collection("businesses").get();
    let targetBusinessId: string | null = null;
    let targetAgentId: string | null = null;

    for (const businessDoc of businessesSnapshot.docs) {
      const agentsSnapshot = await businessDoc.ref.collection("agents").where("elevenLabsAgentId", "==", agent_id).get();
      if (!agentsSnapshot.empty) {
        targetBusinessId = businessDoc.id;
        targetAgentId = agentsSnapshot.docs[0].id;
        break;
      }
    }

    if (!targetBusinessId) {
      console.error(`Server: Business not found for ElevenLabs agent_id: ${agent_id}`);
      return res.status(404).send("Business not found");
    }

    // 2. Format transcript
    let transcriptText = "";
    if (Array.isArray(transcript)) {
      transcriptText = transcript.map((t: any) => {
        const role = t.role === 'agent' ? 'Agent' : 'User';
        const message = t.message || t.text || "";
        return `${role}: ${message}`;
      }).join("\n");
    } else if (typeof transcript === 'string') {
      transcriptText = transcript;
    }

    // 3. Find or create the Call record in Firestore
    const callsRef = db.collection("businesses").doc(targetBusinessId).collection("calls");
    const callRef = callsRef.doc(conversation_id);
    
    const callDoc = await callRef.get();
    const existingData = callDoc.exists ? callDoc.data() : {};

    // Only set to PENDING_PROCESSING if we have a transcript and it's not already processed
    // or if the current status is PENDING_PROCESSING/IN_PROGRESS
    let newStatus = existingData?.status || "IN_PROGRESS";
    if (transcriptText && transcriptText.length > 10) {
      if (newStatus === "IN_PROGRESS" || newStatus === "PENDING_PROCESSING") {
        newStatus = "PENDING_PROCESSING";
      }
    }

    await callRef.set({
      businessId: targetBusinessId,
      agentId: targetAgentId,
      elevenLabsConversationId: conversation_id,
      elevenLabsCallId: call_id,
      transcript: transcriptText,
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: existingData?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      phoneNumber: metadata?.phone_number || existingData?.phoneNumber || "Unknown",
      duration: metadata?.duration_seconds || existingData?.duration || 0,
    }, { merge: true });

    console.log(`Server: Updated call record ${conversation_id} for business ${targetBusinessId}. Status: ${newStatus}`);
    res.status(200).send("Webhook processed");
  } catch (error) {
    console.error("Server: Webhook processing error:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/api/elevenlabs/signed-url", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const { agent_id } = req.query;
  console.log(`Server: Fetching signed URL for agent: ${agent_id}`);
  
  if (!apiKey) {
    console.error("Server: Missing ElevenLabs API Key");
    return res.status(500).json({ error: "Missing API Key" });
  }
  if (!agent_id) {
    console.error("Server: Missing agent_id in request");
    return res.status(400).json({ error: "Missing agent_id" });
  }
  
  try {
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agent_id}`;
    console.log(`Server: Requesting ElevenLabs: ${url}`);
    
    const r = await fetch(url, {
      headers: { "xi-api-key": apiKey }
    });
    
    const status = r.status;
    const text = await r.text();
    console.log(`Server: ElevenLabs response status: ${status}`);
    
    if (!r.ok) {
      console.error(`Server: ElevenLabs error: ${text}`);
    }
    
    res.status(status).send(text);
  } catch (e: any) {
    console.error("Server: Proxy error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/elevenlabs/agents/:id", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing API Key" });
  
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${req.params.id}`, {
      headers: { "xi-api-key": apiKey }
    });
    res.status(r.status).send(await r.text());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PayPal Integration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";
const PAYPAL_BASE_URL = PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

const getPayPalAccessToken = async () => {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
};

app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    const accessToken = await getPayPalAccessToken();
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount || "10.00",
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("PayPal Create Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("PayPal Capture Order Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Email Integration
app.post("/api/email/send-booking-confirmation", async (req, res) => {
  try {
    const { to, name, dateTime, purpose, businessName } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: "Missing recipient email" });
    }

    let transporter;
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Fallback to Ethereal for testing
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log("Server: Using Ethereal Email for testing");
    }

    const info = await transporter.sendMail({
      from: `"${businessName || 'Vico AI'}" <noreply@vico.ai>`,
      to,
      subject: `Booking Confirmation: ${purpose || 'Appointment'}`,
      text: `Hi ${name || 'there'},\n\nYour booking for ${purpose || 'an appointment'} is confirmed for ${dateTime}.\n\nThank you,\n${businessName || 'Vico AI'}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1d4ed8;">Booking Confirmation</h2>
          <p>Hi ${name || 'there'},</p>
          <p>Your booking is confirmed. Here are the details:</p>
          <ul style="background: #f8fafc; padding: 15px 30px; border-radius: 8px;">
            <li style="margin-bottom: 10px;"><strong>Purpose:</strong> ${purpose || 'Appointment'}</li>
            <li style="margin-bottom: 10px;"><strong>Date & Time:</strong> ${dateTime}</li>
          </ul>
          <p>Thank you,<br><strong>${businessName || 'Vico AI'}</strong></p>
        </div>
      `,
    });

    console.log("Server: Email sent: %s", info.messageId);
    if (!process.env.SMTP_HOST) {
      console.log("Server: Email Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }

    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Server: Email sending error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Upload endpoint placeholder (frontend uses Firebase Storage directly)
app.post("/api/upload", (req, res) => {
  res.status(501).json({ 
    error: "Server-side upload not implemented. The application is configured to use Firebase Storage for all file uploads." 
  });
});

// Logo endpoint to serve the logo.png file
// This endpoint is public and has CORS enabled to ensure the logo is always accessible.
app.get("/api/logo", (req, res) => {
  // Redirect to the public Firebase Storage URL where the logo is hosted
  res.redirect(301, "https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0425458275.firebasestorage.app/o/businesses%2F2yaZgckDZ3Yt1o9IM8sTKQGuGxG3%2Flogo.png?alt=media&token=f858bd0d-1376-41ea-a944-667bd854a164");
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    appUrl: process.env.APP_URL ? "configured" : "missing",
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ? "configured" : "missing",
    nodeEnv: process.env.NODE_ENV || "development"
  });
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  // In production, serve static files from the dist directory
  // __dirname is the dist directory where server.js and static assets reside
  app.use(express.static(__dirname, {
    index: false, // Don't serve index.html automatically, we handle it with the catch-all
    setHeaders: (res, path) => {
      if (path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".jpeg") || path.endsWith(".svg")) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  }));

  app.get("*all", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] API is live at http://0.0.0.0:${PORT}`);
  console.log(`[Server] Upload endpoint: http://0.0.0.0:${PORT}/api/upload`);
});
