import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Phone, 
  Clock, 
  Search,
  ArrowUpRight,
  Building2,
  ShieldCheck,
  AlertCircle,
  Zap
} from "lucide-react";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Business, Agent } from "../types";
import { AuthService } from "../services/authService";
import { Navigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { getElevenLabsService } from "../services/elevenlabsService";
import { useToast } from "../components/Toast";

import { ConfirmModal } from "../components/ConfirmModal";

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  const authState = AuthService.getAuthState();
  const { showToast } = useToast();

  // Security check: Only admins can access this page
  if (authState.user?.role !== "admin") {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  const handleSyncAllAgents = async () => {
    setIsSyncing(true);
    setSyncProgress("Initializing...");
    console.log("Admin: Starting global agent sync...");
    
    try {
      const elevenlabsService = await getElevenLabsService();
      if (!elevenlabsService) {
        throw new Error("ElevenLabs API key not configured.");
      }

      let totalUpdated = 0;
      let totalFailed = 0;
      let totalSkipped = 0;

      let currentBusinesses = [...businesses];
      
      // If state is empty, try a fresh fetch to be sure
      if (currentBusinesses.length === 0) {
        setSyncProgress("Fetching businesses...");
        console.log("Admin: State empty, performing fresh fetch of businesses...");
        const q = query(collection(db, "businesses"));
        const snapshot = await getDocs(q);
        currentBusinesses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
      }

      if (currentBusinesses.length === 0) {
        throw new Error("No businesses found in the database. Please ensure businesses are registered first.");
      }

      for (const business of currentBusinesses) {
        setSyncProgress(`Processing ${business.name}...`);
        console.log(`Admin: Syncing agents for business: ${business.name} (${business.id})`);
        
        const agentsRef = collection(db, `businesses/${business.id}/agents`);
        const agentsSnapshot = await getDocs(agentsRef);
        
        if (agentsSnapshot.empty) {
          console.log(`Admin: No agents found for business ${business.name}`);
          continue;
        }

        for (const agentDoc of agentsSnapshot.docs) {
          const agentData = agentDoc.data();
          const agent = { id: agentDoc.id, ...agentData } as Agent;
          
          // Only sync ElevenLabs agents
          if (agent.voiceProvider === "ELEVENLABS" || agent.elevenLabsAgentId) {
            try {
              // Reconstruct instructions (similar to AgentPage.tsx)
              const fullInstructions = `
                DATE AND TIME AWARENESS:
                Current date and time: {{current_time}}.
                User ID: {{user_id}}.
                Business ID: {{business_id}}.
                Business Name: {{business_name}}.
                Call Source: {{call_source}}.
                Use this information to resolve relative dates like "today", "tomorrow", "this Wednesday", or "next week".
                
                CRITICAL INSTRUCTION:
                NEVER output placeholders like "[insert date here]" or "[name]". 
                ALWAYS calculate the actual date or use the information provided. 
                If you are unsure of a specific detail, ask the user for clarification instead of using a placeholder.

                BOOKING INSTRUCTIONS:
                If the user wants to book an appointment, you MUST collect:
                1. Their full name
                2. Their email address
                3. Their phone number
                4. The specific date and time for the booking
                
                CRITICAL: Once you have all these details, you MUST explicitly state: "Your appointment is booked for [date/time]". This is the signal that the booking is complete.
                Confirm these details with the user before ending the call.

                AGENT ROLE AND INSTRUCTIONS:
                ${agent.instructions}
                
                KNOWLEDGE BASE:
                ${agent.knowledgeBase || "No specific knowledge base provided."}
                
                LANGUAGE:
                You MUST respond in English.
              `;

              let agentId = agent.elevenLabsAgentId;
              
              if (!agentId) {
                console.log(`Admin: Creating missing ElevenLabs agent for ${agent.name}`);
                // Use a default voice if the current one isn't an ElevenLabs ID
                const voiceId = agent.voice.length > 15 ? agent.voice : "21m00Tcm4TlvDq8ikWAM"; // Rachel
                agentId = await elevenlabsService.createAgent(agent.name, fullInstructions, voiceId);
              } else {
                console.log(`Admin: Updating ElevenLabs agent ${agentId} for ${agent.name}`);
                try {
                  await elevenlabsService.updateAgent(
                    agentId, 
                    agent.name, 
                    fullInstructions, 
                    agent.voice
                  );
                } catch (updateError: any) {
                  // If agent not found on ElevenLabs, try creating it
                  if (updateError.message?.includes("not found") || updateError.message?.includes("404")) {
                    console.warn(`Admin: Agent ${agentId} not found on ElevenLabs, re-creating...`);
                    const voiceId = agent.voice.length > 15 ? agent.voice : "21m00Tcm4TlvDq8ikWAM";
                    agentId = await elevenlabsService.createAgent(agent.name, fullInstructions, voiceId);
                  } else {
                    throw updateError;
                  }
                }
              }

              // Update Firestore to mark as synced and store the ID
              await setDoc(doc(db, `businesses/${business.id}/agents`, agent.id), {
                elevenLabsAgentId: agentId,
                voiceProvider: "ELEVENLABS",
                lastSyncedAt: serverTimestamp(),
                dataCollectionConfigured: true
              }, { merge: true });

              totalUpdated++;
            } catch (err: any) {
              console.error(`Admin: Failed to sync agent ${agent.id}:`, err);
              totalFailed++;
            }
          } else {
            console.log(`Admin: Skipping non-ElevenLabs agent ${agent.name}`);
            totalSkipped++;
          }
        }
      }

      console.log(`Admin: Sync complete. Updated: ${totalUpdated}, Failed: ${totalFailed}, Skipped: ${totalSkipped}`);
      showToast(`Sync complete! Updated: ${totalUpdated}, Failed: ${totalFailed}`, totalFailed > 0 ? "error" : "success");
    } catch (error: any) {
      console.error("Admin: Global sync failed:", error);
      showToast(error.message || "Global sync failed", "error");
    } finally {
      setIsSyncing(false);
      setSyncProgress("");
    }
  };

  useEffect(() => {
    const q = query(collection(db, "businesses"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
      // Sort in memory to be safe
      const sortedDocs = docs.sort((a, b) => {
        const getTime = (val: any) => {
          if (!val) return 0;
          if (val.seconds) return val.seconds * 1000;
          if (val instanceof Date) return val.getTime();
          if (typeof val === 'number') return val;
          return 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
      setBusinesses(sortedDocs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "businesses");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredBusinesses = businesses.filter(b => 
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalMinutes = businesses.reduce((acc, b) => acc + (b.usedMinutes || 0), 0);
  const totalBusinesses = businesses.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Admin Control Panel</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-zinc-500 mt-1">Manage all businesses and monitor system-wide usage.</p>
        </div>
        <div className="flex items-center space-x-3">
          {isSyncing && (
            <span className="text-xs font-medium text-blue-400 animate-pulse">{syncProgress}</span>
          )}
          <button
            onClick={() => setShowConfirmSync(true)}
            disabled={isSyncing || loading}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync All Agents"}</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirmSync}
        onClose={() => setShowConfirmSync(false)}
        onConfirm={handleSyncAllAgents}
        title="Sync All Agents"
        message="This will update Data Collection settings for ALL ElevenLabs agents across ALL businesses. This process may take a few minutes. Continue?"
        confirmText="Start Sync"
        type="warning"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <Building2 className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-zinc-500 text-sm font-medium">Total Businesses</p>
          <h3 className="text-3xl font-bold text-white mt-1">{totalBusinesses}</h3>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <p className="text-zinc-500 text-sm font-medium">Total Minutes Used</p>
          <h3 className="text-3xl font-bold text-white mt-1">{Math.round(totalMinutes)}</h3>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
          <p className="text-zinc-500 text-sm font-medium">Active Users</p>
          <h3 className="text-3xl font-bold text-white mt-1">{totalBusinesses}</h3>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">Business Directory</h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900/30">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Business</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Usage</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">Loading businesses...</td>
                </tr>
              ) : filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No businesses found.</td>
                </tr>
              ) : (
                filteredBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-900/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500">
                          {b.logoUrl ? (
                            <img src={b.logoUrl} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{b.name}</p>
                          <p className="text-xs text-zinc-500">{b.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.plan === "SCALE" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        b.plan === "GROWTH" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {b.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-medium">
                          <span className="text-zinc-500">{Math.round(b.usedMinutes || 0)} / {b.totalMinutes} min</span>
                          <span className="text-zinc-400">{Math.round(((b.usedMinutes || 0) / (b.totalMinutes || 60)) * 100)}%</span>
                        </div>
                        <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              (b.usedMinutes || 0) >= (b.totalMinutes || 60) ? "bg-rose-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${Math.min(100, ((b.usedMinutes || 0) / (b.totalMinutes || 60)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(b.usedMinutes || 0) >= (b.totalMinutes || 60) ? (
                        <div className="flex items-center space-x-1.5 text-rose-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Limit Reached</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-emerald-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-medium">Active</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {b.createdAt?.toDate ? new Date(b.createdAt.toDate()).toLocaleDateString() : "N/A"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
