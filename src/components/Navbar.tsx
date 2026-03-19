import { Bell, Search, User, ChevronDown, Zap, LogOut } from "lucide-react";
import { User as UserType, Business } from "../types";
import { AuthService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";

export default function Navbar({ user }: { user: UserType | null }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showCreditsMenu, setShowCreditsMenu] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = onSnapshot(doc(db, "businesses", user.id), (doc) => {
      if (doc.exists()) {
        setBusiness({ id: doc.id, ...doc.data() } as Business);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${user.id}`);
    });
    return () => unsubscribe();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const total = business?.totalMinutes || 60;
  const used = business?.usedMinutes || 0;
  const remaining = Math.max(0, total - used);
  const overage = Math.max(0, used - total);

  return (
    <header className="h-20 border-b border-zinc-900 flex items-center justify-between px-8 sticky top-0 bg-zinc-950/80 backdrop-blur-xl z-40">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search calls, contacts, or settings..." 
            className="w-full pl-12 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {business && (
          <div className="relative">
            <button 
              onClick={() => setShowCreditsMenu(!showCreditsMenu)}
              className="hidden lg:flex items-center space-x-4 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group"
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Voice Credits</span>
                  <span className={`text-[10px] font-bold ${overage > 0 ? "text-rose-400" : "text-white"}`}>
                    {overage > 0 ? `${overage.toFixed(1)}m overage` : `${remaining.toFixed(1)}m left`}
                  </span>
                </div>
                <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (used / total) * 100)}%` }}
                    className={`h-full rounded-full ${
                      (used / total) > 0.9 ? 'bg-rose-500' : 
                      (used / total) > 0.7 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                  />
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover:text-white transition-transform ${showCreditsMenu ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showCreditsMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowCreditsMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden p-4"
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Current Plan</p>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                          <Zap className="w-4 h-4 text-blue-400" />
                          <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                            {business.plan || "Free"} Plan
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Used</p>
                          <p className="text-lg font-bold text-white">{used.toFixed(1)}m</p>
                        </div>
                        <div className="p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Remaining</p>
                          <p className="text-lg font-bold text-white">{remaining.toFixed(1)}m</p>
                        </div>
                      </div>

                      {overage > 0 && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Overage</p>
                          <p className="text-lg font-bold text-rose-400">{overage.toFixed(1)}m</p>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          setShowCreditsMenu(false);
                          navigate(ROUTES.PRICING);
                        }}
                        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Upgrade Plan</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        <button className="relative p-2 text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-zinc-950" />
        </button>

        <div className="h-8 w-px bg-zinc-800" />

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-blue-500/10 group-hover:scale-105 transition-transform overflow-hidden">
              {business?.logoUrl ? (
                <img 
                  src={business.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-zinc-950">
                  {user?.name?.[0] || user?.email?.[0] || "U"}
                </div>
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-white leading-none">{user?.name || "User"}</p>
              <p className="text-xs text-zinc-500 mt-1">{user?.role || "Admin"}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-zinc-500 group-hover:text-white transition-transform ${showMenu ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      navigate(ROUTES.SETTINGS);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center space-x-2 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center space-x-2 border-t border-zinc-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
