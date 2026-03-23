import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ROUTES } from "../constants";
import { 
  Zap, Clock, ArrowRight, MessageSquare, Calendar, Users, 
  Bot, CheckCircle2, TrendingUp, Shield, Smartphone, Play, Mic,
  Star, ChevronLeft, ChevronRight
} from "lucide-react";
import { Logo } from "../components/Logo";
import React from "react";

export default function LandingPage() {
  const { scrollYProgress, scrollY } = useScroll();
  
  // 3D Mouse tracking for Hero
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });
  
  const rotateX = useTransform(springY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-15, 15]);
  const translateX = useTransform(springX, [-0.5, 0.5], [-30, 30]);
  const translateY = useTransform(springY, [-0.5, 0.5], [-30, 30]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-[var(--brand-primary)]/30 overflow-hidden font-sans">
      {/* Background Glows (Solid Colors, No Gradients) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--brand-primary)]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--brand-secondary)]/5 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-blue-600 border-b border-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to={ROUTES.HOME} className="relative z-10">
            <Logo iconSize={32} showText={true} textSize="text-2xl" textColor="text-white" />
          </Link>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-blue-100">
            <a href="#problem" className="hover:text-white transition-colors">Problem</a>
            <a href="#solution" className="hover:text-white transition-colors">Solution</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <Link to={ROUTES.LOGIN} className="text-sm font-medium text-blue-100 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link 
              to={ROUTES.ONBOARDING}
              className="px-5 py-2.5 bg-white text-blue-600 rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-black/10"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section 
        className="relative pt-40 pb-20 px-6 z-10 min-h-screen flex flex-col justify-center perspective-1000"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-left relative z-20"
            style={{
              rotateX: useTransform(springY, [-0.5, 0.5], [5, -5]),
              rotateY: useTransform(springX, [-0.5, 0.5], [-5, 5])
            }}
          >
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-secondary)]"></span>
              </span>
              <span>Vico AI is now live for Messenger</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-display font-bold uppercase tracking-wide leading-[1.1] mb-6 text-[var(--text-main)]">
              Turn Every Inquiry Into a <br/>
              <span className="text-[var(--brand-primary)] drop-shadow-sm">
                Booked Appointment
              </span>
              <br/>Automatically.
            </h1>
            <p className="text-[var(--text-muted)] text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
              Vico is your 24/7 AI voice employee that instantly replies, answers questions, and books customers directly from Facebook Messenger.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link 
                to={ROUTES.ONBOARDING}
                className="w-full sm:w-auto px-8 py-4 bg-[var(--brand-primary)] text-white rounded-full text-lg font-bold hover:scale-105 transition-all shadow-xl shadow-[var(--brand-primary)]/20 flex items-center justify-center space-x-2 group"
              >
                <span>Get More Bookings</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-[var(--bg-card)] text-[var(--text-main)] rounded-full text-lg font-bold hover:bg-[var(--bg-card-hover)] transition-all border border-[var(--border-main)] flex items-center justify-center space-x-2 shadow-sm">
                <Play className="w-5 h-5 text-[var(--brand-primary)]" />
                <span>See Demo</span>
              </button>
            </div>
          </motion.div>

          {/* Hero 3D Visual Simulation */}
          <motion.div 
            className="relative h-[600px] w-full hidden lg:flex justify-center items-center preserve-3d"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{ 
              rotateX, 
              rotateY,
              y: useTransform(scrollY, [0, 1000], [0, -150])
            }}
          >
            {/* Phone Frame */}
            <div className="relative w-[300px] h-[600px] bg-white rounded-[3rem] border-[8px] border-slate-200 shadow-2xl overflow-hidden flex flex-col z-20">
              {/* Phone Notch */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                <div className="w-32 h-6 bg-slate-200 rounded-b-3xl"></div>
              </div>
              
              {/* Phone Screen Content */}
              <div className="flex-1 bg-slate-50 p-4 pt-12 flex flex-col items-center relative overflow-hidden">
                {/* Call Header */}
                <div className="w-full flex flex-col items-center gap-1 pb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 text-xs font-bold tracking-widest uppercase">Live Call</span>
                  </div>
                  <div className="text-slate-400 text-sm font-mono">00:42</div>
                </div>

                {/* Pulsing AI Avatar / Soundwave */}
                <div className="relative w-32 h-32 flex items-center justify-center mb-6 shrink-0">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-[var(--brand-primary)]"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.05, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute inset-4 rounded-full bg-[var(--brand-primary)]"
                  />
                  <div className="relative w-16 h-16 rounded-full bg-[var(--brand-primary)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/30 z-10">
                    <Mic size={32} className="text-white" />
                  </div>
                </div>

                {/* Live Transcription Bubbles */}
                <div className="w-full flex flex-col gap-2 relative z-20">
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="self-start bg-white border border-slate-200 text-slate-800 p-2.5 rounded-2xl rounded-tl-sm text-xs max-w-[85%] shadow-sm"
                  >
                    <span className="text-[var(--brand-primary)] font-bold text-[9px] tracking-wider uppercase block mb-0.5">Vico AI</span>
                    Hello! Vico Dental, how can I help you today?
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 2.0 }}
                    className="self-end bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-slate-800 p-2.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%] shadow-sm"
                  >
                    <span className="text-slate-500 font-bold text-[9px] tracking-wider uppercase block mb-0.5">Caller</span>
                    I need an appointment for tomorrow afternoon.
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 3.5 }}
                    className="self-start bg-white border border-slate-200 text-slate-800 p-2.5 rounded-2xl rounded-tl-sm text-xs max-w-[85%] shadow-sm"
                  >
                    <span className="text-[var(--brand-primary)] font-bold text-[9px] tracking-wider uppercase block mb-0.5">Vico AI</span>
                    I have an opening at 2:00 PM. Shall I book that?
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 5.0 }}
                    className="self-end bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 text-slate-800 p-2.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%] shadow-sm"
                  >
                    <span className="text-slate-500 font-bold text-[9px] tracking-wider uppercase block mb-0.5">Caller</span>
                    Yes, 2:00 PM works perfectly!
                  </motion.div>
                </div>
              </div>
            </div>
            
            {/* Floating elements around the phone */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, x: 20 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              transition={{ delay: 6.5, type: "spring" }}
              className="absolute -right-20 bottom-40 w-[240px] bg-white border border-emerald-200 rounded-2xl p-4 shadow-2xl z-40"
              style={{ translateZ: 100, x: useTransform(translateX, v => v * 2), y: useTransform(translateY, v => v * 2) }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
                <p className="text-base font-bold text-emerald-700">Appointment Confirmed</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                <p className="text-sm text-slate-800 font-bold">Tomorrow, 2:00 PM</p>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 top-20 p-3 rounded-xl bg-white border border-slate-200 shadow-xl z-30 flex items-center gap-2"
              style={{ translateZ: 50, x: useTransform(translateX, v => v * 1.5), y: useTransform(translateY, v => v * 1.5) }}
            >
              <Mic size={14} className="text-[var(--brand-primary)] animate-pulse" />
              <span className="text-xs font-medium text-slate-800">Voice AI Active</span>
            </motion.div>

            <motion.div 
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-4 bottom-32 p-3 rounded-xl bg-white border border-emerald-200 shadow-xl z-30 flex items-center gap-2"
              style={{ translateZ: 80, x: useTransform(translateX, v => v * 0.8), y: useTransform(translateY, v => v * 0.8) }}
            >
              <Calendar size={14} className="text-emerald-600" />
              <span className="text-xs font-medium text-slate-800">Synced</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. PAIN POINT SECTION */}
      <section id="problem" className="py-32 px-6 relative z-10 border-t border-[var(--border-main)] bg-[var(--bg-card)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-wide mb-6 text-[var(--text-main)]">Still Losing Customers to <span className="text-red-500">Slow Replies?</span></h2>
            <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">When you rely on manual responses or generic auto-replies, your business suffers.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                { icon: Clock, text: "Customers message your page... but get ignored or delayed replies." },
                { icon: MessageSquare, text: "Generic auto-replies frustrate potential clients." },
                { icon: Users, text: "Your staff wastes hours answering the same repetitive questions." },
                { icon: TrendingUp, text: "Inquiries don't turn into actual bookings, costing you revenue." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -50, rotateY: -10 }}
                  whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                  className="flex items-start space-x-4 p-6 rounded-2xl bg-white border border-[var(--border-main)] hover:shadow-md hover:scale-[1.02] transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-red-500" />
                  </div>
                  <p className="text-[var(--text-main)] text-lg pt-1">{item.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="relative h-[400px] rounded-3xl border border-[var(--border-main)] bg-white overflow-hidden flex items-center justify-center p-8 perspective-1000 shadow-sm">
              <div className="absolute inset-0 bg-red-50" />
              <motion.div 
                className="w-full max-w-sm space-y-4 relative z-10 preserve-3d"
                initial={{ opacity: 0, rotateX: 20 }}
                whileInView={{ opacity: 1, rotateX: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                style={{ y: useTransform(scrollY, [0, 2000], [0, -100]) }}
              >
                {/* Simulated missed messages */}
                <motion.div 
                  animate={{ opacity: [0.5, 1, 0.5], translateZ: [0, 20, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="p-4 rounded-2xl bg-white border border-red-200 self-start w-3/4 shadow-md"
                >
                  <p className="text-sm text-[var(--text-muted)]">Customer</p>
                  <p className="text-[var(--text-main)]">Hi, do you have any availability today?</p>
                  <p className="text-xs text-red-500 mt-2">Sent 2 hours ago • Unread</p>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10, translateZ: -20 }}
                  whileInView={{ opacity: 1, y: 0, translateZ: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-4 rounded-2xl bg-white border border-red-200 self-start w-3/4 ml-auto opacity-50 shadow-md"
                >
                  <p className="text-sm text-[var(--text-muted)]">Customer</p>
                  <p className="text-[var(--text-main)]">Nevermind, I booked somewhere else.</p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOLUTION SECTION */}
      <section id="solution" className="py-32 px-6 relative z-10 bg-blue-600 overflow-hidden">
        {/* Parallax Background Elements */}
        <motion.div 
          className="absolute top-[20%] left-[5%] w-64 h-64 rounded-full border border-white/10"
          style={{ y: useTransform(scrollY, [0, 3000], [0, 300]), rotate: useTransform(scrollY, [0, 3000], [0, 180]) }}
        />
        <motion.div 
          className="absolute bottom-[10%] right-[5%] w-96 h-96 rounded-full border border-white/5"
          style={{ y: useTransform(scrollY, [0, 3000], [0, -300]), rotate: useTransform(scrollY, [0, 3000], [0, -90]) }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-wide mb-6 text-white">Meet Vico — Your AI Employee <br/><span className="text-white">That Never Sleeps</span></h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              Vico responds instantly, understands customer intent, and turns conversations into confirmed bookings — all without human effort.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 perspective-1000">
            {[
              { icon: Zap, title: "Instant Replies 24/7", desc: "Never leave a customer waiting. Vico replies in seconds, day or night." },
              { icon: Bot, title: "Smart Conversation AI", desc: "Human-like responses that understand context, nuance, and intent." },
              { icon: Calendar, title: "Automatic Booking", desc: "Integrates with your calendar to schedule appointments seamlessly." },
              { icon: Users, title: "Lead Qualification", desc: "Captures essential customer details before booking the appointment." },
              { icon: MessageSquare, title: "Messenger Integration", desc: "Connects directly to your Facebook Page in one click." },
              { icon: Shield, title: "Enterprise Reliability", desc: "Secure, scalable, and built to handle thousands of inquiries." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 50, rotateX: 20 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                whileHover={{ scale: 1.05, rotateY: 5, rotateX: -5, zIndex: 10 }}
                className="p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all group shadow-xl preserve-3d"
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white/30 transition-all transform-gpu translate-z-10">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold uppercase tracking-wide mb-3 transform-gpu translate-z-10 text-white">{feature.title}</h3>
                <p className="text-blue-50 leading-relaxed transform-gpu translate-z-10">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-32 px-6 relative z-10 border-t border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--brand-primary)]/5 blur-[100px] pointer-events-none"
          style={{ y: useTransform(scrollY, [0, 4000], [200, -200]) }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-wide mb-6 text-[var(--text-main)]">How It Works</h2>
            <p className="text-[var(--text-muted)] text-lg">Three simple steps to automated revenue.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative perspective-1000">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-[var(--border-main)] -translate-y-1/2 z-0" />

            {[
              { step: "01", title: "Customer Messages", desc: "A potential client sends a message to your Facebook Page." },
              { step: "02", title: "Vico Engages", desc: "Vico replies instantly, answers questions, and qualifies the lead." },
              { step: "03", title: "Appointment Booked", desc: "Vico secures the booking and syncs it directly to your calendar." }
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.8, rotateY: 45 }}
                whileInView={{ opacity: 1, scale: 1, rotateY: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, type: "spring", stiffness: 80 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="relative z-10 p-8 rounded-3xl bg-white border border-[var(--border-main)] text-center transition-all duration-300 shadow-md hover:shadow-xl"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-2xl font-bold shadow-lg shadow-[var(--brand-primary)]/30 mb-6 text-white">
                  {item.step}
                </div>
                <h3 className="text-2xl font-display font-bold uppercase tracking-wide mb-4 text-[var(--text-main)]">{item.title}</h3>
                <p className="text-[var(--text-muted)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="py-32 px-6 relative z-10 bg-[var(--bg-main)] overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-wide mb-6 text-[var(--text-main)]">
              Trusted by Growing Businesses
            </h2>
            <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">
              Join hundreds of businesses automating their customer calls and scaling their revenue with Vico.
            </p>
          </div>

          <div className="relative overflow-hidden">
            {/* Infinite Marquee Container */}
            <motion.div 
              className="flex gap-6 pb-8"
              animate={{
                x: [0, -1704], // Adjust based on card width (400) + gap (24) * 4
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {[
                {
                  quote: "Vico has completely transformed our clinic's reception. We no longer miss calls during lunch breaks or after hours.",
                  author: "Dr. Sarah Chen",
                  role: "Founder, Smile Dental",
                  image: "https://picsum.photos/seed/sarah/100/100"
                },
                {
                  quote: "The ROI was immediate. We're booking 40% more consultations without adding any staff. It's like magic.",
                  author: "James Wilson",
                  role: "Partner, Wilson Law Group",
                  image: "https://picsum.photos/seed/james/100/100"
                },
                {
                  quote: "Our customers love the instant response. It feels like talking to a real person who actually knows our business.",
                  author: "Elena Rodriguez",
                  role: "Owner, Bloom Boutique",
                  image: "https://picsum.photos/seed/elena/100/100"
                },
                {
                  quote: "Integration was seamless. One click and Vico was handling our Messenger inquiries perfectly. Best decision we made this year.",
                  author: "Mark Thompson",
                  role: "CEO, TechFlow Solutions",
                  image: "https://picsum.photos/seed/mark/100/100"
                },
                // Duplicate for seamless loop
                {
                  quote: "Vico has completely transformed our clinic's reception. We no longer miss calls during lunch breaks or after hours.",
                  author: "Dr. Sarah Chen",
                  role: "Founder, Smile Dental",
                  image: "https://picsum.photos/seed/sarah/100/100"
                },
                {
                  quote: "The ROI was immediate. We're booking 40% more consultations without adding any staff. It's like magic.",
                  author: "James Wilson",
                  role: "Partner, Wilson Law Group",
                  image: "https://picsum.photos/seed/james/100/100"
                },
                {
                  quote: "Our customers love the instant response. It feels like talking to a real person who actually knows our business.",
                  author: "Elena Rodriguez",
                  role: "Owner, Bloom Boutique",
                  image: "https://picsum.photos/seed/elena/100/100"
                },
                {
                  quote: "Integration was seamless. One click and Vico was handling our Messenger inquiries perfectly. Best decision we made this year.",
                  author: "Mark Thompson",
                  role: "CEO, TechFlow Solutions",
                  image: "https://picsum.photos/seed/mark/100/100"
                }
              ].map((testimonial, i) => (
                <div
                  key={i}
                  className="min-w-[300px] md:min-w-[400px] p-8 rounded-[2.5rem] bg-blue-600 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group/card"
                >
                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover/card:bg-white/10 transition-colors" />
                  
                  <div className="relative z-10">
                    <div className="flex text-yellow-400 mb-6 gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} fill="currentColor" strokeWidth={0} />
                      ))}
                    </div>
                    <p className="text-xl md:text-2xl leading-relaxed mb-8 font-medium italic">
                      "{testimonial.quote}"
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 relative z-10 border-t border-white/10 pt-6">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.author} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <p className="font-bold text-lg">{testimonial.author}</p>
                      <p className="text-blue-100 text-sm">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5. BENEFITS SECTION */}
      <section className="py-32 px-6 relative z-10 border-t border-[var(--border-main)] bg-[var(--bg-main)]">
        <div className="max-w-7xl mx-auto bg-[var(--brand-primary)]/5 rounded-[3rem] border border-[var(--brand-primary)]/10 p-12 md:p-20 overflow-hidden relative perspective-1000">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/noise/1000/1000')] opacity-5 mix-blend-overlay pointer-events-none" />
          
          <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-display font-bold uppercase tracking-wide mb-8 text-[var(--text-main)]">More Bookings.<br/>Less Work.</h2>
              <ul className="space-y-6">
                {[
                  "Never miss a customer inquiry again",
                  "Increase conversion from inquiry to booking",
                  "Reduce staff workload and burnout",
                  "Deliver a premium, instant customer experience"
                ].map((benefit, i) => (
                  <motion.li 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.5 }}
                    className="flex items-center space-x-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <span className="text-lg text-[var(--text-main)]">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <div className="relative preserve-3d">
              <motion.div 
                animate={{ rotateY: [-5, 5, -5], rotateX: [5, -5, 5] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="glass-card p-8 rounded-3xl border border-[var(--border-main)] shadow-xl bg-white/80 backdrop-blur-xl"
                style={{ y: useTransform(scrollY, [0, 5000], [100, -100]) }}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">Monthly Bookings</p>
                    <p className="text-4xl font-bold text-[var(--text-main)]">+342%</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-emerald-500 drop-shadow-sm" />
                </div>
                <div className="h-32 flex items-end space-x-2">
                  {[40, 30, 50, 40, 60, 80, 100].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }}
                      className="flex-1 bg-[var(--brand-primary)] rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="py-40 px-6 relative z-10 text-center bg-[var(--bg-card)] border-t border-[var(--border-main)]">
        <motion.div 
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-7xl font-display font-bold uppercase tracking-wide mb-8 text-[var(--text-main)]">
            Let Your AI Handle the <span className="text-[var(--brand-primary)]">Conversations</span>
          </h2>
          <p className="text-xl text-[var(--text-muted)] mb-12">
            Join hundreds of businesses automating their bookings and scaling their revenue with Vico.
          </p>
          <Link 
            to={ROUTES.ONBOARDING}
            className="inline-flex items-center justify-center space-x-2 px-10 py-5 bg-[var(--brand-primary)] text-white rounded-full text-xl font-bold hover:bg-[var(--brand-secondary)] hover:scale-105 transition-all shadow-lg shadow-[var(--brand-primary)]/30 group"
          >
            <span>Start Automating Today</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-24 border-t border-[var(--border-main)] relative z-10 bg-[var(--bg-main)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2 space-y-6">
              <Logo iconSize={32} showText={true} textSize="text-2xl" />
              <p className="text-[var(--text-muted)] text-lg max-w-sm leading-relaxed">
                Vico AI is your enterprise-grade voice receptionist that works 24/7, books appointments, and handles customer inquiries with human-like precision.
              </p>
            </div>
            <div>
              <h4 className="text-[var(--text-main)] font-bold mb-6 uppercase tracking-widest text-xs">Product</h4>
              <ul className="space-y-4 text-[var(--text-muted)]">
                <li><a href="#problem" className="hover:text-[var(--brand-primary)] transition-colors">Problem</a></li>
                <li><a href="#solution" className="hover:text-[var(--brand-primary)] transition-colors">Solution</a></li>
                <li><a href="#how-it-works" className="hover:text-[var(--brand-primary)] transition-colors">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[var(--text-main)] font-bold mb-6 uppercase tracking-widest text-xs">Legal</h4>
              <ul className="space-y-4 text-[var(--text-muted)]">
                <li><Link to={ROUTES.PRIVACY} className="hover:text-[var(--brand-primary)] transition-colors">Privacy Policy</Link></li>
                <li><Link to={ROUTES.TERMS} className="hover:text-[var(--brand-primary)] transition-colors">Terms of Service</Link></li>
                <li><a href="mailto:hello.vicoapps@gmail.com" className="hover:text-[var(--brand-primary)] transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-[var(--border-main)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-sm text-[var(--text-muted)]">
              © 2026 Vico AI. All rights reserved.
            </div>
            <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Status: Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
