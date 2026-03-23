import { useEffect, useRef } from "react";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc,
  doc,
  increment,
  serverTimestamp,
  getDocs,
  getDoc,
  setDoc,
  limit,
  runTransaction
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getGeminiService } from "../services/geminiService";
import { CallStatus } from "../types";
import { AuthService } from "../services/authService";

export const BookingProcessor = () => {
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;
  const processingIds = useRef(new Set<string>());

  useEffect(() => {
    if (!businessId) return;

    console.log(`[BookingProcessor] Starting listener for business ${businessId}`);

    const q = query(
      collection(db, `businesses/${businessId}/calls`),
      where("status", "==", "PENDING_PROCESSING")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) return;
      
      const gemini = await getGeminiService();
      if (!gemini) {
        console.warn("[BookingProcessor] Gemini service not available");
        return;
      }

      // Use docChanges to only process new/modified pending calls
      for (const change of snapshot.docChanges()) {
        if (change.type === "added" || change.type === "modified") {
          const callDoc = change.doc;
          const callId = callDoc.id;
          const callData = callDoc.data();
          
          // Guard against multiple processing in this instance
          if (callData.status !== "PENDING_PROCESSING" || callData.processed) continue;
          if (processingIds.current.has(callId)) continue;
          
          try {
            // Fetch business timezone
            const businessSnap = await getDoc(doc(db, "businesses", businessId));
            const businessData = businessSnap.data();
            const timezone = businessData?.timezone || "UTC";

            // Use a transaction to "lock" the document for processing
            // This prevents multiple tabs from processing the same call
            await runTransaction(db, async (transaction) => {
              const freshDoc = await transaction.get(callDoc.ref);
              if (!freshDoc.exists()) return;
              const freshData = freshDoc.data();
              
              // If already processed or being processed by another tab, abort
              // The transaction ensures we're looking at the most current data
              if (freshData.status !== "PENDING_PROCESSING" || freshData.processingStarted || freshData.processed) {
                throw new Error("Already processing or processed");
              }
              
              // Mark as processing
              transaction.update(callDoc.ref, { 
                processingStarted: true,
                processingStartedAt: serverTimestamp()
              });
            });

            // If we're here, we successfully "locked" the document
            processingIds.current.add(callId);
            console.log(`[BookingProcessor] Processing call ${callId}...`);

            if (!callData.transcript || callData.transcript.trim().length < 10) {
              console.warn(`[BookingProcessor] Skipping call ${callId} - transcript too short or missing`);
              await updateDoc(callDoc.ref, { 
                status: CallStatus.COMPLETED,
                processed: true,
                processedAt: serverTimestamp(),
                summary: "Transcript too short or missing"
              });
              processingIds.current.delete(callId);
              continue;
            }

            // 1. Extract data using Gemini
            const result = await gemini.processTranscript(callData.transcript || "", timezone);
            console.log(`[BookingProcessor] Gemini result for ${callId}:`, result);

            // Prepare single update for the call
            const updateData: any = {
              summary: result.summary,
              status: (result.status as CallStatus) || CallStatus.COMPLETED,
              processedAt: serverTimestamp(),
              processed: true,
            };

            let callerName = callData.callerName;
            let phoneNumber = callData.phoneNumber;
            let callerEmail = callData.callerEmail;

            if (result.bookingDetails) {
              if (result.bookingDetails.name && result.bookingDetails.name !== "null") {
                updateData.callerName = result.bookingDetails.name;
                callerName = result.bookingDetails.name;
              }
              if (result.bookingDetails.phone && result.bookingDetails.phone !== "null") {
                updateData.phoneNumber = result.bookingDetails.phone;
                phoneNumber = result.bookingDetails.phone;
              }
              if (result.bookingDetails.email && result.bookingDetails.email !== "null") {
                updateData.callerEmail = result.bookingDetails.email;
                callerEmail = result.bookingDetails.email;
              }
              if (result.bookingDetails.dateTime && result.bookingDetails.dateTime !== "null") updateData.bookingTime = result.bookingDetails.dateTime;
              if (result.bookingDetails.purpose && result.bookingDetails.purpose !== "null") updateData.bookingPurpose = result.bookingDetails.purpose;
            }

            // Perform the main call update ONCE
            await updateDoc(callDoc.ref, updateData);
            
            // Send confirmation email if booked
            if (updateData.status === CallStatus.BOOKED && callerEmail && updateData.bookingTime) {
              try {
                const hasOffset = /(Z|[+-]\d{2}:\d{2})$/.test(updateData.bookingTime);
                const bookingDate = hasOffset ? new Date(updateData.bookingTime) : fromZonedTime(updateData.bookingTime, timezone);
                const formattedTime = formatInTimeZone(bookingDate, timezone, "MMMM d, yyyy 'at' h:mm a");
                const idToken = await auth.currentUser?.getIdToken();
                await fetch("/api/send-email", {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                  },
                  body: JSON.stringify({
                    to: callerEmail,
                    subject: "Appointment Confirmation",
                    text: `Hi ${callerName || "there"},\n\nYour appointment has been confirmed for ${formattedTime} (${timezone}).\n\nPurpose: ${updateData.bookingPurpose || "Appointment"}\n\nThank you!`,
                    html: `<p>Hi ${callerName || "there"},</p><p>Your appointment has been confirmed for <strong>${formattedTime} (${timezone})</strong>.</p><p>Purpose: ${updateData.bookingPurpose || "Appointment"}</p><p>Thank you!</p>`
                  })
                });
                console.log(`BookingProcessor: Sent confirmation email to ${callerEmail}`);
              } catch (emailError) {
                console.error(`BookingProcessor: Failed to send confirmation email to ${callerEmail}:`, emailError);
              }
            }

            // CRM Integration: Update or Create Contact
            if (phoneNumber && phoneNumber !== "Unknown") {
              try {
                const contactsRef = collection(db, `businesses/${businessId}/contacts`);
                const contactQuery = query(contactsRef, where("phone", "==", phoneNumber), limit(1));
                const contactSnapshot = await getDocs(contactQuery);
                
                const contactStatus = result.status === CallStatus.BOOKED ? "BOOKED" : "INQUIRED";
                const contactData: any = {
                  name: (callerName && callerName !== "null") ? callerName : "Unknown",
                  phone: phoneNumber,
                  email: (callerEmail && callerEmail !== "null") ? callerEmail : "",
                  status: contactStatus,
                  businessId: businessId,
                  lastCallId: callDoc.id,
                  lastCallSummary: result.summary,
                  updatedAt: serverTimestamp(),
                  createdAt: serverTimestamp(), // Will be merged if exists
                };

                if (!contactSnapshot.empty) {
                  const contactDoc = contactSnapshot.docs[0];
                  const { createdAt, ...updateContactData } = contactData;
                  await updateDoc(contactDoc.ref, updateContactData);
                  console.log(`BookingProcessor: Updated contact ${contactDoc.id}`);
                } else {
                  const newContactRef = doc(contactsRef);
                  await setDoc(newContactRef, contactData);
                  console.log(`BookingProcessor: Created new contact ${newContactRef.id}`);
                }
              } catch (contactError) {
                console.error(`BookingProcessor: Error creating/updating contact for call ${callDoc.id}:`, contactError);
              }
            }

            // Deduct credits
            try {
              const businessRef = doc(db, "businesses", businessId);
              const minutesUsed = Math.max(0.1, (callData.duration || 0) / 60);
              await updateDoc(businessRef, {
                usedMinutes: increment(minutesUsed)
              });
              console.log(`BookingProcessor: Updated business minutes for ${businessId}`);
            } catch (businessError) {
              console.error(`BookingProcessor: Error updating business minutes for ${businessId}:`, businessError);
            }

            console.log(`BookingProcessor: Successfully processed call ${callDoc.id}`);
          } catch (error) {
            if (error instanceof Error && error.message === "Already processing or processed") {
              console.log(`[BookingProcessor] Call ${callDoc.id} is already being handled elsewhere.`);
              return;
            }

            console.error(`BookingProcessor: Error processing call ${callDoc.id}:`, error);
            try {
              await updateDoc(callDoc.ref, { 
                status: "PROCESSING_ERROR",
                processed: true,
                processingError: error instanceof Error ? error.message : String(error)
              });
            } catch (e) {
              console.error("BookingProcessor: Failed to mark call as failed:", e);
            }
          } finally {
            processingIds.current.delete(callDoc.id);
          }
        }
      }
    }, (error) => {
      console.error("BookingProcessor: Snapshot error:", error);
    });

    return () => unsubscribe();
  }, [businessId]);

  return null;
};
