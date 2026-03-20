import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { ROUTES } from "../constants";
import { 
  Zap, Clock, ArrowRight, MessageSquare, Calendar, Users, 
  Bot, CheckCircle2, TrendingUp, Shield, Smartphone, Play, Mic
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
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30 overflow-hidden font-sans">
      {/* Background Glows (Solid Colors, No Gradients) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to={ROUTES.HOME} className="relative z-10">
            <Logo iconSize={32} showText={true} textSize="text-2xl" />
          </Link>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-gray-400">
            <a href="#problem" className="hover:text-white transition-colors">Problem</a>
            <a href="#solution" className="hover:text-white transition-colors">Solution</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <Link to={ROUTES.LOGIN} className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link 
              to={ROUTES.ONBOARDING}
              className="px-5 py-2.5 bg-white text-black rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]"
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
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span>Vico AI is now live for Messenger</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.1] mb-6">
              Turn Every Inquiry Into a <br/>
              <span className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">
                Booked Appointment
              </span>
              <br/>Automatically.
            </h1>
            <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-xl leading-relaxed">
              Vico is your 24/7 AI voice employee that instantly replies, answers questions, and books customers directly from Facebook Messenger.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link 
                to={ROUTES.ONBOARDING}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-full text-lg font-bold hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center space-x-2 group"
              >
                <span>Get More Bookings</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white rounded-full text-lg font-bold hover:bg-white/10 transition-all border border-white/10 flex items-center justify-center space-x-2 backdrop-blur-sm">
                <Play className="w-5 h-5" />
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
            <div className="relative w-[300px] h-[600px] bg-[#0a0a0a] rounded-[3rem] border-[8px] border-[#1a1a1a] shadow-[0_0_50px_rgba(37,99,235,0.3)] overflow-hidden flex flex-col z-20">
              {/* Phone Notch */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                <div className="w-32 h-6 bg-[#1a1a1a] rounded-b-3xl"></div>
              </div>
              
              {/* Phone Screen Content */}
              <div className="flex-1 bg-[#050505] p-4 pt-12 flex flex-col items-center relative overflow-hidden">
                {/* Call Header */}
                <div className="w-full flex flex-col items-center gap-1 pb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Live Call</span>
                  </div>
                  <div className="text-white/50 text-sm font-mono">00:42</div>
                </div>

                {/* Pulsing AI Avatar / Soundwave */}
                <div className="relative w-32 h-32 flex items-center justify-center mb-6 shrink-0">
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full bg-blue-600"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="absolute inset-4 rounded-full bg-blue-500"
                  />
                  <div className="relative w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)] z-10">
                    <Mic size={32} className="text-white" />
                  </div>
                </div>

                {/* Live Transcription Bubbles */}
                <div className="w-full flex flex-col gap-2 relative z-20">
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="self-start bg-[#111] border border-white/10 text-white p-2.5 rounded-2xl rounded-tl-sm text-xs max-w-[85%] shadow-lg"
                  >
                    <span className="text-blue-400 font-bold text-[9px] tracking-wider uppercase block mb-0.5">Vico AI</span>
                    Hello! Vico Dental, how can I help you today?
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 2.0 }}
                    className="self-end bg-blue-900/20 border border-blue-500/20 text-white p-2.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%] shadow-lg"
                  >
                    <span className="text-gray-400 font-bold text-[9px] tracking-wider uppercase block mb-0.5">Caller</span>
                    I need an appointment for tomorrow afternoon.
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 3.5 }}
                    className="self-start bg-[#111] border border-white/10 text-white p-2.5 rounded-2xl rounded-tl-sm text-xs max-w-[85%] shadow-lg"
                  >
                    <span className="text-blue-400 font-bold text-[9px] tracking-wider uppercase block mb-0.5">Vico AI</span>
                    I have an opening at 2:00 PM. Shall I book that?
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 5.0 }}
                    className="self-end bg-blue-900/20 border border-blue-500/20 text-white p-2.5 rounded-2xl rounded-tr-sm text-xs max-w-[85%] shadow-lg"
                  >
                    <span className="text-gray-400 font-bold text-[9px] tracking-wider uppercase block mb-0.5">Caller</span>
                    Yes, 2:00 PM works perfectly!
                  </motion.div>
                </div>

                {/* Booking Card */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ delay: 6.5, type: "spring" }}
                  className="absolute bottom-4 left-4 right-4 bg-[#0a1f16] border border-emerald-500/30 rounded-xl p-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] z-30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-bold text-emerald-400">Appointment Confirmed</p>
                  </div>
                  <div className="bg-[#050505] rounded-lg p-2 border border-white/5">
                    <p className="text-xs text-gray-400">Date & Time</p>
                    <p className="text-sm text-white font-medium">Tomorrow, 2:00 PM</p>
                  </div>
                </motion.div>
              </div>
            </div>
            
            {/* Floating elements around the phone */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 top-20 p-3 rounded-xl bg-[#111] border border-blue-500/30 shadow-xl z-30 flex items-center gap-2"
              style={{ translateZ: 50, x: useTransform(translateX, v => v * 1.5), y: useTransform(translateY, v => v * 1.5) }}
            >
              <Mic size={14} className="text-blue-400 animate-pulse" />
              <span className="text-xs font-medium text-white">Voice AI Active</span>
            </motion.div>

            <motion.div 
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-4 bottom-32 p-3 rounded-xl bg-[#0a1f16] border border-emerald-500/30 shadow-xl z-30 flex items-center gap-2"
              style={{ translateZ: 80, x: useTransform(translateX, v => v * 0.8), y: useTransform(translateY, v => v * 0.8) }}
            >
              <Calendar size={14} className="text-emerald-400" />
              <span className="text-xs font-medium text-white">Synced</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 2. PAIN POINT SECTION */}
      <section id="problem" className="py-32 px-6 relative z-10 border-t border-white/5 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Still Losing Customers to <span className="text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.3)]">Slow Replies?</span></h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">When you rely on manual responses or generic auto-replies, your business suffers.</p>
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
                  className="flex items-start space-x-4 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 text-red-400" />
                  </div>
                  <p className="text-gray-300 text-lg pt-1">{item.text}</p>
                </motion.div>
              ))}
            </div>

            <div className="relative h-[400px] rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden flex items-center justify-center p-8 perspective-1000">
              <div className="absolute inset-0 bg-red-500/5" />
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
                  className="p-4 rounded-2xl bg-[#111] border border-red-500/20 self-start w-3/4 shadow-xl"
                >
                  <p className="text-sm text-gray-400">Customer</p>
                  <p className="text-white">Hi, do you have any availability today?</p>
                  <p className="text-xs text-red-400 mt-2">Sent 2 hours ago • Unread</p>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 10, translateZ: -20 }}
                  whileInView={{ opacity: 1, y: 0, translateZ: 0 }}
                  transition={{ delay: 0.5 }}
                  className="p-4 rounded-2xl bg-[#111] border border-red-500/20 self-start w-3/4 ml-auto opacity-50 shadow-xl"
                >
                  <p className="text-sm text-gray-400">Customer</p>
                  <p className="text-white">Nevermind, I booked somewhere else.</p>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SOLUTION SECTION */}
      <section id="solution" className="py-32 px-6 relative z-10 border-t border-white/5 bg-[#050505] overflow-hidden">
        {/* Parallax Background Elements */}
        <motion.div 
          className="absolute top-[20%] left-[5%] w-64 h-64 rounded-full border border-blue-500/10"
          style={{ y: useTransform(scrollY, [0, 3000], [0, 300]), rotate: useTransform(scrollY, [0, 3000], [0, 180]) }}
        />
        <motion.div 
          className="absolute bottom-[10%] right-[5%] w-96 h-96 rounded-full border border-blue-500/5"
          style={{ y: useTransform(scrollY, [0, 3000], [0, -300]), rotate: useTransform(scrollY, [0, 3000], [0, -90]) }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Meet Vico — Your AI Employee <br/><span className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">That Never Sleeps</span></h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
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
                className="p-8 rounded-3xl bg-[#0a0a0a] border border-white/5 hover:bg-[#111] hover:border-blue-500/30 transition-all group shadow-lg hover:shadow-[0_0_30px_rgba(37,99,235,0.2)] preserve-3d"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all transform-gpu translate-z-10">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 transform-gpu translate-z-10">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed transform-gpu translate-z-10">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-32 px-6 relative z-10 border-t border-white/5 bg-[#080808] overflow-hidden">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-blue-600/5 blur-[100px] pointer-events-none"
          style={{ y: useTransform(scrollY, [0, 4000], [200, -200]) }}
        />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">How It Works</h2>
            <p className="text-gray-400 text-lg">Three simple steps to automated revenue.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative perspective-1000">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-blue-500/20 -translate-y-1/2 z-0" />

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
                className="relative z-10 p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 text-center transition-all duration-300 shadow-2xl hover:shadow-[0_0_40px_rgba(37,99,235,0.2)]"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold shadow-[0_0_30px_rgba(37,99,235,0.4)] mb-6">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. BENEFITS SECTION */}
      <section className="py-32 px-6 relative z-10 border-t border-white/5 bg-[#050505]">
        <div className="max-w-7xl mx-auto bg-blue-900/10 rounded-[3rem] border border-blue-500/20 p-12 md:p-20 overflow-hidden relative perspective-1000">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/noise/1000/1000')] opacity-5 mix-blend-overlay pointer-events-none" />
          
          <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">More Bookings.<br/>Less Work.</h2>
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
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-lg text-gray-200">{benefit}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <div className="relative preserve-3d">
              <motion.div 
                animate={{ rotateY: [-5, 5, -5], rotateX: [5, -5, 5] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="glass-card p-8 rounded-3xl border border-white/10 shadow-2xl bg-[#0a0a0a] backdrop-blur-xl"
                style={{ y: useTransform(scrollY, [0, 5000], [100, -100]) }}
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="text-sm text-gray-400">Monthly Bookings</p>
                    <p className="text-4xl font-bold text-white">+342%</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                <div className="h-32 flex items-end space-x-2">
                  {[40, 30, 50, 40, 60, 80, 100].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }}
                      className="flex-1 bg-blue-500 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="py-40 px-6 relative z-10 text-center bg-[#080808]">
        <motion.div 
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">
            Let Your AI Handle the <span className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]">Conversations</span>
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Join hundreds of businesses automating their bookings and scaling their revenue with Vico.
          </p>
          <Link 
            to={ROUTES.ONBOARDING}
            className="inline-flex items-center justify-center space-x-2 px-10 py-5 bg-white text-black rounded-full text-xl font-bold hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)] group"
          >
            <span>Start Automating Today</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 relative z-10 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <Logo iconSize={24} showText={true} textSize="text-xl" />
          </div>
          <div className="text-sm text-gray-500">
            © 2026 Vico AI. All rights reserved.
          </div>
          <div className="flex space-x-6 text-sm text-gray-400">
            <Link to={ROUTES.PRIVACY} className="hover:text-white transition-colors">Privacy</Link>
            <Link to={ROUTES.TERMS} className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
