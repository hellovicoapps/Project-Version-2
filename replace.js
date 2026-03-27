import fs from 'fs';

const serverFile = fs.readFileSync('server.ts', 'utf-8');

const startIdx = serverFile.indexOf('async function startBookingProcessor() {');
const endIdx = serverFile.indexOf('// API Routes');

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `async function startBookingProcessor() {
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

            console.log(\`[Server] Processing call \${callId} for business \${businessId}...\`);

            if (!callData.transcript || callData.transcript.trim().length < 10) {
              await setDoc(callDoc.ref, {
                status: "COMPLETED",
                processed: true,
                processedAt: serverTimestamp(),
                summary: "Transcript too short or missing"
              }, { merge: true });
              continue;
            }

            // Get business timezone
            const businessDoc = await getDoc(doc(db, "businesses", businessId));
            const timezone = businessDoc.data()?.timezone || "UTC";

            // Process with Gemini
            const prompt = \`Analyze the following call transcript between an AI Agent and a User.
              
              Current Date/Time: \${new Date().toISOString()}
              Business Timezone: \${timezone}
              
              Transcript:
              \${callData.transcript}
              
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
                 - CRITICAL: The dateTime MUST be in ISO 8601 format WITH the correct timezone offset for \${timezone} (e.g., 2026-03-23T15:00:00+08:00). 
                 - If the user specifies a time without a date, assume the current date (\${new Date().toISOString().split('T')[0]}).
                 - If no specific time is mentioned, leave dateTime as null.
              
              3. SUMMARY:
                 - Provide a 1-2 sentence summary.
              
              Return ONLY a JSON object with keys: summary, status, bookingDetails (name, phone, email, dateTime, purpose).\`;

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
                  
                  const hasOffset = /(Z|[+-]\\d{2}:\\d{2})$/.test(updateData.bookingTime);
                  const bookingDate = hasOffset ? new Date(updateData.bookingTime) : fromZonedTime(updateData.bookingTime, timezone);
                  const formattedTime = formatInTimeZone(bookingDate, timezone, "MMMM d, yyyy 'at' h:mm a");
                  const callerName = updateData.callerName || "there";
                  
                  await transporter.sendMail({
                    from: \`"\${businessName}" <\${fromEmail}>\`,
                    replyTo: businessEmail,
                    to: updateData.callerEmail,
                    subject: "Appointment Confirmation",
                    text: \`Hi \${callerName},\\n\\nYour appointment has been confirmed for \${formattedTime} (\${timezone}).\\n\\nPurpose: \${updateData.bookingPurpose || "Appointment"}\\n\\nThank you!\`,
                    html: \`<p>Hi \${callerName},</p><p>Your appointment has been confirmed for <strong>\${formattedTime} (\${timezone})</strong>.</p><p>Purpose: \${updateData.bookingPurpose || "Appointment"}</p><p>Thank you!</p>\`
                  });
                  console.log(\`[Server] Sent confirmation email to \${updateData.callerEmail}\`);
                } catch (emailError) {
                  console.error(\`[Server] Failed to send confirmation email to \${updateData.callerEmail}:\`, emailError);
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
                
                console.log(\`[Server] Scheduled follow-up for call \${callId} at \${followUpDate.toISOString()}\`);
              } catch (followUpError) {
                console.error(\`[Server] Failed to schedule follow-up for call \${callId}:\`, followUpError);
              }
            }

            console.log(\`[Server] Successfully processed call \${callId}\`);
          } catch (error) {
            console.error(\`[Server] Error processing call \${callId}:\`, error);
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
                  console.warn(\`[Server] FollowUp: Missing Botcake credentials or follow-up disabled for business \${businessId}\`);
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

              console.log(\`[Server] Sending Botcake follow-up for call \${callId} to PSID \${psid}...\`);

              // Botcake Utility Message API with Template
              const response = await fetch(\`https://botcake.io/api/v1/pages/\${businessData.botcakePageId}/messages\`, {
                method: "POST",
                headers: {
                  "Authorization": \`Bearer \${businessData.botcakeApiKey}\`,
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
                console.error(\`[Server] Botcake follow-up failed for \${callId}:\`, errText);
                continue;
              }

              // Mark as sent
              await setDoc(callDoc.ref, {
                followUpSent: true,
                followUpSentAt: serverTimestamp()
              }, { merge: true });

              console.log(\`[Server] Successfully sent Botcake follow-up for call \${callId}\`);
            } catch (err) {
              console.error(\`[Server] Error processing follow-up for call \${callId}:\`, err);
            }
          }
        }
      } catch (error: any) {
        console.error(\`[Server] FollowUpProcessor Interval Error:\`, error.message || error);
      }
    }, 60000); // Every minute
  };

  runProcessor();
}
`;
  const newContent = serverFile.substring(0, startIdx) + replacement + serverFile.substring(endIdx);
  fs.writeFileSync('server.ts', newContent, 'utf-8');
  console.log('Successfully replaced processors');
} else {
  console.log('Could not find start or end index');
}
