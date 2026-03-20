import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone,
  MoreVertical,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  CalendarDays
} from "lucide-react";
import { 
  format, 
  addDays, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  addWeeks, 
  subWeeks,
  subDays,
  parseISO,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  eachHourOfInterval,
  setHours,
  setMinutes,
  startOfDay,
  endOfDay
} from "date-fns";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  doc,
  getDoc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AuthService } from "../services/authService";
import { useToast } from "../components/Toast";
import { CallStatus } from "../types";

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'day' | 'month'>('week');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newBooking, setNewBooking] = useState({
    callerName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    bookingPurpose: ""
  });
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    if (!businessId) return;

    const callsRef = collection(db, `businesses/${businessId}/calls`);
    const q = query(
      callsRef, 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`CalendarPage: Found ${snapshot.docs.length} total calls`);
      const bookingData = snapshot.docs.map(doc => {
        const data = doc.data();
        let bookingDate = null;
        
        if (data.bookingTime) {
          try {
            bookingDate = new Date(data.bookingTime);
            if (isNaN(bookingDate.getTime())) {
              console.warn(`CalendarPage: Invalid bookingTime for call ${doc.id}:`, data.bookingTime);
              bookingDate = null;
            }
          } catch (e) {
            console.error("Failed to parse booking time:", data.bookingTime);
          }
        }

        return {
          id: doc.id,
          ...data,
          parsedDate: bookingDate
        };
      }).filter(b => b.parsedDate !== null);

      setBookings(bookingData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}/calls`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [businessId]);

  const handleSaveAppointment = async () => {
    if (!businessId) return;
    if (!newBooking.callerName || !newBooking.date || !newBooking.time) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    setIsSaving(true);
    try {
      const bookingTime = new Date(`${newBooking.date}T${newBooking.time}`).toISOString();
      const callsRef = collection(db, `businesses/${businessId}/calls`);
      
      await addDoc(callsRef, {
        businessId,
        agentId: "manual",
        status: CallStatus.BOOKED,
        callerName: newBooking.callerName,
        bookingTime: bookingTime,
        bookingPurpose: newBooking.bookingPurpose || "Manual Booking",
        createdAt: serverTimestamp(),
        duration: 0,
        summary: `Manually added appointment for ${newBooking.callerName}`,
        answeredCorrectly: true,
        phoneNumber: "Manual Entry"
      });

      showToast("Appointment added successfully");
      setIsAddModalOpen(false);
      setNewBooking({
        callerName: "",
        date: format(new Date(), "yyyy-MM-dd"),
        time: "10:00",
        bookingPurpose: ""
      });
    } catch (error) {
      console.error("Error saving appointment:", error);
      showToast("Failed to add appointment", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const nextPeriod = () => {
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else setCurrentDate(startOfMonth(addWeeks(startOfMonth(currentDate), 5)));
  };

  const prevPeriod = () => {
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (view === 'day') setCurrentDate(subDays(currentDate, 1));
    else setCurrentDate(startOfMonth(subWeeks(startOfMonth(currentDate), 4)));
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = view === 'day' 
    ? [currentDate] 
    : eachDayOfInterval({
        start: weekStart,
        end: endOfWeek(currentDate, { weekStartsOn: 1 })
      });

  const hours = eachHourOfInterval({
    start: startOfDay(currentDate),
    end: setHours(startOfDay(currentDate), 23)
  });

  const filteredBookings = bookings.filter(b => 
    (b.callerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (b.bookingPurpose?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
  });

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Calendar</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage your AI-booked appointments</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-[var(--bg-card)] rounded-xl p-1 border border-[var(--border-main)]">
            {(['day', 'week', 'month'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  view === v 
                    ? "bg-[var(--brand-primary)] text-white shadow-lg shadow-brand-primary/20" 
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="p-2.5 bg-[var(--brand-primary)] text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between bg-[var(--bg-card)]/50 p-4 rounded-2xl border border-[var(--border-main)]">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold text-[var(--text-main)] min-w-[200px]">
            {format(currentDate, view === 'day' ? "MMMM d, yyyy" : "MMMM yyyy")}
          </h2>
          <div className="flex items-center space-x-1">
            <button 
              onClick={prevPeriod}
              className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
            >
              Today
            </button>
            <button 
              onClick={nextPeriod}
              className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookings..."
              className="bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--brand-primary)]/50 transition-all w-64 text-[var(--text-main)]"
            />
          </div>
          <button 
            onClick={() => setSearchQuery("")}
            className="p-2 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 glass-card overflow-hidden flex flex-col min-h-[600px]">
        {view === 'month' ? (
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-7 border-b border-[var(--border-main)] bg-[var(--bg-card)]/30">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="p-4 text-center border-r border-[var(--border-main)] last:border-r-0">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{d}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 grid-rows-5">
              {monthDays.map((day, i) => (
                <div 
                  key={i} 
                  className={`p-2 border-r border-b border-[var(--border-main)] last:border-r-0 min-h-[120px] ${
                    !isSameMonth(day, currentDate) ? "bg-[var(--bg-main)]/50" : ""
                  } ${isToday(day) ? "bg-[var(--brand-primary)]/5" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold ${
                      isToday(day) ? "bg-[var(--brand-primary)] text-white w-6 h-6 flex items-center justify-center rounded-full" : "text-[var(--text-muted)]"
                    }`}>
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {filteredBookings
                      .filter(b => isSameDay(b.parsedDate, day))
                      .slice(0, 3)
                      .map(b => (
                        <div key={b.id} className="text-[10px] p-1 bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 rounded text-[var(--brand-primary)] truncate">
                          {format(b.parsedDate, "h:mm")} {b.callerName}
                        </div>
                      ))}
                    {filteredBookings.filter(b => isSameDay(b.parsedDate, day)).length > 3 && (
                      <div className="text-[10px] text-[var(--text-muted)] pl-1">
                        + {filteredBookings.filter(b => isSameDay(b.parsedDate, day)).length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Days Header */}
            <div className={`grid ${view === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-8'} border-b border-[var(--border-main)] bg-[var(--bg-card)]/30`}>
              <div className="p-4 border-r border-[var(--border-main)]"></div>
              {weekDays.map((day, i) => (
                <div 
                  key={i} 
                  className={`p-4 text-center border-r border-[var(--border-main)] last:border-r-0 ${
                    isToday(day) ? "bg-[var(--brand-primary)]/5" : ""
                  }`}
                >
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
                    {format(day, "EEE")}
                  </p>
                  <p className={`text-lg font-bold ${
                    isToday(day) ? "text-[var(--brand-primary)]" : "text-[var(--text-main)]"
                  }`}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              <div className={`grid ${view === 'day' ? 'grid-cols-[80px_1fr]' : 'grid-cols-8'} min-h-full`}>
                {/* Time Column */}
                <div className="border-r border-[var(--border-main)] bg-[var(--bg-card)]/10">
                  {hours.map((hour, i) => (
                    <div key={i} className="h-20 p-2 text-right border-b border-[var(--border-main)]/50">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                        {format(hour, "ha")}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((day, dayIdx) => {
                  const dayBookings = filteredBookings
                    .filter(b => isSameDay(b.parsedDate, day))
                    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
                  
                  const layoutMap = new Map();
                  const columns: any[][] = [];

                  dayBookings.forEach(event => {
                    let colIdx = 0;
                    while (columns[colIdx] && columns[colIdx].some(e => {
                      const eStart = e.parsedDate.getTime();
                      const eEnd = eStart + 60 * 60 * 1000;
                      const eventStart = event.parsedDate.getTime();
                      const eventEnd = eventStart + 60 * 60 * 1000;
                      return (eventStart < eEnd && eventEnd > eStart);
                    })) {
                      colIdx++;
                    }
                    if (!columns[colIdx]) columns[colIdx] = [];
                    columns[colIdx].push(event);
                    layoutMap.set(event.id, { colIdx });
                  });

                  dayBookings.forEach(event => {
                    const eventStart = event.parsedDate.getTime();
                    const eventEnd = eventStart + 60 * 60 * 1000;
                    const overlaps = dayBookings.filter(other => {
                      const otherStart = other.parsedDate.getTime();
                      const otherEnd = otherStart + 60 * 60 * 1000;
                      return (eventStart < otherEnd && eventEnd > otherStart);
                    });
                    
                    const maxCol = Math.max(...overlaps.map(o => layoutMap.get(o.id).colIdx)) + 1;
                    layoutMap.get(event.id).totalCols = maxCol;
                  });

                  return (
                    <div key={dayIdx} className="relative border-r border-[var(--border-main)] last:border-r-0">
                      {hours.map((_, i) => (
                        <div key={i} className="h-20 border-b border-[var(--border-main)]/50"></div>
                      ))}

                      {/* Bookings */}
                      {dayBookings.map((booking) => {
                        const startHour = booking.parsedDate.getHours();
                        const startMin = booking.parsedDate.getMinutes();
                        const top = (startHour * 80) + (startMin / 60 * 80);
                        const layout = layoutMap.get(booking.id);
                        const width = 100 / layout.totalCols;
                        const left = layout.colIdx * width;
                        
                        return (
                          <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute p-1 rounded-lg bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 shadow-lg backdrop-blur-sm z-10 cursor-pointer hover:bg-[var(--brand-primary)]/20 transition-all group overflow-hidden"
                            style={{ 
                              top: `${top}px`, 
                              height: '76px',
                              left: `${left}%`,
                              width: `${width}%`
                            }}
                          >
                            <div className="flex flex-col h-full justify-between">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">
                                    {format(booking.parsedDate, "h:mm a")}
                                  </span>
                                  <MoreVertical className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-xs font-bold text-[var(--text-main)] truncate mt-0.5">
                                  {booking.callerName || "Guest User"}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2 text-[10px] text-[var(--text-muted)]">
                                <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{booking.bookingPurpose || "Appointment"}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Appointment Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-6">Add Appointment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Customer Name</label>
                  <input 
                    type="text" 
                    value={newBooking.callerName}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, callerName: e.target.value }))}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--brand-primary)] transition-all text-[var(--text-main)]" 
                    placeholder="John Doe" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Date</label>
                    <input 
                      type="date" 
                      value={newBooking.date}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--brand-primary)] transition-all text-[var(--text-main)]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Time</label>
                    <input 
                      type="time" 
                      value={newBooking.time}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--brand-primary)] transition-all text-[var(--text-main)]" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Purpose</label>
                  <textarea 
                    value={newBooking.bookingPurpose}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, bookingPurpose: e.target.value }))}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--brand-primary)] transition-all h-24 text-[var(--text-main)]" 
                    placeholder="Consultation..."
                  ></textarea>
                </div>
              </div>
              <div className="flex space-x-3 mt-8">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-[var(--bg-card-hover)] text-[var(--text-main)] font-bold rounded-xl hover:opacity-80 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveAppointment}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-[var(--brand-primary)] text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
