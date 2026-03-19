import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "../constants";
import { Zap, Shield, Clock, Phone, ArrowRight, MessageSquare, Calendar, Users } from "lucide-react";
import { Logo } from "../components/Logo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to={ROUTES.HOME}>
            <Logo />
          </Link>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="hover:text-white transition-colors">Solutions</a>
            <Link to={ROUTES.PRICING} className="hover:text-white transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link to={ROUTES.LOGIN} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              to={ROUTES.ONBOARDING}
              className="px-5 py-2.5 bg-white text-zinc-950 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all shadow-lg shadow-white/5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest border border-blue-500/20 mb-8 inline-block">
              The Future of Business Communication
            </span>
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tighter leading-[0.9] mb-8">
              AI Receptionist that <br />
              <span className="text-zinc-500 italic">actually</span> works.
            </h1>
            <p className="max-w-2xl mx-auto text-zinc-400 text-lg md:text-xl mb-12">
              Automate your customer service, bookings, and inquiries with human-like AI agents that sound natural and never miss a call.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to={ROUTES.ONBOARDING}
                className="w-full sm:w-auto px-8 py-4 bg-blue-500 text-zinc-950 rounded-full text-lg font-bold hover:bg-blue-400 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center space-x-2 group"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-zinc-900 text-white rounded-full text-lg font-bold hover:bg-zinc-800 transition-all border border-zinc-800">
                Book a Demo
              </button>
            </div>
          </motion.div>

          {/* Dashboard Preview */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-24 relative"
          >
            <div className="absolute inset-0 bg-blue-500/20 blur-[120px] rounded-full -z-10" />
            <div className="glass-card p-2 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <img 
                src="https://picsum.photos/seed/dashboard/1920/1080" 
                alt="Dashboard Preview" 
                className="w-full rounded-2xl shadow-inner"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Natural Voice AI</h3>
              <p className="text-zinc-500 leading-relaxed">
                Powered by ElevenLabs and Gemini, our agents sound human and handle complex conversations with ease.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Smart Bookings</h3>
              <p className="text-zinc-500 leading-relaxed">
                Seamlessly integrates with your calendar to schedule appointments and manage your time automatically.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Secure & Reliable</h3>
              <p className="text-zinc-500 leading-relaxed">
                Enterprise-grade security and 99.9% uptime ensure your business is always connected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 border-t border-zinc-900 bg-zinc-900/30">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-left max-w-md">
            <h2 className="text-3xl font-bold text-white mb-4">Trusted by 500+ businesses worldwide</h2>
            <p className="text-zinc-500">From local clinics to global startups, Vico is the backbone of modern communication.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
            <div className="h-8 w-32 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="col-span-2 md:col-span-1 space-y-6">
            <Link to={ROUTES.HOME}>
              <Logo textSize="text-2xl" />
            </Link>
            <p className="text-zinc-500 text-sm">Empowering businesses with intelligent voice automation.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Legal</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link to={ROUTES.PRIVACY} className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to={ROUTES.TERMS} className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link to={ROUTES.COOKIES} className="hover:text-white transition-colors">Cookies</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-zinc-900 text-center text-zinc-600 text-xs">
          © 2026 Vico. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
