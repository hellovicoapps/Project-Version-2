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
  ChevronLeft,
  Menu,
  HelpCircle,
  CreditCard,
  Link as LinkIcon,
  ShieldCheck,
  Newspaper
} from "lucide-react";
import { motion } from "framer-motion";
import { ROUTES } from "../constants";
import { AuthService } from "../services/authService";
import { Logo } from "./Logo";
import { doc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Business } from "../types";

const SidebarItem = ({ to, icon: Icon, label, active, isMinimized }: any) => (
  <Link to={to}>
    <motion.div 
      whileHover={{ x: isMinimized ? 0 : 5, scale: isMinimized ? 1.05 : 1 }}
      whileTap={{ scale: 0.98 }}
      className={`flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all group ${
        active 
          ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20" 
          : "text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-main)]"
      }`}
      title={isMinimized ? label : undefined}
    >
      <div className={`flex items-center ${isMinimized ? '' : 'space-x-3'}`}>
        <Icon className={`w-5 h-5 ${active ? "text-white" : "text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]"}`} />
        {!isMinimized && <span className="font-medium">{label}</span>}
      </div>
      {!isMinimized && active && <ChevronRight className="w-4 h-4" />}
    </motion.div>
  </Link>
);

export default function Sidebar() {
  const location = useLocation();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
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
    <aside className={`${isMinimized ? 'w-24' : 'w-72'} border-r border-[var(--border-main)] flex flex-col h-screen sticky top-0 bg-[var(--bg-main)] transition-all duration-300 z-50 shrink-0`}>
      <div className={`p-8 ${isMinimized ? 'px-4 flex justify-center' : ''}`}>
        <Link to={ROUTES.HOME} className={`flex items-center ${isMinimized ? 'justify-center' : 'space-x-3'} group`}>
          {business?.logoUrl ? (
            <div className={`rounded-lg overflow-hidden shadow-lg shadow-[var(--brand-primary)]/10 group-hover:scale-110 transition-transform shrink-0 ${isMinimized ? 'w-10 h-10' : 'w-10 h-10'}`}>
              <img 
                src={business.logoUrl} 
                alt="Logo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="shrink-0 flex items-center justify-center">
              <Logo iconSize={isMinimized ? 24 : 48} />
            </div>
          )}
          {!isMinimized && business?.name && (
            <span className="text-2xl font-bold tracking-tighter text-[var(--text-main)] truncate max-w-[140px] block">
              {business.name}
            </span>
          )}
        </Link>
      </div>

      <nav className={`flex-1 ${isMinimized ? 'px-2' : 'px-4'} space-y-2 overflow-y-auto custom-scrollbar`}>
        {!isMinimized ? (
          <div className="px-4 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Main Menu</div>
        ) : (
          <div className="h-4"></div>
        )}
        <SidebarItem isMinimized={isMinimized} to={ROUTES.DASHBOARD} icon={LayoutDashboard} label="Dashboard" active={location.pathname === ROUTES.DASHBOARD || location.pathname === ROUTES.HOME} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.INBOX} icon={Inbox} label="Recent Calls" active={location.pathname === ROUTES.INBOX} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.CONTACTS} icon={Users} label="Contacts" active={location.pathname === ROUTES.CONTACTS} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.CALENDAR} icon={Calendar} label="Calendar" active={location.pathname === ROUTES.CALENDAR} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.AGENT} icon={User} label="Agent" active={location.pathname === ROUTES.AGENT} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.LINKS} icon={LinkIcon} label="Links" active={location.pathname === ROUTES.LINKS} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.NEWS} icon={Newspaper} label="News" active={location.pathname === ROUTES.NEWS} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.VOICE_INTERFACE} icon={Phone} label="Test call" active={location.pathname === ROUTES.VOICE_INTERFACE} />
        
        {authState.user?.role === "admin" && (
          <>
            {!isMinimized ? (
              <div className="px-4 py-6 text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-widest">Administration</div>
            ) : (
              <div className="h-6 border-b border-[var(--border-main)] mx-4 mb-6"></div>
            )}
            <SidebarItem isMinimized={isMinimized} to={ROUTES.ADMIN_DASHBOARD} icon={ShieldCheck} label="System Admin" active={location.pathname === ROUTES.ADMIN_DASHBOARD} />
          </>
        )}

        {!isMinimized ? (
          <div className="px-4 py-6 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Account</div>
        ) : (
          <div className="h-6 border-b border-[var(--border-main)] mx-4 mb-6"></div>
        )}
        <SidebarItem isMinimized={isMinimized} to={ROUTES.PRICING} icon={CreditCard} label="Subscription" active={location.pathname === ROUTES.PRICING} />
        <SidebarItem isMinimized={isMinimized} to={ROUTES.SETTINGS} icon={Settings} label="Settings" active={location.pathname === ROUTES.SETTINGS} />
        <SidebarItem isMinimized={isMinimized} to="/help" icon={HelpCircle} label="Help Center" active={location.pathname === "/help"} />
      </nav>

      <div className={`p-6 border-t border-[var(--border-main)] ${isMinimized ? 'flex justify-center px-2' : ''}`}>
        <button 
          onClick={() => setIsMinimized(!isMinimized)}
          className={`flex items-center ${isMinimized ? 'justify-center' : 'space-x-3'} px-4 py-3 w-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] rounded-xl transition-all group`}
          title={isMinimized ? "Expand Sidebar" : "Minimize Sidebar"}
        >
          {isMinimized ? (
            <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Minimize</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
