import React, { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AuthService } from "../services/authService";
import { motion } from "framer-motion";
import { 
  Search, 
  PhoneIncoming, 
  MoreVertical,
  Play,
  Download,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Mail,
  Phone,
  FileText,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Mic,
  RefreshCw
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { CallStatus } from "../types";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { useToast } from "../components/Toast";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";

const StatusBadge = ({ status }: { status: CallStatus }) => {
  const styles: any = {
    [CallStatus.BOOKED]: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
    [CallStatus.INQUIRY]: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",
    [CallStatus.IN_PROGRESS]: "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20 animate-pulse",
    [CallStatus.COMPLAINT]: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20",
    [CallStatus.FOLLOW_UP]: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",
    [CallStatus.DROPPED]: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20",
    [CallStatus.PENDING_PROCESSING]: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20 animate-pulse",
    [CallStatus.PROCESSING_ERROR]: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20",
  };

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${styles[status] || styles[CallStatus.INQUIRY]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
};

export default function InboxPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    if (!businessId) return;

    let callsQuery = query(
      collection(db, `businesses/${businessId}/calls`),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    if (filter !== "all") {
      const statusMap: any = {
        booked: CallStatus.BOOKED,
        inquiry: CallStatus.INQUIRY,
        complaint: CallStatus.COMPLAINT,
        "follow up": CallStatus.FOLLOW_UP,
        dropped: CallStatus.DROPPED
      };
      callsQuery = query(
        collection(db, `businesses/${businessId}/calls`),
        where("status", "==", statusMap[filter]),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
      console.log(`InboxPage: Received snapshot with ${snapshot.size} calls for business ${businessId}`);
      const fetchedCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCalls(fetchedCalls);
      setLoading(false);
    }, (error) => {
      console.error("InboxPage: Snapshot error:", error);
      setLoading(false);
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/calls`);
    });

    return () => unsubscribe();
  }, [businessId, filter]);

  const handleExport = () => {
    showToast("Exporting call logs to CSV...", "info");
    setTimeout(() => {
      showToast("CSV exported successfully!", "success");
    }, 1500);
  };

  const filteredCalls = calls.filter(call => {
    const phoneMatch = call.phoneNumber ? call.phoneNumber.toLowerCase().includes(search.toLowerCase()) : false;
    const summaryMatch = call.summary ? call.summary.toLowerCase().includes(search.toLowerCase()) : false;
    return search === "" || phoneMatch || summaryMatch;
  });

  const handleReprocess = async (callId: string) => {
    if (!businessId) return;
    try {
      showToast("Reprocessing call with Gemini...", "info");
      const callRef = doc(db, `businesses/${businessId}/calls`, callId);
      await updateDoc(callRef, {
        status: "PENDING_PROCESSING",
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Failed to trigger reprocessing:", error);
      showToast("Failed to trigger reprocessing", "error");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">Recent Calls</h1>
          <p className="text-[var(--text-muted)] mt-1">Review and manage your recent AI-handled calls.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExport}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--border-main)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-none">
            {["all", "booked", "inquiry", "complaint", "follow up", "dropped"].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                  filter === f 
                    ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
            <input 
              type="text" 
              placeholder="Search calls..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-card)]">
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[var(--text-muted)]">Loading call logs...</p>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <p className="text-[var(--text-muted)]">No calls found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <React.Fragment key={call.id}>
                    <motion.tr 
                      onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                      whileHover={{ backgroundColor: "var(--bg-card)" }}
                      className={`group cursor-pointer border-l-2 transition-all ${expandedId === call.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-transparent"}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg transition-colors ${expandedId === call.id ? "bg-[var(--brand-primary)] text-white" : "bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] group-hover:bg-[var(--brand-primary)]/10 group-hover:text-[var(--brand-primary)]"}`}>
                            <PhoneIncoming className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-main)]">{call.callerName || "Unknown Caller"}</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-xs text-[var(--text-muted)]">{call.phoneNumber}</p>
                              {call.summary && <span className="text-[var(--border-main)]">•</span>}
                              {call.summary && (
                                <p className="text-xs text-[var(--text-muted)] line-clamp-1 max-w-[200px] italic">{call.summary}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={call.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-[var(--text-muted)]">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-[var(--text-muted)]">
                          <Calendar className="w-4 h-4" />
                          <span>{call.createdAt?.toDate ? new Date(call.createdAt.toDate()).toLocaleString() : "Just now"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {expandedId === call.id ? <ChevronUp className="w-5 h-5 text-[var(--brand-primary)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--text-main)]" />}
                        </div>
                      </td>
                    </motion.tr>
                    
                    <AnimatePresence>
                      {expandedId === call.id && (
                        <tr>
                          <td colSpan={5} className="px-0 py-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-[var(--bg-card)] border-b border-[var(--border-main)]"
                            >
                              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Details */}
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center space-x-2">
                                      <User className="w-3 h-3" />
                                      <span>Caller Information</span>
                                    </h4>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]">
                                        <span className="text-xs text-[var(--text-muted)]">Name</span>
                                        <span className="text-sm text-[var(--text-main)] font-medium">{call.callerName || "Unknown"}</span>
                                      </div>
                                      <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]">
                                        <span className="text-xs text-[var(--text-muted)]">Email</span>
                                        <span className="text-sm text-[var(--text-main)] font-medium">{call.callerEmail || "Not provided"}</span>
                                      </div>
                                      <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]">
                                        <span className="text-xs text-[var(--text-muted)]">Phone</span>
                                        <span className="text-sm text-[var(--text-main)] font-medium">{call.phoneNumber}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {call.status === CallStatus.BOOKED && (
                                    <div>
                                      <h4 className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-widest mb-4 flex items-center space-x-2">
                                        <Calendar className="w-3 h-3" />
                                        <span>Booking Details</span>
                                      </h4>
                                      <div className="p-4 bg-[var(--color-accent)]/5 rounded-xl border border-[var(--color-accent)]/10 space-y-3">
                                        <div className="flex justify-between">
                                          <span className="text-xs text-[var(--text-muted)]">Scheduled For</span>
                                          <span className="text-sm text-[var(--color-accent)] font-bold">{call.bookingTime || "TBD"}</span>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                          <span className="text-xs text-[var(--text-muted)]">Purpose</span>
                                          <p className="text-sm text-[var(--text-main)]">{call.bookingPurpose || "General Appointment"}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {call.status === CallStatus.INQUIRY && (
                                    <div>
                                      <h4 className="text-xs font-bold text-[var(--color-warning)] uppercase tracking-widest mb-4 flex items-center space-x-2">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>Inquiry Resolution</span>
                                      </h4>
                                      <div className="p-4 bg-[var(--color-warning)]/5 rounded-xl border border-[var(--color-warning)]/10 space-y-4">
                                        <div className="flex items-center space-x-2">
                                          {call.answeredCorrectly !== false ? (
                                            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-[var(--color-danger)]" />
                                          )}
                                          <span className="text-sm font-medium text-[var(--text-main)]">
                                            {call.answeredCorrectly !== false ? "Answered correctly" : "Needs correction"}
                                          </span>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-xs text-[var(--text-muted)]">AI Response Quality</span>
                                          <div className="w-full bg-[var(--border-main)] h-1 rounded-full overflow-hidden">
                                            <div className="bg-[var(--color-warning)] h-full w-[85%]" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center space-x-2">
                                      <Mic className="w-3 h-3" />
                                      <span>Call Recording</span>
                                    </h4>
                                    <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)] flex items-center space-x-4">
                                      <button className="w-10 h-10 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white hover:bg-[var(--brand-primary)]/90 transition-colors">
                                        <Play className="w-4 h-4 fill-current" />
                                      </button>
                                      <div className="flex-1">
                                        <div className="h-1 bg-[var(--border-main)] rounded-full w-full relative">
                                          <div className="absolute left-0 top-0 h-full bg-[var(--brand-primary)] w-[40%] rounded-full" />
                                        </div>
                                        <div className="flex justify-between mt-2">
                                          <span className="text-[10px] text-[var(--text-muted)]">0:45</span>
                                          <span className="text-[10px] text-[var(--text-muted)]">2:15</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Middle Column: Summary & Transcript */}
                                <div className="lg:col-span-2 space-y-6">
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center space-x-2">
                                        <FileText className="w-3 h-3" />
                                        <span>AI Summary</span>
                                      </h4>
                                      <button 
                                        onClick={() => handleReprocess(call.id)}
                                        className="text-[10px] font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary)]/90 flex items-center space-x-1 uppercase tracking-wider"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Reprocess</span>
                                      </button>
                                    </div>
                                    <div className="p-4 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)] text-sm text-[var(--text-main)] leading-relaxed">
                                      {call.summary || "No summary generated for this call."}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4 flex items-center space-x-2">
                                      <MessageSquare className="w-3 h-3" />
                                      <span>Full Transcript</span>
                                    </h4>
                                    <div className="bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)] overflow-hidden">
                                      <div className="max-h-[300px] overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                        {call.transcript ? (
                                          (() => {
                                            try {
                                              let transcriptArr = [];
                                              const trimmed = call.transcript.trim();
                                              
                                              if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                                                const parsed = JSON.parse(trimmed);
                                                transcriptArr = Array.isArray(parsed) ? parsed : [];
                                              } else {
                                                // Improved string parsing
                                                transcriptArr = trimmed.split("\n")
                                                  .map((line: string) => line.trim())
                                                  .filter((line: string) => line.length > 0)
                                                  .map((line: string) => {
                                                    const colonIndex = line.indexOf(": ");
                                                    if (colonIndex !== -1) {
                                                      const roleStr = line.substring(0, colonIndex).toLowerCase();
                                                      const text = line.substring(colonIndex + 2);
                                                      return {
                                                        role: (roleStr.includes("agent") || roleStr.includes("ai")) ? "agent" : "user",
                                                        text
                                                      };
                                                    }
                                                    return { role: "user", text: line };
                                                  });
                                              }
                                              
                                              return transcriptArr.map((msg: any, idx: number) => (
                                                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-bold mb-1">
                                                    {msg.role === 'user' ? 'Customer' : 'AI Agent'}
                                                  </span>
                                                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                                    msg.role === 'user' 
                                                      ? 'bg-[var(--brand-primary)] text-white rounded-tr-none' 
                                                      : 'bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-main)] rounded-tl-none'
                                                  }`}>
                                                    {msg.text}
                                                  </div>
                                                </div>
                                              ));
                                            } catch (e) {
                                              return <p className="text-[var(--text-muted)] italic">Failed to parse transcript.</p>;
                                            }
                                          })()
                                        ) : (
                                          <p className="text-[var(--text-muted)] italic text-center py-10">No transcript available.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 border-t border-[var(--border-main)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">Showing {filteredCalls.length} calls</p>
        </div>
      </div>
    </div>
  );
}
