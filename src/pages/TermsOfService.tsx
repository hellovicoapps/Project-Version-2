import { Shield, Lock, Eye, Globe, Mail, Phone, Building, CheckCircle2, AlertCircle, FileText, ArrowLeft, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "../constants";

const Section = ({ title, icon: Icon, children }: any) => (
  <div className="glass-card p-10 space-y-6">
    <div className="flex items-center space-x-4">
      <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
        <Icon className="w-6 h-6 text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
    </div>
    <div className="h-px bg-zinc-900" />
    <div className="space-y-6 text-zinc-400 leading-relaxed text-lg font-medium">
      {children}
    </div>
  </div>
);

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto space-y-12 py-12 px-6 relative">
      <Link 
        to={ROUTES.HOME}
        className="fixed top-8 left-8 z-50 flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors group bg-zinc-950/50 backdrop-blur-sm p-2 rounded-lg border border-zinc-800"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium tracking-tight">Back to Home</span>
      </Link>

      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4">
          <FileText className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">Terms of <span className="text-blue-400">Service</span>.</h1>
        <p className="text-zinc-500 text-lg leading-relaxed">Last updated: October 25, 2023. These terms govern your use of the Vico platform and services.</p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        <Section title="Acceptance of Terms" icon={CheckCircle2}>
          <p>By accessing or using Vico, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
          <p>We reserve the right to modify these terms at any time. Your continued use of the service after any such changes constitutes your acceptance of the new Terms of Service.</p>
        </Section>

        <Section title="Use License" icon={Globe}>
          <p>Permission is granted to temporarily download one copy of the materials (information or software) on Vico's website for personal, non-commercial transitory viewing only.</p>
          <p>This is the grant of a license, not a transfer of title, and under this license you may not:</p>
          <ul className="space-y-4 list-none">
            {[
              "Modify or copy the materials",
              "Use the materials for any commercial purpose",
              "Attempt to decompile or reverse engineer any software",
              "Remove any copyright or other proprietary notations",
              "Transfer the materials to another person or 'mirror' the materials"
            ].map((item, i) => (
              <li key={i} className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Service Availability" icon={Activity}>
          <p>Vico strives to provide 99.9% uptime for its services. However, we do not guarantee that the service will be uninterrupted or error-free. We reserve the right to suspend or terminate the service for maintenance, updates, or any other reason without prior notice.</p>
          <p>We are not liable for any loss of data, revenue, or business opportunities resulting from service interruptions or technical failures.</p>
        </Section>

        <div className="glass-card p-10 text-center space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Questions?</h2>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">If you have any questions about our Terms of Service, please contact our legal team.</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
            <div className="flex items-center space-x-3 px-6 py-3 bg-zinc-900 rounded-2xl border border-zinc-800">
              <Mail className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">legal@vicoapps.com</span>
            </div>
            <div className="flex items-center space-x-3 px-6 py-3 bg-zinc-900 rounded-2xl border border-zinc-800">
              <Building className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Vico HQ, San Francisco, CA</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
