import React, { useState } from "react";
import { 
  HelpCircle, 
  Book, 
  MessageCircle, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Search,
  ExternalLink,
  FileText,
  Zap,
  Shield,
  Settings,
  Send,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../components/Toast";

const FAQ_ITEMS = [
  {
    question: "What is Vico Assistant?",
    answer: "Vico Assistant is an AI-powered receptionist that handles your phone calls, answers questions, and books appointments automatically. It uses advanced voice AI to provide a human-like experience for your callers."
  },
  {
    question: "How do I set up my AI agent?",
    answer: "Go to the 'Agent' tab in your dashboard. There you can customize your agent's name, voice, and personality. You can also provide specific business instructions and a knowledge base for the AI to learn from."
  },
  {
    question: "Can I use my own phone number?",
    answer: "Yes! You can forward your existing business number to the unique Vico number provided in your 'Links' tab. This allows Vico to intercept calls when you're busy or after hours."
  },
  {
    question: "How does appointment booking work?",
    answer: "Vico integrates with your calendar. When a caller wants to book an appointment, the AI checks your availability and schedules the meeting directly. You'll receive a notification and the call will be logged in your 'Recent Calls' inbox."
  },
  {
    question: "What languages does Vico support?",
    answer: "Currently, Vico supports English, Spanish, and Tagalog. We are constantly adding support for more languages to help you serve a global audience."
  },
  {
    question: "How do I view my call history?",
    answer: "All calls handled by Vico are logged in the 'Recent Calls' section of your dashboard. You can see the caller's name, number, call duration, and a complete transcript of the conversation."
  },
  {
    question: "What are 'Credits' and how do they work?",
    answer: "Credits are used to pay for the AI's time on the phone. Each call deducts credits based on its duration. You can purchase more credits in the 'Billing' section of your account."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we take security very seriously. All call data and transcripts are encrypted and stored securely in our database. We do not share your data with third parties."
  }
];

const DOCS_SECTIONS = [
  {
    title: "Getting Started",
    icon: Zap,
    items: [
      "Quick Start Guide",
      "Account Setup",
      "First Call Configuration",
      "Understanding the Dashboard"
    ]
  },
  {
    title: "Agent Customization",
    icon: Settings,
    items: [
      "Voice Persona Selection",
      "Writing Effective Instructions",
      "Knowledge Base Best Practices",
      "Using Dynamic Variables"
    ]
  },
  {
    title: "Integrations",
    icon: ExternalLink,
    items: [
      "Connecting Botcake",
      "Calendar Synchronization",
      "Webhook Configuration",
      "API Documentation"
    ]
  },
  {
    title: "Security & Privacy",
    icon: Shield,
    items: [
      "Data Protection",
      "Call Recording Policies",
      "Compliance Information",
      "Terms of Service"
    ]
  },
  {
    title: "Billing & Credits",
    icon: FileText,
    items: [
      "Pricing Plans",
      "Managing Credits",
      "Invoice History",
      "Refund Policy"
    ]
  }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      showToast("Message sent! We'll get back to you soon.", "success");
      setContactForm({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  const filteredFaqs = FAQ_ITEMS.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Hero Section */}
      <div className="text-center space-y-4 pt-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-full text-sm font-bold uppercase tracking-wider"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help Center</span>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl font-bold text-[var(--text-main)] tracking-tight"
        >
          How can we help you today?
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto"
        >
          Find answers to common questions, explore our documentation, or get in touch with our support team.
        </motion.p>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-xl mx-auto mt-8 relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all shadow-lg"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQ Section */}
        <div className="lg:col-span-2 space-y-12">
          <section className="space-y-6">
            <div className="flex items-center space-x-3 mb-6">
              <MessageCircle className="w-6 h-6 text-[var(--brand-primary)]" />
              <h2 className="text-2xl font-bold text-[var(--text-main)]">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((item, index) => (
                  <motion.div 
                    key={index}
                    layout
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl overflow-hidden"
                  >
                    <button 
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-card-hover)] transition-colors"
                    >
                      <span className="font-bold text-[var(--text-main)]">{item.question}</span>
                      {openFaq === index ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
                    </button>
                    <AnimatePresence>
                      {openFaq === index && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-6 pb-4 text-[var(--text-muted)] leading-relaxed"
                        >
                          {item.answer}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 bg-[var(--bg-card)] rounded-2xl border border-dashed border-[var(--border-main)]">
                  <p className="text-[var(--text-muted)]">No results found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </section>

          {/* Contact Form Section */}
          <section className="glass-card p-8 space-y-6">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-[var(--brand-primary)]" />
              <h2 className="text-2xl font-bold text-[var(--text-main)]">Send us a message</h2>
            </div>
            <p className="text-[var(--text-muted)]">Can't find what you're looking for? Fill out the form below and we'll get back to you within 24 hours.</p>
            
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Your Name</label>
                  <input 
                    type="text" 
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Subject</label>
                <input 
                  type="text" 
                  required
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all"
                  placeholder="How can we help?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest ml-1">Message</label>
                <textarea 
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent transition-all resize-none"
                  placeholder="Tell us more about your inquiry..."
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[var(--brand-primary)] text-white font-bold rounded-xl hover:bg-[var(--brand-primary)]/90 transition-all shadow-lg shadow-[var(--brand-primary)]/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        {/* Sidebar / Documentation */}
        <div className="space-y-8">
          <div className="glass-card p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <Book className="w-6 h-6 text-[var(--brand-primary)]" />
              <h2 className="text-xl font-bold text-[var(--text-main)]">Documentation</h2>
            </div>
            <div className="space-y-6">
              {DOCS_SECTIONS.map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="flex items-center space-x-2 text-[var(--text-muted)] font-bold text-[10px] uppercase tracking-widest">
                    <section.icon className="w-3 h-3" />
                    <span>{section.title}</span>
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li key={i}>
                        <a href="#" className="text-sm text-[var(--text-main)] hover:text-[var(--brand-primary)] flex items-center group">
                          <FileText className="w-3 h-3 mr-2 opacity-50 group-hover:opacity-100" />
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-[var(--brand-primary)] p-8 rounded-3xl text-white space-y-6 shadow-xl shadow-[var(--brand-primary)]/20">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Still need help?</h3>
              <p className="text-white/80 mt-2">Our support team is always ready to assist you with any technical or billing questions.</p>
            </div>
            <a 
              href="mailto:hello.vicoapps@gmail.com"
              className="block w-full py-3 bg-white text-[var(--brand-primary)] text-center font-bold rounded-xl hover:bg-white/90 transition-all shadow-lg"
            >
              Email Support
            </a>
            <p className="text-center text-xs text-white/60">hello.vicoapps@gmail.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
