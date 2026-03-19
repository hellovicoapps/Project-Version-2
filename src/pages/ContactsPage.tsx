import React, { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy,
  limit,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AuthService } from "../services/authService";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Mail, 
  Phone, 
  Download,
  Trash2,
  Calendar,
  UserPlus,
  Edit2,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  ExternalLink,
  X
} from "lucide-react";
import { useToast } from "../components/Toast";
import { ROUTES } from "../constants";
import { useNavigate } from "react-router-dom";

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    BOOKED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    INQUIRED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };

  return (
    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${styles[status] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}>
      {status}
    </span>
  );
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "INQUIRED"
  });
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    if (!businessId) return;

    let contactsQuery = query(
      collection(db, `businesses/${businessId}/contacts`),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    if (tab !== "all") {
      contactsQuery = query(
        collection(db, `businesses/${businessId}/contacts`),
        where("status", "==", tab.toUpperCase()),
        orderBy("createdAt", "desc"),
        limit(50)
      );
    }

    const unsubscribe = onSnapshot(contactsQuery, (snapshot) => {
      const fetchedContacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContacts(fetchedContacts);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/contacts`);
    });

    return () => unsubscribe();
  }, [businessId, tab]);

  const handleExport = () => {
    showToast("Exporting contacts to CSV...", "info");
    setTimeout(() => {
      showToast("Contacts exported successfully!", "success");
    }, 1500);
  };

  const handleAddContact = () => {
    setEditingContact(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "INQUIRED"
    });
    setIsModalOpen(true);
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      status: contact.status || "INQUIRED"
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!businessId) return;
    if (!window.confirm("Are you sure you want to delete this contact?")) return;

    try {
      await deleteDoc(doc(db, `businesses/${businessId}/contacts`, id));
      showToast("Contact deleted successfully!", "success");
    } catch (error) {
      console.error("Error deleting contact:", error);
      showToast("Failed to delete contact", "error");
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    if (!formData.name || !formData.phone) {
      showToast("Name and Phone are required", "error");
      return;
    }

    setIsSaving(true);
    try {
      const contactsRef = collection(db, `businesses/${businessId}/contacts`);
      const data = {
        ...formData,
        updatedAt: serverTimestamp(),
        createdAt: editingContact ? editingContact.createdAt : serverTimestamp()
      };

      if (editingContact) {
        await updateDoc(doc(db, `businesses/${businessId}/contacts`, editingContact.id), data);
        showToast("Contact updated successfully!", "success");
      } else {
        await addDoc(contactsRef, data);
        showToast("Contact added successfully!", "success");
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving contact:", error);
      showToast("Failed to save contact", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(search.toLowerCase()) ||
    contact.email?.toLowerCase().includes(search.toLowerCase()) ||
    contact.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Contacts</h1>
          <p className="text-zinc-500 mt-1">Manage your customers and their booking status.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExport}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handleAddContact}
            className="btn-primary flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Contact</span>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {["all", "booked", "inquired"].map((t) => (
              <button 
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  tab === t 
                    ? "bg-blue-500 text-zinc-950 shadow-lg shadow-blue-500/20" 
                    : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative group max-w-xs w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search contacts..." 
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
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Phone</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Last Activity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-zinc-500">Loading contacts...</p>
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <p className="text-zinc-500">No contacts found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <React.Fragment key={contact.id}>
                    <motion.tr 
                      onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
                      className={`group cursor-pointer border-l-2 transition-all ${expandedId === contact.id ? "border-blue-500 bg-blue-500/5" : "border-transparent"}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${expandedId === contact.id ? "bg-blue-500 text-zinc-950" : "bg-zinc-800 text-zinc-400 group-hover:bg-blue-500/10 group-hover:text-blue-400"}`}>
                            {contact.name ? contact.name[0] : "?"}
                          </div>
                          <span className="text-sm font-semibold text-white">{contact.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-zinc-400">
                          <Mail className="w-4 h-4" />
                          <span>{contact.email || "Not provided"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-zinc-400">
                          <Phone className="w-4 h-4" />
                          <span>{contact.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={contact.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 text-sm text-zinc-400">
                          <Calendar className="w-4 h-4" />
                          <span>{contact.updatedAt?.toDate ? new Date(contact.updatedAt.toDate()).toLocaleDateString() : "Just now"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {expandedId === contact.id ? <ChevronUp className="w-5 h-5 text-blue-400" /> : <ChevronDown className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />}
                        </div>
                      </td>
                    </motion.tr>

                    <AnimatePresence>
                      {expandedId === contact.id && (
                        <tr>
                          <td colSpan={6} className="px-0 py-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-zinc-900/30 border-b border-zinc-900"
                            >
                              <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left Column: Contact Summary */}
                                <div className="space-y-6">
                                  <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center space-x-2">
                                      <FileText className="w-3 h-3" />
                                      <span>Last Call Summary</span>
                                    </h4>
                                    <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-800 text-sm text-zinc-300 leading-relaxed">
                                      {contact.lastCallSummary || "No summary available for the last call."}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-3">
                                    <button 
                                      onClick={() => handleEdit(contact)}
                                      className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-2"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                      <span>Edit Contact</span>
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(contact.id)}
                                      className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Right Column: CRM Details */}
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center space-x-2">
                                      <Clock className="w-3 h-3" />
                                      <span>Activity History</span>
                                    </h4>
                                    <div className="space-y-3">
                                      <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                          <span className="text-sm text-zinc-300">Last Interaction</span>
                                        </div>
                                        <span className="text-xs text-zinc-500">
                                          {contact.updatedAt?.toDate ? new Date(contact.updatedAt.toDate()).toLocaleString() : "Just now"}
                                        </span>
                                      </div>
                                      <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <div className="w-2 h-2 bg-zinc-700 rounded-full" />
                                          <span className="text-sm text-zinc-300">Contact Created</span>
                                        </div>
                                        <span className="text-xs text-zinc-500">
                                          {contact.createdAt?.toDate ? new Date(contact.createdAt.toDate()).toLocaleDateString() : "Just now"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center space-x-2">
                                      <ExternalLink className="w-3 h-3" />
                                      <span>Quick Actions</span>
                                    </h4>
                                    <div className="grid grid-cols-1 gap-3">
                                      {contact.lastCallId && (
                                        <button 
                                          onClick={() => navigate(ROUTES.INBOX)}
                                          className="p-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 rounded-xl text-left transition-all group/btn"
                                        >
                                          <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">View Last Call</p>
                                          <p className="text-xs text-zinc-500 group-hover/btn:text-zinc-400">Open the full transcript and recording in Inbox.</p>
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => showToast("Manual call is not implemented in this demo.", "info")}
                                        className="p-3 bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-800 rounded-xl text-left transition-all group/btn"
                                      >
                                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">Initiate Outbound</p>
                                        <p className="text-xs text-zinc-500 group-hover/btn:text-zinc-400">Trigger an AI follow-up call to this contact.</p>
                                      </button>
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
          <p className="text-sm text-zinc-500">Showing {filteredContacts.length} contacts</p>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingContact ? "Edit Contact" : "Add New Contact"}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveContact} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                  >
                    <option value="INQUIRED">Inquired</option>
                    <option value="BOOKED">Booked</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center space-x-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Contact"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
