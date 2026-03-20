import { motion } from "framer-motion";
import { Shield, Lock, Eye, Globe, Mail, Phone, Building, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants";

const Section = ({ title, icon: Icon, children }: any) => (
  <div className="glass-card p-10 space-y-6">
    <div className="flex items-center space-x-4">
      <div className="p-3 bg-[var(--brand-primary)]/10 rounded-2xl border border-[var(--brand-primary)]/20">
        <Icon className="w-6 h-6 text-[var(--brand-primary)]" />
      </div>
      <h2 className="text-2xl font-bold text-main tracking-tight">{title}</h2>
    </div>
    <div className="h-px bg-border-main" />
    <div className="space-y-6 text-muted leading-relaxed text-lg font-medium">
      {children}
    </div>
  </div>
);

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-12 px-6 relative">
      <Link 
        to={ROUTES.HOME}
        className="fixed top-8 left-8 z-50 flex items-center space-x-2 text-muted hover:text-main transition-colors group bg-glass-bg backdrop-blur-sm p-2 rounded-lg border border-glass-border"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium tracking-tight">Back to Home</span>
      </Link>

      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex p-3 bg-[var(--brand-primary)]/10 rounded-2xl border border-[var(--brand-primary)]/20 mb-4">
          <Shield className="w-6 h-6 text-[var(--brand-primary)]" />
        </div>
        <h1 className="text-5xl font-bold text-main tracking-tight leading-tight">Privacy <span className="text-[var(--brand-primary)]">Policy</span>.</h1>
        <p className="text-muted text-lg leading-relaxed">Last updated: October 25, 2023. We are committed to protecting your personal data and your privacy.</p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        <Section title="Information We Collect" icon={Eye}>
          <p>We collect information that you provide directly to us when you create an account, use our services, or communicate with us. This includes:</p>
          <ul className="space-y-4 list-none">
            {[
              "Personal identifiers (name, email address, phone number)",
              "Business information (business name, industry, size)",
              "Call recordings and transcripts processed by our AI",
              "Payment information processed securely via PayPal",
              "Technical data (IP address, browser type, device info)"
            ].map((item, i) => (
              <li key={i} className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="How We Use Your Information" icon={Globe}>
          <p>We use the information we collect to provide, maintain, and improve our services, including:</p>
          <ul className="space-y-4 list-none">
            {[
              "Processing and managing your AI receptionist calls",
              "Providing customer support and technical assistance",
              "Sending you technical notices, updates, and security alerts",
              "Personalizing your experience and improving our AI models",
              "Detecting and preventing fraudulent or illegal activity"
            ].map((item, i) => (
              <li key={i} className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Data Security" icon={Lock}>
          <p>We implement enterprise-grade security measures to protect your data from unauthorized access, alteration, disclosure, or destruction. This includes:</p>
          <ul className="space-y-4 list-none">
            {[
              "End-to-end encryption for all voice data and transcripts",
              "Secure, isolated database storage for each business",
              "Regular security audits and vulnerability assessments",
              "Strict access controls for our internal systems",
              "Compliance with industry-standard data protection regulations"
            ].map((item, i) => (
              <li key={i} className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)] flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <div className="glass-card p-10 text-center space-y-6">
          <h2 className="text-2xl font-bold text-main tracking-tight">Contact Us</h2>
          <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed">If you have any questions or concerns about our Privacy Policy, please contact our data protection officer.</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
            <div className="flex items-center space-x-3 px-6 py-3 bg-card rounded-2xl border border-border-main">
              <Mail className="w-5 h-5 text-[var(--brand-primary)]" />
              <span className="text-main font-medium">privacy@vico.ai</span>
            </div>
            <div className="flex items-center space-x-3 px-6 py-3 bg-card rounded-2xl border border-border-main">
              <Building className="w-5 h-5 text-[var(--brand-primary)]" />
              <span className="text-main font-medium">Vico HQ, San Francisco, CA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
