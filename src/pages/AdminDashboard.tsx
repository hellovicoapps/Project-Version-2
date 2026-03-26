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
  Zap,
  MoreVertical,
  Edit2,
  Key,
  Ban,
  Trash2,
  CheckCircle2,
  XCircle,
  X
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
import { Business, Agent, SubscriptionPlan } from "../types";
import { AuthService } from "../services/authService";
import { AdminService } from "../services/adminService";
import { Navigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { getElevenLabsService } from "../services/elevenlabsService";
import { useToast } from "../components/Toast";
import { AnimatePresence } from "framer-motion";
import { ConfirmModal } from "../components/ConfirmModal";

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  
  // Modal states
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [changingPassword, setChangingPassword] = useState<Business | null>(null);
  const [deletingBusiness, setDeletingBusiness] = useState<Business | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

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
                Today's date is {{current_date}}.
                The current time is {{current_time}}.
                The dates for the upcoming 7 days are: {{upcoming_days}}.
                User ID: {{user_id}}.
                Business ID: {{business_id}}.
                Business Name: {{business_name}}.
                Call Source: {{call_source}}.
                Use this information to accurately resolve relative dates like "today", "tomorrow", "this Monday", or "next week".
                
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

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;
    
    setIsSubmitting(true);
    try {
      await AdminService.updateUser(editingBusiness.id, {
        plan: editingBusiness.plan,
        totalMinutes: Number(editingBusiness.totalMinutes),
        usedMinutes: Number(editingBusiness.usedMinutes),
        name: editingBusiness.name,
        disabled: !!editingBusiness.disabled
      });
      showToast("User updated successfully", "success");
      setEditingBusiness(null);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingPassword || !newPassword) return;
    
    setIsSubmitting(true);
    try {
      await AdminService.changePassword(changingPassword.id, newPassword);
      showToast("Password changed successfully", "success");
      setChangingPassword(null);
      setNewPassword("");
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (business: Business) => {
    try {
      await AdminService.toggleStatus(business.id, !business.disabled);
      showToast(`User ${business.disabled ? "enabled" : "disabled"} successfully`, "success");
    } catch (error: any) {
      showToast(error.message, "error");
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingBusiness) return;
    
    setIsSubmitting(true);
    try {
      await AdminService.deleteUser(deletingBusiness.id);
      showToast("User deleted successfully", "success");
      setDeletingBusiness(null);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[var(--brand-primary)] mb-2">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Admin Control Panel</span>
          </div>
          <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">System Overview</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage all businesses and monitor system-wide usage.</p>
        </div>
        <div className="flex items-center space-x-3">
          {isSyncing && (
            <span className="text-xs font-medium text-[var(--brand-primary)] animate-pulse">{syncProgress}</span>
          )}
          <button
            onClick={() => setShowConfirmSync(true)}
            disabled={isSyncing || loading}
            className="px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--text-muted)] transition-all text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
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
            <div className="p-3 bg-[var(--brand-primary)]/10 rounded-xl border border-[var(--brand-primary)]/20">
              <Building2 className="w-6 h-6 text-[var(--brand-primary)]" />
            </div>
          </div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Total Businesses</p>
          <h3 className="text-3xl font-bold text-[var(--text-main)] mt-1">{totalBusinesses}</h3>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[var(--color-accent)]/10 rounded-xl border border-[var(--color-accent)]/20">
              <Clock className="w-6 h-6 text-[var(--color-accent)]" />
            </div>
          </div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Total Minutes Used</p>
          <h3 className="text-3xl font-bold text-[var(--text-main)] mt-1">{Math.round(totalMinutes)}</h3>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-[var(--color-success)]/10 rounded-xl border border-[var(--color-success)]/20">
              <Users className="w-6 h-6 text-[var(--color-success)]" />
            </div>
          </div>
          <p className="text-[var(--text-muted)] text-sm font-medium">Active Users</p>
          <h3 className="text-3xl font-bold text-[var(--text-main)] mt-1">{totalBusinesses}</h3>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--border-main)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Business Directory</h3>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input 
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-2 pl-10 pr-4 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-card)]/30">
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Business</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Usage</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">Loading businesses...</td>
                </tr>
              ) : filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">No businesses found.</td>
                </tr>
              ) : (
                filteredBusinesses.map((b) => (
                  <tr key={b.id} className="hover:bg-[var(--bg-card-hover)]/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-muted)]">
                          {b.logoUrl ? (
                            <img src={b.logoUrl} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                          ) : (
                            <Building2 className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-main)]">{b.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">{b.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.plan === "SCALE" ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20" :
                        b.plan === "GROWTH" ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20" :
                        "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-main)]"
                      }`}>
                        {b.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-medium">
                          <span className="text-[var(--text-muted)]">{Math.round(b.usedMinutes || 0)} / {b.totalMinutes} min</span>
                          <span className="text-[var(--text-muted)]">{Math.round(((b.usedMinutes || 0) / (b.totalMinutes || 60)) * 100)}%</span>
                        </div>
                        <div className="w-32 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              (b.usedMinutes || 0) >= (b.totalMinutes || 60) ? "bg-[var(--color-danger)]" : "bg-[var(--brand-primary)]"
                            }`}
                            style={{ width: `${Math.min(100, ((b.usedMinutes || 0) / (b.totalMinutes || 60)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {b.disabled ? (
                        <div className="flex items-center space-x-1.5 text-[var(--color-danger)]">
                          <Ban className="w-4 h-4" />
                          <span className="text-xs font-medium">Disabled</span>
                        </div>
                      ) : (b.usedMinutes || 0) >= (b.totalMinutes || 60) ? (
                        <div className="flex items-center space-x-1.5 text-[var(--color-danger)]">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs font-medium">Limit Reached</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-[var(--color-success)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                          <span className="text-xs font-medium">Active</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                      {b.createdAt?.toDate ? new Date(b.createdAt.toDate()).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => setEditingBusiness(b)}
                          className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="text-xs font-medium hidden sm:inline">Edit</span>
                        </button>
                        <button 
                          onClick={() => setActiveMenu(activeMenu === b.id ? null : b.id)}
                          className="p-2 hover:bg-[var(--bg-card)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {activeMenu === b.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveMenu(null)} 
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-6 top-12 w-48 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-2xl z-20 overflow-hidden"
                            >
                              <button 
                                onClick={() => {
                                  setEditingBusiness(b);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center space-x-2 hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-main)]"
                              >
                                <Edit2 className="w-4 h-4 text-blue-400" />
                                <span>Edit User</span>
                              </button>
                              <button 
                                onClick={() => {
                                  setChangingPassword(b);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center space-x-2 hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-main)]"
                              >
                                <Key className="w-4 h-4 text-amber-400" />
                                <span>Change Password</span>
                              </button>
                              <button 
                                onClick={() => {
                                  handleToggleStatus(b);
                                  setActiveMenu(null);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm flex items-center space-x-2 hover:bg-[var(--bg-card-hover)] transition-colors ${b.disabled ? "text-emerald-400" : "text-rose-400"}`}
                              >
                                {b.disabled ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                <span>{b.disabled ? "Enable User" : "Disable User"}</span>
                              </button>
                              <div className="border-t border-[var(--border-main)]" />
                              <button 
                                onClick={() => {
                                  setDeletingBusiness(b);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm flex items-center space-x-2 hover:bg-rose-500/10 text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete User</span>
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingBusiness && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingBusiness(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                <h3 className="text-xl font-bold text-[var(--text-main)]">Edit User Settings</h3>
                <button onClick={() => setEditingBusiness(null)} className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors">
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>
              <form onSubmit={handleUpdateUser} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-[var(--brand-primary)]">
                    <Building2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">General Information</span>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Business Name</label>
                    <input 
                      type="text"
                      value={editingBusiness.name}
                      onChange={(e) => setEditingBusiness({ ...editingBusiness, name: e.target.value })}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Email Address (Read-only)</label>
                    <input 
                      type="email"
                      value={editingBusiness.email}
                      disabled
                      className="w-full bg-[var(--bg-main)]/50 border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-muted)] cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--border-main)]">
                  <div className="flex items-center space-x-2 text-[var(--color-accent)]">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Subscription & Usage</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Plan</label>
                      <select 
                        value={editingBusiness.plan}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, plan: e.target.value as SubscriptionPlan })}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
                      >
                        {Object.values(SubscriptionPlan).map(plan => (
                          <option key={plan} value={plan}>{plan}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Total Minutes</label>
                      <input 
                        type="number"
                        value={editingBusiness.totalMinutes}
                        onChange={(e) => setEditingBusiness({ ...editingBusiness, totalMinutes: Number(e.target.value) })}
                        className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Used Minutes</label>
                    <input 
                      type="number"
                      value={Math.round(editingBusiness.usedMinutes || 0)}
                      onChange={(e) => setEditingBusiness({ ...editingBusiness, usedMinutes: Number(e.target.value) })}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-[var(--border-main)]">
                  <div className="flex items-center space-x-2 text-[var(--color-danger)]">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Account Security</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)]">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-main)]">Account Status</p>
                      <p className="text-xs text-[var(--text-muted)]">{editingBusiness.disabled ? "Account is currently disabled" : "Account is active"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingBusiness({ ...editingBusiness, disabled: !editingBusiness.disabled })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        editingBusiness.disabled 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20"
                      }`}
                    >
                      {editingBusiness.disabled ? "Enable" : "Disable"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(editingBusiness);
                      setEditingBusiness(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-500 text-sm font-medium hover:bg-amber-500/10 transition-all flex items-center justify-center space-x-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>Change User Password</span>
                  </button>
                </div>

                <div className="pt-6 flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setEditingBusiness(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] text-zinc-950 text-sm font-bold hover:bg-[var(--brand-primary)]/90 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save All Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {changingPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setChangingPassword(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between">
                <h3 className="text-xl font-bold text-[var(--text-main)]">Change Password</h3>
                <button onClick={() => setChangingPassword(null)} className="p-2 hover:bg-[var(--bg-main)] rounded-lg transition-colors">
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <p className="text-sm text-[var(--text-muted)]">
                  Enter a new password for <span className="font-bold text-[var(--text-main)]">{changingPassword.email}</span>.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">New Password</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50"
                    required
                    minLength={6}
                  />
                </div>
                <div className="pt-4 flex space-x-3">
                  <button 
                    type="button"
                    onClick={() => setChangingPassword(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-main)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || !newPassword}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-zinc-950 text-sm font-bold hover:bg-amber-400 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? "Changing..." : "Update Password"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!deletingBusiness}
        onClose={() => setDeletingBusiness(null)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${deletingBusiness?.name}? This will permanently remove their account and all associated data. This action cannot be undone.`}
        confirmText="Delete Permanently"
        type="danger"
      />
    </div>
  );
}
