import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  MessageSquare,
  ChevronDown,
  Filter
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
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { 
  subDays, 
  startOfDay, 
  endOfDay, 
  isWithinInterval, 
  format, 
  eachDayOfInterval,
  isSameDay
} from "date-fns";

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
import { PLAN_DETAILS } from "../constants";
import { CallStatus, Business, SubscriptionPlan } from "../types";

const StatCard = ({ title, value, icon: Icon, trend, trendValue }: any) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6 space-y-4 card-hover"
  >
    <div className="flex items-center justify-between">
      <div className="p-3 bg-[var(--brand-primary)]/10 rounded-xl border border-[var(--brand-primary)]/10">
        <Icon className="w-6 h-6 text-[var(--brand-primary)]" />
      </div>
      <div className={`flex items-center space-x-1 text-xs font-bold px-2 py-1 rounded-full ${
        trend === "up" 
          ? "bg-[var(--color-success)]/10 text-[var(--color-success)]" 
          : "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
      }`}>
        {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span>{trendValue}%</span>
      </div>
    </div>
    <div>
      <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-3xl font-bold text-[var(--text-main)] mt-1 tracking-tight">{value}</h3>
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
  const [trends, setTrends] = useState({
    totalCalls: 0,
    activeBookings: 0,
    totalInquiries: 0,
    successRate: 0,
  });
  const [dateRange, setDateRange] = useState<"today" | "7days" | "30days" | "all">("7days");
  const [showRangeSelector, setShowRangeSelector] = useState(false);
  const [allCalls, setAllCalls] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetCredits = async () => {
    if (!businessId) return;
    setIsResetting(true);
    try {
      const businessRef = doc(db, "businesses", businessId);
      const currentPlan = business?.plan as SubscriptionPlan || SubscriptionPlan.FREE;
      const planMinutes = PLAN_DETAILS[currentPlan]?.minutes || 30;
      await updateDoc(businessRef, {
        usedMinutes: 0,
        totalMinutes: planMinutes
      });
      showToast(`Credits reset successfully! You now have ${planMinutes} minutes.`, "success");
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
        const currentPlan = data.plan as SubscriptionPlan || SubscriptionPlan.FREE;
        const planMinutes = PLAN_DETAILS[currentPlan]?.minutes || 30;
        const remaining = Math.max(0, (data.totalMinutes || planMinutes) - (data.usedMinutes || 0));
        
        // Use aggregated fields if available
        setStats(prev => ({ 
          ...prev, 
          remainingMinutes: Number(remaining.toFixed(1)),
          // Use aggregated fields for "All Time" if that's the current range
          ...(dateRange === "all" ? {
            totalCalls: data.totalCalls || 0,
            activeBookings: data.totalBookings || 0,
            totalInquiries: data.totalInquiries || 0,
            successRate: data.totalCalls ? Math.round(((data.totalSuccess || 0) / data.totalCalls) * 100) : 0
          } : {})
        }));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}`);
    });

    // Listen for recent calls (limit to 5)
    const recentCallsQuery = query(
      collection(db, `businesses/${businessId}/calls`),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubscribeRecentCalls = onSnapshot(recentCallsQuery, (snapshot) => {
      const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentActivity(calls);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/calls`);
    });

    // Listen for contacts (limit to 100)
    const contactsQuery = query(
      collection(db, `businesses/${businessId}/contacts`),
      limit(100)
    );
    const unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
      setStats(prev => ({ ...prev, newContacts: snapshot.size }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/contacts`);
    });

    // Listen for calls in the selected date range
    let rangeStart = subDays(new Date(), 30); // Default to 30 days
    if (dateRange === "today") rangeStart = startOfDay(new Date());
    else if (dateRange === "7days") rangeStart = subDays(new Date(), 7);
    else if (dateRange === "30days") rangeStart = subDays(new Date(), 30);
    else if (dateRange === "all") rangeStart = subDays(new Date(), 365); // Limit "all" to 1 year for performance, or use aggregated fields

    const rangeCallsQuery = query(
      collection(db, `businesses/${businessId}/calls`),
      where("createdAt", ">=", Timestamp.fromDate(rangeStart)),
      orderBy("createdAt", "desc"),
      limit(500)
    );

    const unsubscribeRangeCalls = onSnapshot(rangeCallsQuery, (snapshot) => {
      const calls = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: (doc.data() as any).createdAt?.toDate ? (doc.data() as any).createdAt.toDate() : new Date()
      }));
      setAllCalls(calls);
    }, (error) => {
      console.error("DashboardHome: Range calls snapshot error:", error);
      // If index is missing, we might get an error. We should handle it.
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/calls`);
    });

    return () => {
      unsubscribeBusiness();
      unsubscribeRecentCalls();
      unsubscribeRangeCalls();
      unsubscribeContacts();
    };
  }, [businessId, dateRange]);

  // Calculate stats and trends whenever allCalls or dateRange changes
  useEffect(() => {
    if (allCalls.length === 0) return;

    const timezone = business?.timezone || "UTC";
    const now = toZonedTime(new Date(), timezone);
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (dateRange) {
      case "today":
        currentStart = startOfDay(now);
        previousStart = startOfDay(subDays(now, 1));
        previousEnd = endOfDay(subDays(now, 1));
        break;
      case "7days":
        currentStart = subDays(now, 7);
        previousStart = subDays(now, 14);
        previousEnd = subDays(now, 7);
        break;
      case "30days":
        currentStart = subDays(now, 30);
        previousStart = subDays(now, 60);
        previousEnd = subDays(now, 30);
        break;
      case "all":
      default:
        currentStart = new Date(0); // Beginning of time
        previousStart = new Date(0);
        previousEnd = new Date(0);
        break;
    }

    const calculateMetrics = (calls: any[]) => {
      const total = calls.length;
      let bookings = 0;
      let inquiries = 0;
      let successful = 0;

      calls.forEach(c => {
        if (c.status === CallStatus.BOOKED) {
          bookings++;
          successful++;
        } else if (c.status === CallStatus.INQUIRY) {
          inquiries++;
          successful++;
        } else if (c.status === CallStatus.COMPLAINT || c.status === CallStatus.FOLLOW_UP) {
          successful++;
        }
      });

      const rate = total > 0 ? Math.round((successful / total) * 100) : 0;
      return { total, bookings, inquiries, rate };
    };

    // Filter calls based on business timezone
    const currentCalls = allCalls.filter(c => {
      const zonedCreatedAt = toZonedTime(c.createdAt, timezone);
      return zonedCreatedAt >= currentStart;
    });
    
    const previousCalls = dateRange === "all" ? [] : allCalls.filter(c => {
      const zonedCreatedAt = toZonedTime(c.createdAt, timezone);
      return zonedCreatedAt >= previousStart && zonedCreatedAt < previousEnd;
    });

    const currentMetrics = calculateMetrics(currentCalls);
    const previousMetrics = calculateMetrics(previousCalls);

    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    setStats(prev => ({
      ...prev,
      totalCalls: currentMetrics.total,
      activeBookings: currentMetrics.bookings,
      totalInquiries: currentMetrics.inquiries,
      successRate: currentMetrics.rate
    }));

    setTrends({
      totalCalls: calculateTrend(currentMetrics.total, previousMetrics.total),
      activeBookings: calculateTrend(currentMetrics.bookings, previousMetrics.bookings),
      totalInquiries: calculateTrend(currentMetrics.inquiries, previousMetrics.inquiries),
      successRate: calculateTrend(currentMetrics.rate, previousMetrics.rate),
    });

    // Update Chart Data based on range
    if (dateRange === "today") {
      // Show hourly for today
      const hours = Array.from({ length: 24 }, (_, i) => ({ name: `${i}:00`, calls: 0 }));
      currentCalls.forEach(c => {
        const zonedCreatedAt = toZonedTime(c.createdAt, timezone);
        const hour = zonedCreatedAt.getHours();
        hours[hour].calls++;
      });
      setChartData(hours);
    } else if (dateRange === "all") {
      // Show last 7 days for "all" as a default view
      const last7Days = eachDayOfInterval({ start: subDays(now, 6), end: now });
      const chart = last7Days.map(day => {
        const count = allCalls.filter(c => {
          const zonedCreatedAt = toZonedTime(c.createdAt, timezone);
          return isSameDay(zonedCreatedAt, day);
        }).length;
        return { name: format(day, "EEE"), calls: count };
      });
      setChartData(chart);
    } else {
      // Show days for 7 or 30 days
      const daysCount = dateRange === "7days" ? 7 : 30;
      const interval = eachDayOfInterval({ start: subDays(now, daysCount - 1), end: now });
      const chart = interval.map(day => {
        const count = allCalls.filter(c => {
          const zonedCreatedAt = toZonedTime(c.createdAt, timezone);
          return isSameDay(zonedCreatedAt, day);
        }).length;
        return { name: format(day, daysCount === 7 ? "EEE" : "MMM d"), calls: count };
      });
      setChartData(chart);
    }

  }, [allCalls, dateRange]);

  const rangeLabels = {
    today: "Today",
    "7days": "Last 7 Days",
    "30days": "Last 30 Days",
    all: "All Time"
  };

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {business && (business.usedMinutes || 0) >= (business.totalMinutes || PLAN_DETAILS[business.plan as SubscriptionPlan]?.minutes || 30) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[var(--color-danger)]/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-[var(--color-danger)]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--text-main)]">Voice Credits Exceeded</p>
              <p className="text-xs text-[var(--color-danger)]/80">
                {business.plan === SubscriptionPlan.FREE 
                  ? "You have run out of free AI minutes. Please upgrade to continue using the service."
                  : `You have exceeded your monthly limit. Overage is billed at $${PLAN_DETAILS[business.plan as SubscriptionPlan]?.overageRate.toFixed(2)}/min. Current overage cost: $${(((business.usedMinutes || 0) - (business.totalMinutes || PLAN_DETAILS[business.plan as SubscriptionPlan]?.minutes || 30)) * (PLAN_DETAILS[business.plan as SubscriptionPlan]?.overageRate || 0)).toFixed(2)}`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleResetCredits}
            disabled={isResetting}
            className="px-4 py-2 bg-[var(--bg-card)] text-[var(--text-main)] text-xs font-bold rounded-xl hover:bg-[var(--border-main)] transition-all mr-2"
          >
            {isResetting ? "Resetting..." : "Reset Test Credits"}
          </button>
          <button 
            onClick={() => navigate(ROUTES.PRICING)}
            className="px-4 py-2 bg-[var(--color-danger)] text-white text-xs font-bold rounded-xl hover:bg-[var(--color-danger)]/90 transition-all"
          >
            Upgrade Now
          </button>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-main)] tracking-tight">
            Welcome, <span className="text-[var(--brand-primary)]">{authState.user?.name}</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Here's what's happening with your business today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <button 
              onClick={() => setShowRangeSelector(!showRangeSelector)}
              className="btn-secondary flex items-center space-x-2 min-w-[140px] justify-between"
            >
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{rangeLabels[dateRange]}</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showRangeSelector ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showRangeSelector && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-48 glass-card border border-[var(--border-main)] rounded-xl shadow-xl z-50 overflow-hidden"
                >
                  {(Object.keys(rangeLabels) as Array<keyof typeof rangeLabels>).map((range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setDateRange(range);
                        setShowRangeSelector(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm hover:bg-[var(--brand-primary)]/10 transition-colors flex items-center justify-between ${dateRange === range ? "text-[var(--brand-primary)] font-bold bg-[var(--brand-primary)]/5" : "text-[var(--text-main)]"}`}
                    >
                      {rangeLabels[range]}
                      {dateRange === range && <div className="w-1.5 h-1.5 bg-[var(--brand-primary)] rounded-full" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
        <StatCard 
          title="Total Calls" 
          value={stats.totalCalls || "0"} 
          icon={Phone} 
          trend={trends.totalCalls >= 0 ? "up" : "down"} 
          trendValue={Math.abs(trends.totalCalls)} 
        />
        <StatCard 
          title="Bookings" 
          value={stats.activeBookings || "0"} 
          icon={Calendar} 
          trend={trends.activeBookings >= 0 ? "up" : "down"} 
          trendValue={Math.abs(trends.activeBookings)} 
        />
        <StatCard 
          title="Inquiries" 
          value={stats.totalInquiries || "0"} 
          icon={MessageSquare} 
          trend={trends.totalInquiries >= 0 ? "up" : "down"} 
          trendValue={Math.abs(trends.totalInquiries)} 
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats.successRate}%`} 
          icon={CheckCircle} 
          trend={trends.successRate >= 0 ? "up" : "down"} 
          trendValue={Math.abs(trends.successRate)} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--text-main)]">Call Activity</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-[var(--brand-primary)] rounded-full" />
                <span className="text-[var(--text-muted)]">Calls</span>
              </div>
            </div>
          </div>
          <div className="h-[300px] w-full relative min-h-[300px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <AreaChart data={chartData.length > 0 ? chartData : data}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="var(--text-muted)" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--bg-card)", 
                      borderColor: "var(--border-main)",
                      borderRadius: "12px",
                      color: "var(--text-main)"
                    }} 
                    itemStyle={{ color: "var(--text-main)" }}
                    labelStyle={{ color: "var(--text-muted)" }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="calls" 
                    stroke="var(--brand-primary)" 
                    fillOpacity={1} 
                    fill="url(#colorCalls)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-[var(--text-main)] mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {recentActivity.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[var(--text-muted)]">No recent activity yet.</p>
              </div>
            ) : (
              recentActivity.map((call) => (
                <div key={call.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg">
                      <Phone className="w-5 h-5 text-[var(--text-muted)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-main)]">
                        {(call.callerName && call.callerName !== "null") ? `Call from ${call.callerName}` : `Call from ${call.phoneNumber}`}
                      </p>
                      <div className="flex items-center space-x-2">
                        {call.callerName && <p className="text-[10px] text-[var(--text-muted)]">{call.phoneNumber}</p>}
                        {call.callerName && call.summary && <span className="text-[var(--border-main)]">•</span>}
                        {call.summary && (
                          <p className="text-[10px] text-[var(--brand-primary)]/80 italic line-clamp-1 max-w-[200px]">{call.summary}</p>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {call.createdAt?.toDate 
                          ? formatInTimeZone(call.createdAt.toDate(), business?.timezone || "UTC", "MMM d, yyyy h:mm a") 
                          : "Just now"} • Duration: {call.duration}s
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
                      call.status === CallStatus.BOOKED 
                        ? "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20"
                        : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20"
                    }`}>
                      {call.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button 
            onClick={() => navigate(ROUTES.INBOX)}
            className="w-full mt-6 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-t border-[var(--border-main)] pt-4"
          >
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
