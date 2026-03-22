import { Shield, Lock, Eye, Globe, Mail, Phone, Building, CheckCircle2, AlertCircle, Cookie, ArrowLeft } from "lucide-react";
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

export default function CookiePolicy() {
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
          <Cookie className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-5xl font-bold text-white tracking-tight leading-tight">Cookie <span className="text-blue-400">Policy</span>.</h1>
        <p className="text-zinc-500 text-lg leading-relaxed">Last updated: October 25, 2023. We use cookies to improve your experience on our platform.</p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        <Section title="What are Cookies?" icon={Eye}>
          <p>Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the owners of the site.</p>
          <p>Cookies help us understand how you interact with our platform, which features you use most, and how we can improve your overall experience.</p>
        </Section>

        <Section title="How We Use Cookies" icon={Globe}>
          <p>We use cookies for several purposes, including:</p>
          <ul className="space-y-4 list-none">
            {[
              "Essential cookies: Necessary for the platform to function properly",
              "Performance cookies: To analyze how users interact with our platform",
              "Functionality cookies: To remember your preferences and settings",
              "Targeting cookies: To deliver relevant advertisements and content",
              "Social media cookies: To allow you to share content on social networks"
            ].map((item, i) => (
              <li key={i} className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Managing Cookies" icon={Lock}>
          <p>You can control and manage cookies in your browser settings. Most browsers allow you to block or delete cookies, but this may affect the functionality of our platform.</p>
          <p>For more information on how to manage cookies, please visit your browser's help center or visit <a href="https://www.allaboutcookies.org" className="text-blue-500 hover:text-blue-400 transition-colors">www.allaboutcookies.org</a>.</p>
        </Section>

        <div className="glass-card p-10 text-center space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Need Help?</h2>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto leading-relaxed">If you have any questions about our Cookie Policy, please contact our support team.</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-4">
            <div className="flex items-center space-x-3 px-6 py-3 bg-zinc-900 rounded-2xl border border-zinc-800">
              <Mail className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">support@vicoapps.com</span>
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
