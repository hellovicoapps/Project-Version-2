import { Bell, Search, User, ChevronDown, Zap, LogOut, Sun, Moon } from "lucide-react";
import { User as UserType, Business } from "../types";
import { AuthService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ user }: { user: UserType | null }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
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
    <header className="h-20 border-b border-[var(--border-main)] flex items-center justify-between px-8 sticky top-0 bg-[var(--glass-bg)] backdrop-blur-xl z-40 transition-colors duration-300">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--brand-primary)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search calls, contacts, or settings..." 
            className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/50 focus:border-[var(--brand-primary)] transition-all"
          />
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {business && (
          <div className="relative">
            <button 
              onClick={() => setShowCreditsMenu(!showCreditsMenu)}
              className="hidden lg:flex items-center space-x-4 px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl hover:border-[var(--brand-primary)]/30 transition-colors group"
            >
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Voice Credits</span>
                  <span className={`text-[10px] font-bold ${overage > 0 ? "text-danger" : "text-[var(--text-main)]"}`}>
                    {overage > 0 ? `${overage.toFixed(1)}m overage` : `${remaining.toFixed(1)}m left`}
                  </span>
                </div>
                <div className="w-32 h-1.5 bg-[var(--border-main)] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (used / total) * 100)}%` }}
                    className={`h-full rounded-full ${
                      (used / total) > 0.9 ? 'bg-danger' : 
                      (used / total) > 0.7 ? 'bg-warning' : 'bg-[var(--brand-primary)]'
                    }`}
                  />
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-transform ${showCreditsMenu ? "rotate-180" : ""}`} />
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
                    className="absolute right-0 mt-2 w-64 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-2xl shadow-2xl z-50 overflow-hidden p-4"
                  >
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Current Plan</p>
                        <div className="flex items-center space-x-2 px-3 py-2 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded-xl">
                          <Zap className="w-4 h-4 text-[var(--brand-primary)]" />
                          <span className="text-sm font-bold text-[var(--brand-primary)] uppercase tracking-wider">
                            {business.plan || "Free"} Plan
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Used</p>
                          <p className="text-lg font-bold text-[var(--text-main)]">{used.toFixed(1)}m</p>
                        </div>
                        <div className="p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl">
                          <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Remaining</p>
                          <p className="text-lg font-bold text-[var(--text-main)]">{remaining.toFixed(1)}m</p>
                        </div>
                      </div>

                      {overage > 0 && (
                        <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl">
                          <p className="text-[10px] font-bold text-danger uppercase tracking-wider mb-2">Overage</p>
                          <p className="text-lg font-bold text-danger">{overage.toFixed(1)}m</p>
                        </div>
                      )}

                      <button 
                        onClick={() => {
                          setShowCreditsMenu(false);
                          navigate(ROUTES.PRICING);
                        }}
                        className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[var(--brand-primary)]/20 flex items-center justify-center space-x-2"
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

        <button className="relative p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--brand-primary)] rounded-full border-2 border-[var(--bg-main)]" />
        </button>

        <div className="h-8 w-px bg-[var(--border-main)]" />

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl flex items-center justify-center text-[var(--text-main)] font-bold shadow-lg shadow-[var(--brand-primary)]/10 group-hover:scale-105 transition-transform overflow-hidden">
              {business?.logoUrl ? (
                <img 
                  src={business.logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-white">
                  {user?.name?.[0] || user?.email?.[0] || "U"}
                </div>
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-[var(--text-main)] leading-none">{user?.name || "User"}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{user?.role || "Admin"}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-transform ${showMenu ? "rotate-180" : ""}`} />
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
                  className="absolute right-0 mt-2 w-56 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      navigate(ROUTES.SETTINGS);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] flex items-center space-x-2 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span>Profile Settings</span>
                  </button>

                  <button 
                    onClick={() => {
                      toggleTheme();
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] flex items-center justify-between transition-colors border-t border-[var(--border-main)]"
                  >
                    <div className="flex items-center space-x-2">
                      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                      <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-[var(--brand-primary)]' : 'bg-[var(--border-main)]'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${theme === 'dark' ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-3 text-left text-sm text-danger hover:text-danger hover:bg-danger/10 flex items-center space-x-2 border-t border-[var(--border-main)] transition-colors"
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
