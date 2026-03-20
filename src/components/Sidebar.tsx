import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Inbox, 
  Users, 
  User,
  Phone, 
  Calendar,
  Settings, 
  LogOut, 
  Zap,
  ChevronRight,
  HelpCircle,
  CreditCard,
  Link as LinkIcon,
  ShieldCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { ROUTES } from "../constants";
import { AuthService } from "../services/authService";
import { Logo } from "./Logo";
import { doc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Business } from "../types";

const SidebarItem = ({ to, icon: Icon, label, active }: any) => (
  <Link to={to}>
    <motion.div 
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group ${
        active 
          ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20" 
          : "text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]"
      }`}
    >
      <div className="flex items-center space-x-3">
        <Icon className={`w-5 h-5 ${active ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]"}`} />
        <span className="font-medium">{label}</span>
      </div>
      {active && <ChevronRight className="w-4 h-4" />}
    </motion.div>
  </Link>
);

export default function Sidebar() {
  const location = useLocation();
  const [business, setBusiness] = useState<Business | null>(null);
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    if (!businessId) return;
    const unsubscribe = onSnapshot(doc(db, "businesses", businessId), (doc) => {
      if (doc.exists()) {
        setBusiness({ id: doc.id, ...doc.data() } as Business);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}`);
    });
    return () => unsubscribe();
  }, [businessId]);

  return (
    <aside className="w-72 border-r border-[var(--border-main)] flex flex-col h-screen sticky top-0 bg-[var(--bg-main)] transition-colors duration-300 z-50">
      <div className="p-8">
        <Link to={ROUTES.HOME} className="flex items-center space-x-3 group">
          {business?.logoUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-[var(--brand-primary)]/10 group-hover:scale-110 transition-transform">
              <img 
                src={business.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <Logo iconSize={48} />
          )}
          {business?.name && (
            <span className="text-2xl font-bold tracking-tighter text-[var(--text-main)] truncate max-w-[140px] block">
              {business.name}
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Main Menu</div>
        <SidebarItem to={ROUTES.DASHBOARD} icon={LayoutDashboard} label="Dashboard" active={location.pathname === ROUTES.DASHBOARD || location.pathname === ROUTES.HOME} />
        <SidebarItem to={ROUTES.INBOX} icon={Inbox} label="Recent Calls" active={location.pathname === ROUTES.INBOX} />
        <SidebarItem to={ROUTES.CONTACTS} icon={Users} label="Contacts" active={location.pathname === ROUTES.CONTACTS} />
        <SidebarItem to={ROUTES.CALENDAR} icon={Calendar} label="Calendar" active={location.pathname === ROUTES.CALENDAR} />
        <SidebarItem to={ROUTES.AGENT} icon={User} label="Agent" active={location.pathname === ROUTES.AGENT} />
        <SidebarItem to={ROUTES.LINKS} icon={LinkIcon} label="Links" active={location.pathname === ROUTES.LINKS} />
        <SidebarItem to={ROUTES.VOICE_INTERFACE} icon={Phone} label="Test call" active={location.pathname === ROUTES.VOICE_INTERFACE} />
        
        {authState.user?.role === "admin" && (
          <>
            <div className="px-4 py-6 text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-widest">Administration</div>
            <SidebarItem to={ROUTES.ADMIN_DASHBOARD} icon={ShieldCheck} label="System Admin" active={location.pathname === ROUTES.ADMIN_DASHBOARD} />
          </>
        )}

        <div className="px-4 py-6 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Account</div>
        <SidebarItem to={ROUTES.PRICING} icon={CreditCard} label="Subscription" active={location.pathname === ROUTES.PRICING} />
        <SidebarItem to={ROUTES.SETTINGS} icon={Settings} label="Settings" active={location.pathname === ROUTES.SETTINGS} />
        <SidebarItem to="/help" icon={HelpCircle} label="Help Center" active={location.pathname === "/help"} />
      </nav>

      <div className="p-6 border-t border-[var(--border-main)]">
        <button 
          onClick={() => AuthService.logout()}
          className="flex items-center space-x-3 px-4 py-3 w-full text-[var(--text-muted)] hover:text-danger hover:bg-danger/10 rounded-xl transition-all group"
        >
          <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
