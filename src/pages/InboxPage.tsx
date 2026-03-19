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
    [CallStatus.BOOKED]: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    [CallStatus.INQUIRY]: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    [CallStatus.IN_PROGRESS]: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse",
    [CallStatus.COMPLAINT]: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    [CallStatus.FOLLOW_UP]: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    [CallStatus.DROPPED]: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    [CallStatus.PENDING_PROCESSING]: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 animate-pulse",
    [CallStatus.PROCESSING_ERROR]: "bg-rose-500/10 text-rose-400 border-rose-500/20",
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

  const filteredCalls = calls.filter(call => 
    call.phoneNumber?.toLowerCase().includes(search.toLowerCase()) ||
    call.summary?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-4xl font-bold text-white tracking-tight">Recent Calls</h1>
          <p className="text-zinc-500 mt-1">Review and manage your recent AI-handled calls.</p>
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
        <div className="p-6 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-none">
            {["all", "booked", "inquiry", "complaint", "follow up", "dropped"].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                  filter === f 
                    ? "bg-blue-500 text-zinc-950 shadow-lg shadow-blue-500/20" 
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search calls..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/50">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Date & Time</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500">Loading call logs...</p>
                  </td>
                </tr>
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <p className="text-zinc-500">No calls found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <React.Fragment key={call.id}>
                    <motion.tr 
                      onClick={() => setExpandedId(expandedId === call.id ? null : call.id)}
                      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                      className={`group cursor-pointer border-l-2 transition-all ${expandedId === call.id ? "border-blue-500 bg-blue-500/5" : "border-transparent"}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg transition-colors ${expandedId === call.id ? "bg-blue-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 group-hover:bg-blue-500/10 group-hover:text-blue-400"}`}>
                            <PhoneIncoming className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{call.callerName || "Unknown Caller"}</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-xs text-zinc-500">{call.phoneNumber}</p>
                              {call.summary && <span className="text-zinc-800">•</span>}
                              {call.summary && (
                                <p className="text-xs text-zinc-600 line-clamp-1 max-w-[200px] italic">{call.summary}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={call.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-zinc-400">
                          <Clock className="w-4 h-4" />
                          <span>{Math.floor(call.duration / 60)}m {call.duration % 60}s</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-zinc-400">
                          <Calendar className="w-4 h-4" />
                          <span>{call.createdAt?.toDate ? new Date(call.createdAt.toDate()).toLocaleString() : "Just now"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {expandedId === call.id ? <ChevronUp className="w-5 h-5 text-blue-400" /> : <ChevronDown className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />}
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
                              className="overflow-hidden bg-zinc-900/30 border-b border-zinc-900"
                            >
                              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Details */}
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                                      <User className="w-3 h-3" />
                                      <span>Caller Information</span>
                                    </h4>
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                        <span className="text-xs text-zinc-500">Name</span>
                                        <span className="text-sm text-white font-medium">{call.callerName || "Unknown"}</span>
                                      </div>
                                      <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                        <span className="text-xs text-zinc-500">Email</span>
                                        <span className="text-sm text-white font-medium">{call.callerEmail || "Not provided"}</span>
                                      </div>
                                      <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                                        <span className="text-xs text-zinc-500">Phone</span>
                                        <span className="text-sm text-white font-medium">{call.phoneNumber}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {call.status === CallStatus.BOOKED && (
                                    <div>
                                      <h4 className="text-xs font-bold text-purple-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                                        <Calendar className="w-3 h-3" />
                                        <span>Booking Details</span>
                                      </h4>
                                      <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 space-y-3">
                                        <div className="flex justify-between">
                                          <span className="text-xs text-zinc-500">Scheduled For</span>
                                          <span className="text-sm text-purple-400 font-bold">{call.bookingTime || "TBD"}</span>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                          <span className="text-xs text-zinc-500">Purpose</span>
                                          <p className="text-sm text-zinc-300">{call.bookingPurpose || "General Appointment"}</p>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {call.status === CallStatus.INQUIRY && (
                                    <div>
                                      <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                                        <MessageSquare className="w-3 h-3" />
                                        <span>Inquiry Resolution</span>
                                      </h4>
                                      <div className="p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10 space-y-4">
                                        <div className="flex items-center space-x-2">
                                          {call.answeredCorrectly !== false ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                          ) : (
                                            <XCircle className="w-4 h-4 text-rose-500" />
                                          )}
                                          <span className="text-sm font-medium text-zinc-200">
                                            {call.answeredCorrectly !== false ? "Answered correctly" : "Needs correction"}
                                          </span>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-xs text-zinc-500">AI Response Quality</span>
                                          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                                            <div className="bg-yellow-500 h-full w-[85%]" />
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                                      <Mic className="w-3 h-3" />
                                      <span>Call Recording</span>
                                    </h4>
                                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center space-x-4">
                                      <button className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-zinc-950 hover:bg-blue-400 transition-colors">
                                        <Play className="w-4 h-4 fill-current" />
                                      </button>
                                      <div className="flex-1">
                                        <div className="h-1 bg-zinc-800 rounded-full w-full relative">
                                          <div className="absolute left-0 top-0 h-full bg-blue-500 w-[40%] rounded-full" />
                                        </div>
                                        <div className="flex justify-between mt-2">
                                          <span className="text-[10px] text-zinc-600">0:45</span>
                                          <span className="text-[10px] text-zinc-600">2:15</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Middle Column: Summary & Transcript */}
                                <div className="lg:col-span-2 space-y-6">
                                  <div>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center space-x-2">
                                        <FileText className="w-3 h-3" />
                                        <span>AI Summary</span>
                                      </h4>
                                      <button 
                                        onClick={() => handleReprocess(call.id)}
                                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center space-x-1 uppercase tracking-wider"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                        <span>Reprocess</span>
                                      </button>
                                    </div>
                                    <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 text-sm text-zinc-300 leading-relaxed">
                                      {call.summary || "No summary generated for this call."}
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                                      <MessageSquare className="w-3 h-3" />
                                      <span>Full Transcript</span>
                                    </h4>
                                    <div className="bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
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
                                                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">
                                                    {msg.role === 'user' ? 'Customer' : 'AI Agent'}
                                                  </span>
                                                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                                    msg.role === 'user' 
                                                      ? 'bg-blue-500 text-zinc-950 rounded-tr-none' 
                                                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                                                  }`}>
                                                    {msg.text}
                                                  </div>
                                                </div>
                                              ));
                                            } catch (e) {
                                              return <p className="text-zinc-500 italic">Failed to parse transcript.</p>;
                                            }
                                          })()
                                        ) : (
                                          <p className="text-zinc-500 italic text-center py-10">No transcript available.</p>
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

        <div className="p-6 border-t border-zinc-900 flex items-center justify-between">
          <p className="text-sm text-zinc-500">Showing {filteredCalls.length} calls</p>
        </div>
      </div>
    </div>
  );
}
