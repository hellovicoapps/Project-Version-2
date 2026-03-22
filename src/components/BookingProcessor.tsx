import { useEffect } from "react";
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
  setDoc,
  limit
} from "firebase/firestore";
import { db } from "../firebase";
import { getGeminiService } from "../services/geminiService";
import { CallStatus } from "../types";
import { AuthService } from "../services/authService";

export const BookingProcessor = () => {
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    if (!businessId) return;

    console.log(`BookingProcessor: Starting listener for business ${businessId}`);

    const q = query(
      collection(db, `businesses/${businessId}/calls`),
      where("status", "in", ["PENDING_PROCESSING", "PROCESSING_ERROR"])
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const gemini = await getGeminiService();
      if (!gemini) {
        console.warn("BookingProcessor: Gemini service not available");
        return;
      }

      for (const change of snapshot.docChanges()) {
        if (change.type === "added" || change.type === "modified") {
          const callDoc = change.doc;
          const callData = callDoc.data();
          
          if (callData.status !== "PENDING_PROCESSING" && callData.status !== "PROCESSING_ERROR") continue;

          console.log(`BookingProcessor: Processing call ${callDoc.id}...`);

          if (!callData.transcript || callData.transcript.trim().length < 10) {
            console.warn(`BookingProcessor: Skipping call ${callDoc.id} - transcript too short or missing`);
            await updateDoc(callDoc.ref, { 
              status: CallStatus.COMPLETED,
              processed: true,
              processedAt: serverTimestamp(),
              summary: "Transcript too short or missing"
            });
            continue;
          }

          try {
            const result = await gemini.processTranscript(callData.transcript || "");
            console.log(`BookingProcessor: Gemini result for ${callDoc.id}:`, result);

            const updateData: any = {
              summary: result.summary,
              status: result.status as CallStatus,
              processedAt: serverTimestamp(),
            };

            let callerName = callData.callerName;
            let phoneNumber = callData.phoneNumber;
            let callerEmail = callData.callerEmail;

            if (result.bookingDetails) {
              if (result.bookingDetails.name) {
                updateData.callerName = result.bookingDetails.name;
                callerName = result.bookingDetails.name;
              }
              if (result.bookingDetails.phone) {
                updateData.phoneNumber = result.bookingDetails.phone;
                phoneNumber = result.bookingDetails.phone;
              }
              if (result.bookingDetails.email) {
                updateData.callerEmail = result.bookingDetails.email;
                callerEmail = result.bookingDetails.email;
              }
              if (result.bookingDetails.dateTime) updateData.bookingTime = result.bookingDetails.dateTime;
              if (result.bookingDetails.purpose) updateData.bookingPurpose = result.bookingDetails.purpose;
            }

            await updateDoc(callDoc.ref, updateData);
            
            // CRM Integration: Update or Create Contact
            if (phoneNumber && phoneNumber !== "Unknown") {
              try {
                const contactsRef = collection(db, `businesses/${businessId}/contacts`);
                const contactQuery = query(contactsRef, where("phone", "==", phoneNumber), limit(1));
                const contactSnapshot = await getDocs(contactQuery);
                
                const contactStatus = result.status === CallStatus.BOOKED ? "BOOKED" : "INQUIRED";
                const contactData: any = {
                  name: callerName || "Unknown",
                  phone: phoneNumber,
                  email: callerEmail || "",
                  status: contactStatus,
                  businessId: businessId,
                  lastCallId: callDoc.id,
                  lastCallSummary: result.summary,
                  updatedAt: serverTimestamp(),
                  createdAt: serverTimestamp(), // Will be merged if exists
                };

                if (!contactSnapshot.empty) {
                  const contactDoc = contactSnapshot.docs[0];
                  // Don't overwrite createdAt
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
                // We don't throw here to allow the rest of the processing (like credit deduction) to continue
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

            // Mark call as processed
            try {
              await updateDoc(callDoc.ref, { 
                status: CallStatus.COMPLETED,
                processed: true,
                processedAt: serverTimestamp()
              });
              console.log(`BookingProcessor: Marked call ${callDoc.id} as processed`);
            } catch (callUpdateError) {
              console.error(`BookingProcessor: Error marking call ${callDoc.id} as processed:`, callUpdateError);
            }
          } catch (error) {
            console.error(`BookingProcessor: Error processing call ${callDoc.id}:`, error);
            // Mark as failed to avoid infinite retry loops
            try {
              await updateDoc(callDoc.ref, { 
                status: "PROCESSING_ERROR",
                processed: true,
                processingError: error instanceof Error ? error.message : String(error)
              });
            } catch (e) {
              console.error("BookingProcessor: Failed to mark call as failed:", e);
            }
          }
        }
      }
    }, (error) => {
      console.error("BookingProcessor: Snapshot error:", error);
    });

    return () => unsubscribe();
  }, [businessId]);

  return null; // Headless component
};
