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
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getBackendDb } from "./src/backend-db.js";
import { collectionGroup, query, where, onSnapshot, doc, setDoc, getDoc, collection, getDocs, updateDoc, serverTimestamp, increment, Timestamp } from "firebase/firestore";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

console.log("Server: Pre-dotenv GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
console.log("Server: Pre-dotenv API_KEY present:", !!process.env.API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log("Server: Pre-dotenv GEMINI_API_KEY value:", process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" ? "EXACTLY 'MY_GEMINI_API_KEY'" : `Starts with ${process.env.GEMINI_API_KEY.substring(0, 4)} and length is ${process.env.GEMINI_API_KEY.length}`);
}
const dotenvPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(dotenvPath)) {
  const dotenvResult = dotenv.config({ path: dotenvPath });
  if (dotenvResult.error) {
    console.error("Server: Error loading .env file:", dotenvResult.error);
  } else {
    console.log("Server: .env file loaded successfully");
  }
} else {
  console.log("Server: No .env file found, using environment variables");
}
console.log("Server: Post-dotenv GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);
console.log("Server: Post-dotenv API_KEY present:", !!process.env.API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log("Server: Post-dotenv GEMINI_API_KEY value:", process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" ? "EXACTLY 'MY_GEMINI_API_KEY'" : `Starts with ${process.env.GEMINI_API_KEY.substring(0, 4)} and length is ${process.env.GEMINI_API_KEY.length}`);
}
if (process.env.API_KEY) {
  console.log("Server: Post-dotenv API_KEY value:", `Starts with ${process.env.API_KEY.substring(0, 4)} and length is ${process.env.API_KEY.length}`);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log("Server: Config Project ID:", firebaseConfig.projectId);
  
  try {
    // Initialize with the projectId from config to ensure ID token verification works
    // (audience claim must match the project ID that issued the token)
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    console.log("Server: Firebase Admin initialized with projectId:", firebaseConfig.projectId);
  } catch (error) {
    console.warn("Server: Firebase Admin initialization with config projectId failed, trying default:", error);
    try {
      admin.initializeApp();
      console.log("Server: Firebase Admin initialized with default credentials");
    } catch (e) {
      console.error("Server: All Firebase Admin initialization attempts failed:", e);
    }
  }
  console.log("Server: Firebase Admin Project ID from options:", admin.app()?.options?.projectId || "default");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));
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

// Helper to get Firestore with fallback
const getDb = () => {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" 
      ? firebaseConfig.firestoreDatabaseId 
      : undefined;
    
    if (dbId) {
      try {
        return getFirestore(admin.app(), dbId);
      } catch (e) {
        console.warn(`[Server] getDb: Failed to initialize named database ${dbId}, falling back to (default). Error:`, e);
      }
    }
    return getFirestore();
  } catch (error) {
    console.error("[Server] getDb: Fatal error getting Firestore instance:", error);
    return getFirestore();
  }
};

/**
 * Helper to run Firestore operations with a retry on PERMISSION_DENIED
 * by falling back to the default database.
 */
async function runWithDbRetry<T>(operation: (db: admin.firestore.Firestore) => Promise<T>): Promise<T> {
  const db = getDb();
  try {
    return await operation(db);
  } catch (e: any) {
    if (e.message?.includes("PERMISSION_DENIED")) {
      console.warn("[Server] runWithDbRetry: Permission denied on Firestore. Retrying with default DB...");
      return await operation(getFirestore());
    }
    throw e;
  }
}

// User Middleware
const verifyUser = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.userUid = decodedToken.uid;
    return next();
  } catch (error) {
    console.error("[Server] verifyUser: Error verifying token:", error);
    return res.status(403).json({ message: "Forbidden" });
  }
};

// Admin Middleware
const verifyAdmin = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("[Server] verifyAdmin: Missing or invalid Authorization header");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    console.log("[Server] verifyAdmin: Verifying ID token...");
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    
    console.log(`[Server] verifyAdmin: Token verified for UID: ${uid}, Email: ${email}`);

    // Check if admin by email first (bypass DB check for main admin)
    if (email === "hello.vicoapps@gmail.com") {
      console.log(`[Server] verifyAdmin: Main admin recognized by email: ${email}`);
      req.adminUid = uid;
      return next();
    }

    console.log("[Server] verifyAdmin: Fetching user doc from Firestore...");
    const userDoc = await runWithDbRetry(db => db.collection("users").doc(uid).get());
    const userData = userDoc.data();
    
    console.log(`[Server] verifyAdmin: User data role: ${userData?.role}`);

    // Check if admin by role
    if (userData?.role === "admin") {
      req.adminUid = uid;
      next();
    } else {
      console.log(`[Server] verifyAdmin: User ${email} is not an admin`);
      res.status(403).json({ message: "Forbidden: Admin access required" });
    }
  } catch (error: any) {
    console.error("Verify Admin Error:", error);
    // Log more details if available
    if (error.code) console.error("Error Code:", error.code);
    if (error.stack) console.error("Error Stack:", error.stack);
    
    res.status(401).json({ message: "Unauthorized", details: error.message });
  }
};

// Admin User Management Routes
app.post("/api/admin/update-user", verifyAdmin, async (req, res) => {
  const { userId, updates } = req.body;
  if (!userId || !updates) return res.status(400).json({ message: "Missing parameters" });

  try {
    // Update business doc
    await runWithDbRetry(db => db.collection("businesses").doc(userId).set({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true }));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin Update User Error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/admin/change-password", verifyAdmin, async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword) return res.status(400).json({ message: "Missing parameters" });

  try {
    await admin.auth().updateUser(userId, { password: newPassword });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin Change Password Error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/admin/toggle-status", verifyAdmin, async (req, res) => {
  const { userId, disabled } = req.body;
  if (userId === undefined || disabled === undefined) return res.status(400).json({ message: "Missing parameters" });

  try {
    await admin.auth().updateUser(userId, { disabled });
    
    await runWithDbRetry(db => db.collection("businesses").doc(userId).set({
      disabled,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true }));

    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin Toggle Status Error:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: "Missing parameters" });

  try {
    // Delete from Auth
    await admin.auth().deleteUser(userId);
    
    // Delete from Firestore (businesses and users)
    // Note: In a real app, you might want to delete subcollections too (agents, calls, etc.)
    await runWithDbRetry(async (db) => {
      await db.collection("businesses").doc(userId).delete();
      await db.collection("users").doc(userId).delete();
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("Admin Delete User Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Gemini API
let genAI: GoogleGenAI | null = null;
const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      genAI = new GoogleGenAI({ apiKey });
    }
  }
  return genAI;
};

// Server-side Booking Processor
async function startBookingProcessor() {
  console.log("[Server] Starting BookingProcessor...");
  const db = await getBackendDb();
  if (!db) {
    console.error("[Server] BookingProcessor: Failed to get backend DB. Processor will not run.");
    return;
  }

  const setupListener = () => {
    const callsQuery = query(collectionGroup(db, "calls"), where("status", "==", "PENDING_PROCESSING"));
    
    onSnapshot(callsQuery, async (snapshot: any) => {
      if (snapshot.empty) return;

      const ai = getGenAI();
      if (!ai) {
        console.error("[Server] BookingProcessor: Gemini API key missing. Cannot process calls.");
        return;
      }

      for (const change of snapshot.docChanges()) {
        if (change.type === "added" || change.type === "modified") {
          const callDoc = change.doc;
          const callData = callDoc.data();
          const callId = callDoc.id;

          if (callData.status !== "PENDING_PROCESSING" || callData.processed || callData.processingStarted) continue;

          try {
            // Get business ID from path: businesses/{businessId}/calls/{callId}
            const businessId = callDoc.ref.parent.parent?.id;
            if (!businessId) continue;

            // Lock the document
            await setDoc(callDoc.ref, {
              processingStarted: true,
              processingStartedAt: serverTimestamp()
            }, { merge: true });

            console.log(`[Server] Processing call ${callId} for business ${businessId}...`);

            if (!callData.transcript || callData.transcript.trim().length < 10) {
              await setDoc(callDoc.ref, {
                status: "COMPLETED",
                processed: true,
                processedAt: serverTimestamp(),
                summary: "Transcript too short or missing"
              }, { merge: true });
              continue;
            }

            // Get business timezone and services
            const businessDoc = await getDoc(doc(db, "businesses", businessId));
            const businessData = businessDoc.data() || {};
            const timezone = businessData.timezone || "UTC";
            const services = businessData.services || [];
            const servicesList = services.length > 0 
              ? services.map((s: any) => `- ${s.name}: ₱${s.price}`).join('\n')
              : "No specific services/prices defined.";

            // Process with Gemini
            const prompt = `Analyze the following call transcript between an AI Agent and a User.
              
              Current Date/Time: ${new Date().toISOString()}
              Business Timezone: ${timezone}
              
              Business Services & Pricing:
              ${servicesList}
              
              Transcript:
              ${callData.transcript}
              
              Your goal is to extract key information and determine if a booking/appointment was made.
              
              Instructions:
              1. STATUS: 
                 - Set to "BOOKED" if the user explicitly agreed to a date/time for an appointment.
                 - Set to "INQUIRY" if the user was just asking questions.
                 - Set to "COMPLAINT" if the user expressed dissatisfaction.
                 - Set to "FOLLOW_UP" if a follow-up is needed.
                 - Set to "DROPPED" if the call ended abruptly.
              
              2. BOOKING DETAILS:
                 - Extract name, phone, email, dateTime, and purpose.
                 - CRITICAL: The dateTime MUST be in ISO 8601 format WITH the correct timezone offset for ${timezone} (e.g., 2026-03-23T15:00:00+08:00). 
                 - If the user specifies a time without a date, assume the current date (${new Date().toISOString().split('T')[0]}).
                 - If no specific time is mentioned, leave dateTime as null.
                 - Determine the estimatedPrice (number) based on the purpose and the provided Business Services & Pricing. If no match or not booked, set to 0.
              
              3. SUMMARY:
                 - Provide a 1-2 sentence summary.
              
              Return ONLY a JSON object with keys: summary, status, bookingDetails (name, phone, email, dateTime, purpose, estimatedPrice).`;

            const resultResponse = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    summary: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ["BOOKED", "INQUIRY", "COMPLAINT", "FOLLOW_UP", "DROPPED"] },
                    bookingDetails: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        phone: { type: Type.STRING },
                        email: { type: Type.STRING },
                        dateTime: { type: Type.STRING },
                        purpose: { type: Type.STRING },
                        estimatedPrice: { type: Type.NUMBER }
                      }
                    }
                  },
                  required: ["summary", "status"]
                }
              }
            });

            const result = JSON.parse(resultResponse.text || "{}");
            
            // Update call record
            const updateData: any = {
              summary: result.summary,
              status: result.status || "COMPLETED",
              processedAt: serverTimestamp(),
              processed: true,
            };

            if (result.bookingDetails) {
              if (result.bookingDetails.name) updateData.callerName = result.bookingDetails.name;
              if (result.bookingDetails.phone) updateData.phoneNumber = result.bookingDetails.phone;
              if (result.bookingDetails.email) updateData.callerEmail = result.bookingDetails.email;
              if (result.bookingDetails.dateTime) updateData.bookingTime = result.bookingDetails.dateTime;
              if (result.bookingDetails.purpose) updateData.bookingPurpose = result.bookingDetails.purpose;
              if (result.bookingDetails.estimatedPrice !== undefined) updateData.estimatedPrice = result.bookingDetails.estimatedPrice;
            }

            await setDoc(callDoc.ref, updateData, { merge: true });

            // Send confirmation email if booked
            if (updateData.status === "BOOKED" && updateData.callerEmail && updateData.bookingTime) {
              const resendApiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
              if (resendApiKey) {
                try {
                  const businessData = businessDoc.data() || {};
                  const businessName = businessData.name || "Vico";
                  const businessEmail = businessData.email || process.env.SMTP_USER;
                  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || "notifications@vicoapps.com";

                  const transporter = nodemailer.createTransport({
                    host: "smtp.resend.com",
                    port: 465,
                    secure: true,
                    auth: {
                      user: "resend",
                      pass: resendApiKey,
                    },
                  });
                  
                  const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(updateData.bookingTime);
                  const bookingDate = hasOffset ? new Date(updateData.bookingTime) : fromZonedTime(updateData.bookingTime, timezone);
                  const formattedTime = formatInTimeZone(bookingDate, timezone, "MMMM d, yyyy 'at' h:mm a");
                  const callerName = updateData.callerName || "there";
                  
                  await transporter.sendMail({
                    from: `"${businessName}" <${fromEmail}>`,
                    replyTo: businessEmail,
                    to: updateData.callerEmail,
                    subject: "Appointment Confirmation",
                    text: `Hi ${callerName},\n\nYour appointment has been confirmed for ${formattedTime} (${timezone}).\n\nPurpose: ${updateData.bookingPurpose || "Appointment"}\n\nThank you!`,
                    html: `<p>Hi ${callerName},</p><p>Your appointment has been confirmed for <strong>${formattedTime} (${timezone})</strong>.</p><p>Purpose: ${updateData.bookingPurpose || "Appointment"}</p><p>Thank you!</p>`
                  });
                  console.log(`[Server] Sent confirmation email to ${updateData.callerEmail}`);
                } catch (emailError) {
                  console.error(`[Server] Failed to send confirmation email to ${updateData.callerEmail}:`, emailError);
                }
              } else {
                console.warn("[Server] SMTP credentials not configured. Skipping confirmation email.");
              }
            }

            // CRM Integration
            const phoneNumber = updateData.phoneNumber || callData.phoneNumber;
            if (phoneNumber && phoneNumber !== "Unknown") {
              const contactsRef = collection(db, "businesses", businessId, "contacts");
              const contactQuery = await getDocs(query(contactsRef, where("phone", "==", phoneNumber)));
              
              const contactData: any = {
                name: updateData.callerName || callData.callerName || "Unknown",
                phone: phoneNumber,
                email: updateData.callerEmail || callData.callerEmail || "",
                status: result.status === "BOOKED" ? "BOOKED" : "INQUIRED",
                businessId: businessId,
                lastCallId: callId,
                lastCallSummary: result.summary,
                updatedAt: serverTimestamp(),
              };

              if (!contactQuery.empty) {
                await setDoc(contactQuery.docs[0].ref, contactData, { merge: true });
              } else {
                contactData.createdAt = serverTimestamp();
                await setDoc(doc(contactsRef), contactData);
              }
            }

            // Deduct credits and increment stats
            const minutesUsed = Math.max(0.1, (callData.duration || 0) / 60);
            const statsUpdate: any = {
              usedMinutes: increment(minutesUsed),
              totalCalls: increment(1)
            };

            if (updateData.status === "BOOKED") {
              statsUpdate.totalBookings = increment(1);
              if (updateData.estimatedPrice) {
                statsUpdate.estimatedEarnings = increment(updateData.estimatedPrice);
              }
              if (callData.psid && updateData.bookingTime) {
                statsUpdate.hasPendingFollowUps = true;
              }
            } else if (updateData.status === "INQUIRY") {
              statsUpdate.totalInquiries = increment(1);
            }

            // Success rate calculation helper: increment totalSuccess if status is one of the successful ones
            const successfulStatuses = ["BOOKED", "INQUIRY", "FOLLOW_UP", "COMPLAINT"];
            if (successfulStatuses.includes(updateData.status)) {
              statsUpdate.totalSuccess = increment(1);
            }

            await setDoc(doc(db, "businesses", businessId), statsUpdate, { merge: true });

            // Schedule follow-up if booked and has PSID
            if (updateData.status === "BOOKED" && callData.psid && updateData.bookingTime) {
              try {
                const bookingDate = new Date(updateData.bookingTime);
                const followUpDate = new Date(bookingDate.getTime() - 24 * 60 * 60 * 1000);
                
                await setDoc(callDoc.ref, {
                  followUpScheduledAt: Timestamp.fromDate(followUpDate),
                  followUpSent: false
                }, { merge: true });
                
                console.log(`[Server] Scheduled follow-up for call ${callId} at ${followUpDate.toISOString()}`);
              } catch (followUpError) {
                console.error(`[Server] Failed to schedule follow-up for call ${callId}:`, followUpError);
              }
            }

            console.log(`[Server] Successfully processed call ${callId}`);
          } catch (error) {
            console.error(`[Server] Error processing call ${callId}:`, error);
            await setDoc(callDoc.ref, {
              status: "PROCESSING_ERROR",
              processed: true,
              processingError: String(error),
              processingStarted: false
            }, { merge: true });
          }
        }
      }
    }, (error: any) => {
      console.error("[Server] BookingProcessor Snapshot Error:", error.message || error);
    });
  };

  setupListener();
}

// Follow-up Processor
async function startFollowUpProcessor() {
  console.log("[Server] Starting FollowUpProcessor...");
  const db = await getBackendDb();
  if (!db) {
    console.error("[Server] FollowUpProcessor: Failed to get backend DB. Processor will not run.");
    return;
  }

  const runProcessor = () => {
    // Run every minute
    setInterval(async () => {
      try {
        const now = Timestamp.now();
        
        // Query businesses that have pending follow-ups
        const businessesSnapshot = await getDocs(query(collection(db, "businesses"), where("hasPendingFollowUps", "==", true)));

        if (businessesSnapshot.empty) return;

        for (const businessDoc of businessesSnapshot.docs) {
          const businessId = businessDoc.id;
          const businessData = businessDoc.data();

          // Query calls for this business that have followUpSent == false
          const callsSnapshot = await getDocs(query(collection(db, "businesses", businessId, "calls"), where("followUpSent", "==", false)));

          if (callsSnapshot.empty) {
            // No more pending follow-ups for this business, update the flag
            await updateDoc(businessDoc.ref, { hasPendingFollowUps: false });
            continue;
          }

          for (const callDoc of callsSnapshot.docs) {
            const callData = callDoc.data();
            const callId = callDoc.id;
            const psid = callData.psid;

            // Check if it's time to send the follow-up and status is BOOKED
            if (
              callData.status !== "BOOKED" || 
              !callData.followUpScheduledAt || 
              callData.followUpScheduledAt.toMillis() > now.toMillis()
            ) {
              continue; // Not ready yet or not booked
            }

            if (!psid) continue;

            try {
              if (!businessData?.botcakeApiKey || !businessData?.botcakePageId || !businessData?.botcakeFollowUpEnabled) {
                // Only log if it's not just disabled
                if (businessData?.botcakeFollowUpEnabled !== false) {
                  console.warn(`[Server] FollowUp: Missing Botcake credentials or follow-up disabled for business ${businessId}`);
                }
                continue;
              }

              // Format variables for the template
              // {{1}} First name, {{2}} Business name, {{3}} Booking date, {{4}} Booking time, {{5}} Purpose
              const bookingTime = new Date(callData.bookingTime);
              const timezone = businessData.timezone || "UTC";
              
              const bookingDateStr = formatInTimeZone(bookingTime, timezone, "MMMM d, yyyy");
              const bookingTimeStr = formatInTimeZone(bookingTime, timezone, "h:mm a");
              
              const firstName = (callData.callerName || "there").split(" ")[0];
              const businessName = businessData.name || "Vico";
              const purpose = callData.bookingPurpose || "Appointment";

              console.log(`[Server] Sending Botcake follow-up for call ${callId} to PSID ${psid}...`);

              // Botcake Utility Message API with Template
              const response = await fetch(`https://botcake.io/api/v1/pages/${businessData.botcakePageId}/messages`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${businessData.botcakeApiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  recipient: { id: psid },
                  message: {
                    attachment: {
                      type: "template",
                      payload: {
                        template_type: "utility",
                        template_id: "26515428094812765",
                        vars: [firstName, businessName, bookingDateStr, bookingTimeStr, purpose]
                      }
                    }
                  },
                  messaging_type: "MESSAGE_TAG",
                  tag: "CONFIRMED_EVENT_UPDATE"
                })
              });

              if (!response.ok) {
                const errText = await response.text();
                console.error(`[Server] Botcake follow-up failed for ${callId}:`, errText);
                continue;
              }

              // Mark as sent
              await setDoc(callDoc.ref, {
                followUpSent: true,
                followUpSentAt: serverTimestamp()
              }, { merge: true });

              console.log(`[Server] Successfully sent Botcake follow-up for call ${callId}`);
            } catch (err) {
              console.error(`[Server] Error processing follow-up for call ${callId}:`, err);
            }
          }
        }
      } catch (error: any) {
        console.error(`[Server] FollowUpProcessor Interval Error:`, error.message || error);
      }
    }, 60000); // Every minute
  };

  runProcessor();
}
// API Routes
app.post("/api/gemini/process-transcript", async (req, res) => {
  const { transcript, timezone } = req.body;
  const ai = getGenAI();
  
  if (!ai) {
    return res.status(500).json({ error: "Gemini API key not configured on server" });
  }

  try {
    const prompt = `Analyze the following call transcript between an AI Agent and a User.
      
      Current Date/Time: ${new Date().toISOString()}
      Business Timezone: ${timezone}
      
      Transcript:
      ${transcript}
      
      Your goal is to extract key information and determine if a booking/appointment was made.
      
      Instructions:
      1. STATUS: 
         - Set to "BOOKED" if the user explicitly agreed to a date/time for an appointment.
         - Set to "INQUIRY" if the user was just asking questions.
         - Set to "COMPLAINT" if the user expressed dissatisfaction.
         - Set to "FOLLOW_UP" if a follow-up is needed.
         - Set to "DROPPED" if the call ended abruptly.
      
      2. BOOKING DETAILS:
         - Extract name, phone, email, dateTime (ISO 8601 with timezone offset for ${timezone}), and purpose.
      
      3. SUMMARY:
         - Provide a 1-2 sentence summary.
      
      Return ONLY a JSON object with keys: summary, status, bookingDetails (name, phone, email, dateTime, purpose).`;

    const resultResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["BOOKED", "INQUIRY", "COMPLAINT", "FOLLOW_UP", "DROPPED"] },
            bookingDetails: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                phone: { type: Type.STRING },
                email: { type: Type.STRING },
                dateTime: { type: Type.STRING },
                purpose: { type: Type.STRING }
              }
            }
          },
          required: ["summary", "status"]
        }
      }
    });

    const result = JSON.parse(resultResponse.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Server Gemini Error:", error);
    res.status(500).json({ error: error.message });
  }
});

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

app.post("/api/botcake/user", async (req, res) => {
  const { pageId, psid, apiKey } = req.body;
  if (!pageId || !psid || !apiKey) {
    return res.status(400).json({ message: "Missing parameters" });
  }

  try {
    const response = await fetch(`https://botcake.io/api/v1/pages/${encodeURIComponent(String(pageId))}/subscribers/${encodeURIComponent(String(psid))}`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Botcake API error response:", errorText);
      return res.status(response.status).json({ message: "Botcake API error", details: errorText });
    }

    const data = await response.json();
    if (data.success === false) {
      console.warn(`Botcake API returned success: false for pageId: ${pageId}, psid: ${psid}. Check API Key, Page ID, and PSID.`);
    }
    res.json(data);
  } catch (error) {
    console.error("Botcake API Error:", error);
    res.status(500).json({ message: "Internal server error", error: String(error) });
  }
});

app.post("/api/elevenlabs/tts", async (req, res) => {
  const { text, voiceId } = req.body;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ error: "ElevenLabs API key not configured on server. Please set ELEVENLABS_API_KEY in Settings > Secrets." });
  }

  try {
    const { stability = 0.5, similarity_boost = 0.75, speed = 1.0 } = req.body.voice_settings || {};

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
          stability,
          similarity_boost,
          speed
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
  if (!apiKey) {
    return res.status(200).json({ voices: [], error: "ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY in Settings > Secrets." });
  }
  
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey }
    });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }
    const data = await r.json();
    res.json(data);
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
  if (!apiKey) return res.status(400).json({ error: "ElevenLabs API key missing. Please set ELEVENLABS_API_KEY in Settings > Secrets to enable voice agent features." });
  
  try {
    const body = { ...req.body };

    const r = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: { 
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const text = await r.text();
    if (!r.ok) {
      console.error("ElevenLabs Create Agent Error:", text);
    }
    res.status(r.status).send(text);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch("/api/elevenlabs/agents/:id", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = req.params.id;
  if (!apiKey) return res.status(400).json({ error: "ElevenLabs API key missing. Please set ELEVENLABS_API_KEY in Settings > Secrets to enable voice agent features." });
  
  try {
    const body = { ...req.body };

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
      const businessDoc = await runWithDbRetry(db => db.collection("businesses").doc(businessId).get());
      
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
    // 1. Find the agent and business
    // We need to find which business this agent belongs to.
    // We'll search for an agent with this elevenLabsAgentId in all businesses.
    const { targetBusinessId, targetAgentId } = await runWithDbRetry(async (db) => {
      const businessesSnapshot = await db.collection("businesses").get();
      let tBusinessId: string | null = null;
      let tAgentId: string | null = null;

      for (const businessDoc of businessesSnapshot.docs) {
        const agentsSnapshot = await businessDoc.ref.collection("agents").where("elevenLabsAgentId", "==", agent_id).get();
        if (!agentsSnapshot.empty) {
          tBusinessId = businessDoc.id;
          tAgentId = agentsSnapshot.docs[0].id;
          break;
        }
      }
      return { targetBusinessId: tBusinessId, targetAgentId: tAgentId };
    });

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
    await runWithDbRetry(async (db) => {
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
    });

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
    return res.status(400).json({ error: "ElevenLabs API key not configured on server. Please set ELEVENLABS_API_KEY in Settings > Secrets." });
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
  if (!apiKey) return res.status(400).json({ error: "ElevenLabs API key not configured on server. Please set ELEVENLABS_API_KEY in Settings > Secrets." });
  
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${req.params.id}`, {
      headers: { "xi-api-key": apiKey }
    });
    res.status(r.status).send(await r.text());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/elevenlabs/conversations/:id", async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(400).json({ error: "ElevenLabs API key not configured on server. Please set ELEVENLABS_API_KEY in Settings > Secrets." });
  
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${req.params.id}`, {
      headers: { "xi-api-key": apiKey }
    });
    res.status(r.status).send(await r.text());
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Email Integration
app.post("/api/send-email", verifyUser, async (req: any, res) => {
  const { to, subject, text, html } = req.body;
  
  const resendApiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;
  if (!resendApiKey) {
    return res.status(500).json({ error: "Email credentials not configured on server. Please set RESEND_API_KEY in Settings > Secrets." });
  }

  try {
    // Fetch business details for Reply-To and From Name
    const businessDoc = await runWithDbRetry(db => db.collection("businesses").doc(req.userUid).get());
    const businessData = businessDoc.data() || {};
    const businessName = businessData.name || "Vico";
    const businessEmail = businessData.email || process.env.SMTP_USER;
    const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || "notifications@vicoapps.com";

    const transporter = nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: resendApiKey,
      },
    });

    const mailOptions = {
      from: `"${businessName}" <${fromEmail}>`,
      replyTo: businessEmail,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Server Email Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// PayPal Integration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.PAYPAL_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || process.env.PAYPAL_SECRET;
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

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    appUrl: process.env.APP_URL ? "configured" : "missing",
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ? "configured" : "missing",
    geminiApiKey: process.env.GEMINI_API_KEY ? "configured" : "missing",
    apiKey: process.env.API_KEY ? "configured" : "missing",
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
  app.use(express.static(__dirname));
  app.get("*all", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Server] API is live at http://0.0.0.0:${PORT}`);
  console.log(`[Server] Upload endpoint: http://0.0.0.0:${PORT}/api/upload`);
  
  // Start background processors
  startBookingProcessor().catch(err => console.error("Failed to start BookingProcessor:", err));
  startFollowUpProcessor().catch(err => console.error("Failed to start FollowUpProcessor:", err));
});
