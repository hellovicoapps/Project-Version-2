import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  getDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  Clock, 
  Calendar, 
  MessageSquare, 
  Phone, 
  User, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Bot
} from "lucide-react";
import { Logo } from "../components/Logo";
import { Business, CallStatus } from "../types";

export default function CallStatusPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [searchParams] = useSearchParams();
  const psid = searchParams.get("psid");
  
  const [loading, setLoading] = useState(true);
  const [call, setCall] = useState<any>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;

    // Fetch business info for branding
    const fetchBusiness = async () => {
      try {
        const businessDoc = await getDoc(doc(db, "businesses", businessId));
        if (businessDoc.exists()) {
          setBusiness({ id: businessDoc.id, ...businessDoc.data() } as Business);
        }
      } catch (err) {
        console.error("Error fetching business:", err);
      }
    };

    fetchBusiness();
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !psid) {
      setLoading(false);
      if (!businessId) setError("Invalid link: Business ID is missing.");
      else if (!psid) setError("No caller ID provided.");
      return;
    }

    const callsRef = collection(db, `businesses/${businessId}/calls`);
    const q = query(
      callsRef,
      where("psid", "==", psid),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setCall({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
        setError(null);
      } else {
        setCall(null);
        setError("No recent call found for this ID.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching call status:", err);
      handleFirestoreError(err, OperationType.GET, `businesses/${businessId}/calls`);
      setError("Failed to load call status.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [businessId, psid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] animate-pulse">Loading call result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--text-main)]">Oops!</h2>
            <p className="text-[var(--text-muted)]">{error}</p>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            If you just finished a call, please wait a moment and refresh this page.
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case CallStatus.BOOKED: return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case CallStatus.INQUIRY: return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case CallStatus.COMPLAINT: return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      case CallStatus.FOLLOW_UP: return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-[var(--text-muted)] bg-[var(--bg-card)] border-[var(--border-main)]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case CallStatus.BOOKED: return <CheckCircle className="w-5 h-5" />;
      case CallStatus.INQUIRY: return <MessageSquare className="w-5 h-5" />;
      case CallStatus.COMPLAINT: return <AlertCircle className="w-5 h-5" />;
      case CallStatus.FOLLOW_UP: return <Clock className="w-5 h-5" />;
      default: return <Phone className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center p-6 md:p-12">
      {/* Branding */}
      <div className="mb-12 flex flex-col items-center space-y-4">
        {business?.logoUrl ? (
          <img 
            src={business.logoUrl} 
            alt={business.name} 
            className="w-20 h-20 rounded-2xl object-cover shadow-lg border border-[var(--border-main)]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-20 h-20 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center border border-[var(--brand-primary)]/20 shadow-lg">
            <Logo iconSize={40} />
          </div>
        )}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">{business?.name || "Call Result"}</h1>
          <p className="text-[var(--text-muted)] text-sm">AI Voice Assistant Summary</p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full space-y-6"
      >
        {/* Main Status Card */}
        <div className="glass-card overflow-hidden card-hover">
          <div className="p-8 space-y-8">
            {/* Call Status Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl border ${getStatusColor(call.status)}`}>
                  {getStatusIcon(call.status)}
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Call Outcome</p>
                  <h2 className="text-xl font-bold text-[var(--text-main)]">
                    {call.status === "PENDING_PROCESSING" ? "Processing Result..." : call.status}
                  </h2>
                </div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">Call Date</p>
                <p className="text-[var(--text-main)] font-medium">
                  {call.createdAt?.toDate ? new Date(call.createdAt.toDate()).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : "Just now"}
                </p>
              </div>
            </div>

            {/* Processing State */}
            {call.status === "PENDING_PROCESSING" && (
              <div className="p-6 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/10 rounded-2xl flex items-center space-x-4">
                <div className="w-5 h-5 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--brand-primary)] font-medium">
                  Our AI is currently analyzing your call to generate a summary. This usually takes less than a minute.
                </p>
              </div>
            )}

            {/* Summary Section */}
            {call.summary && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-[var(--text-muted)]">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">AI Summary</span>
                </div>
                <div className="p-6 bg-[var(--bg-card-hover)]/50 border border-[var(--border-main)] rounded-2xl">
                  <p className="text-[var(--text-main)] leading-relaxed italic">
                    "{call.summary}"
                  </p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl space-y-1">
                <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest">Duration</p>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span className="text-[var(--text-main)] font-medium">{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                </div>
              </div>
              
              {call.bookingTime && (
                <div className="p-4 bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl space-y-1">
                  <p className="text-[var(--brand-primary)] text-[10px] font-bold uppercase tracking-widest">Appointment</p>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span className="text-[var(--text-main)] font-medium">
                      {new Date(call.bookingTime).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-6 bg-[var(--bg-card)] border-t border-[var(--border-main)] flex items-center justify-between">
            <p className="text-[var(--text-muted)] text-xs">
              This result was automatically generated by Vico AI.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="text-[var(--brand-primary)] text-xs font-bold flex items-center space-x-1 hover:underline"
            >
              <span>Refresh</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="p-4 glass-card flex items-center justify-between group cursor-pointer hover:border-[var(--brand-primary)]/30 transition-all card-hover">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-main)]">Go back to Messenger to continue</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors" />
            </div>
          </div>
        </div>
      </motion.div>

      <footer className="mt-auto pt-12 pb-8 text-center">
        <p className="text-[var(--text-muted)] text-xs">
          Powered by <span className="text-[var(--brand-primary)] font-bold">Vico AI</span>
        </p>
      </footer>
    </div>
  );
}
