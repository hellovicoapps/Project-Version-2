import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Phone, 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  MessageSquare
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from "recharts";

const data = [
  { name: "Mon", calls: 0, bookings: 0 },
  { name: "Tue", calls: 0, bookings: 0 },
  { name: "Wed", calls: 0, bookings: 0 },
  { name: "Thu", calls: 0, bookings: 0 },
  { name: "Fri", calls: 0, bookings: 0 },
  { name: "Sat", calls: 0, bookings: 0 },
  { name: "Sun", calls: 0, bookings: 0 },
];

import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  updateDoc,
  increment,
  doc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AuthService } from "../services/authService";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { useToast } from "../components/Toast";
import { CallStatus, Business, SubscriptionPlan } from "../types";

const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6 space-y-4"
  >
    <div className="flex items-center justify-between">
      <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <div className={`flex items-center space-x-1 text-sm ${trend === "up" ? "text-blue-400" : "text-rose-400"}`}>
        <span>{trendValue}%</span>
        {trend === "up" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
      </div>
    </div>
    <div>
      <p className="text-zinc-500 text-sm font-medium">{title}</p>
      <h3 className="text-3xl font-bold text-white mt-1">{value}</h3>
    </div>
  </motion.div>
);

export default function DashboardHome() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  const [stats, setStats] = useState({
    totalCalls: 0,
    activeBookings: 0,
    totalInquiries: 0,
    successRate: 0,
    remainingMinutes: 0,
    newContacts: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetCredits = async () => {
    if (!businessId) return;
    setIsResetting(true);
    try {
      const businessRef = doc(db, "businesses", businessId);
      await updateDoc(businessRef, {
        usedMinutes: 0,
        totalMinutes: 120 // Increase to 120 for testing
      });
      showToast("Credits reset successfully! You now have 120 minutes.", "success");
    } catch (error) {
      console.error("Error resetting credits:", error);
      showToast("Failed to reset credits.", "error");
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    if (!businessId) return;

    // Listen for business data
    const unsubscribeBusiness = onSnapshot(doc(db, "businesses", businessId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Business;
        setBusiness({ id: snapshot.id, ...data } as Business);
        const remaining = Math.max(0, (data.totalMinutes || 60) - (data.usedMinutes || 0));
        setStats(prev => ({ ...prev, remainingMinutes: Number(remaining.toFixed(1)) }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}`);
    });

    // Listen for calls
    const callsQuery = query(
      collection(db, `businesses/${businessId}/calls`),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubscribeCalls = onSnapshot(callsQuery, (snapshot) => {
      console.log(`DashboardHome: Received ${snapshot.size} calls for business ${businessId}`);
      const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentActivity(calls);
    }, (error) => {
      console.error("DashboardHome: Calls snapshot error:", error);
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/calls`);
    });

    // Listen for contacts
    const contactsQuery = query(
      collection(db, `businesses/${businessId}/contacts`),
      limit(100)
    );
    const unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, newContacts: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/contacts`);
    });

    // Listen for total calls count and derive metrics
    const totalCallsQuery = query(collection(db, `businesses/${businessId}/calls`));
    const unsubscribeTotalCalls = onSnapshot(totalCallsQuery, (snapshot) => {
      const total = snapshot.size;
      let bookings = 0;
      let inquiries = 0;
      let successful = 0;

      snapshot.docs.forEach(d => {
        const status = d.data().status;
        if (status === CallStatus.BOOKED) {
          bookings++;
          successful++;
        } else if (status === CallStatus.INQUIRY) {
          inquiries++;
          successful++;
        } else if (status === CallStatus.COMPLAINT || status === CallStatus.FOLLOW_UP) {
          successful++;
        }
      });
      
      const rate = total > 0 ? Math.round((successful / total) * 100) : 0;

      // Aggregate chart data
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const counts: { [key: string]: number } = { "Sun": 0, "Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0 };
      
      snapshot.docs.forEach(doc => {
        const createdAt = doc.data().createdAt;
        if (createdAt?.toDate) {
          const day = days[createdAt.toDate().getDay()];
          counts[day]++;
        }
      });

      const newChartData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => ({
        name: day,
        calls: counts[day]
      }));
      
      setChartData(newChartData);
      
      setStats(prev => ({ 
        ...prev, 
        totalCalls: total,
        activeBookings: bookings,
        totalInquiries: inquiries,
        successRate: rate
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/calls`);
    });

    return () => {
      unsubscribeBusiness();
      unsubscribeCalls();
      unsubscribeTotalCalls();
      unsubscribeContacts();
    };
  }, [businessId]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {business && (business.usedMinutes || 0) >= (business.totalMinutes || 60) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Voice Credits Exceeded</p>
              <p className="text-xs text-rose-400/80">Your business has exceeded its monthly voice credit limit. Overage will be billed at the end of your billing cycle.</p>
            </div>
          </div>
          <button 
            onClick={handleResetCredits}
            disabled={isResetting}
            className="px-4 py-2 bg-zinc-800 text-white text-xs font-bold rounded-xl hover:bg-zinc-700 transition-all mr-2"
          >
            {isResetting ? "Resetting..." : "Reset Test Credits"}
          </button>
          <button 
            onClick={() => navigate(ROUTES.PRICING)}
            className="px-4 py-2 bg-rose-500 text-white text-xs font-bold rounded-xl hover:bg-rose-600 transition-all"
          >
            Upgrade Now
          </button>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Welcome, <span className="text-blue-400">{authState.user?.name}</span>
          </h1>
          <p className="text-zinc-500 mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => showToast("Filtering by date range is not implemented in this demo.", "info")}
            className="btn-secondary flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Last 7 Days</span>
          </button>
          <button 
            onClick={() => navigate(ROUTES.VOICE_INTERFACE)}
            className="btn-primary flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>Live Call</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Calls" value={stats.totalCalls || "0"} icon={Phone} trend="up" trendValue="0" />
        <StatCard title="Bookings" value={stats.activeBookings || "0"} icon={Calendar} trend="up" trendValue="0" />
        <StatCard title="Inquiries" value={stats.totalInquiries || "0"} icon={MessageSquare} trend="up" trendValue="0" />
        <StatCard title="Success Rate" value={`${stats.successRate}%`} icon={CheckCircle} trend="up" trendValue="0" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Call Activity</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-zinc-400">Calls</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full relative min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <AreaChart data={chartData.length > 0 ? chartData : data}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#18181b", 
                    borderColor: "#3f3f46",
                    borderRadius: "12px",
                    color: "#fff"
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="calls" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorCalls)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-zinc-500">No recent activity yet.</p>
              </div>
            ) : (
              recentActivity.map((call) => (
                <div key={call.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-zinc-800 rounded-lg">
                      <Phone className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {call.callerName ? `Call from ${call.callerName}` : `Call from ${call.phoneNumber}`}
                      </p>
                      <div className="flex items-center space-x-2">
                        {call.callerName && <p className="text-[10px] text-zinc-500">{call.phoneNumber}</p>}
                        {call.callerName && call.summary && <span className="text-zinc-800">•</span>}
                        {call.summary && (
                          <p className="text-[10px] text-blue-400/80 italic line-clamp-1 max-w-[200px]">{call.summary}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {call.createdAt?.toDate ? new Date(call.createdAt.toDate()).toLocaleString() : "Just now"} • Duration: {call.duration}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-blue-500/20`}>
                      {call.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => navigate(ROUTES.INBOX)}
            className="w-full mt-6 py-2 text-sm text-zinc-500 hover:text-white transition-colors border-t border-zinc-800 pt-4"
          >
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
