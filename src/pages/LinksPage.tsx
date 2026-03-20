import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link as LinkIcon, Copy, ExternalLink, Check, Share2, Globe, Shield, Zap, MessageSquare, CheckCircle } from "lucide-react";
import { ROUTES } from "../constants";
import { motion } from "framer-motion";
import { AuthService } from "../services/authService";
import { Logo } from "../components/Logo";
import { useToast } from "../components/Toast";

export default function LinksPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;
  
  if (!businessId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const shareableUrl = `${window.location.origin}/call/${businessId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    showToast("Link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-main">Shareable Links</h1>
          <p className="text-muted mt-1">Manage and share your AI agent with the world.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-info/10 rounded-2xl border border-info/20">
                <Globe className="w-6 h-6 text-info" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-main">Public Voice Agent Link</h3>
                <p className="text-sm text-muted">This link allows anyone to call your AI agent directly.</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-card border border-border-main rounded-xl">
              <div className="flex-1 truncate font-mono text-sm text-muted">
                {shareableUrl}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleCopy}
                  className="p-2 hover:bg-muted/10 rounded-lg text-muted hover:text-main transition-all"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-info" /> : <Copy className="w-4 h-4" />}
                </button>
                <a 
                  href={shareableUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted/10 rounded-lg text-muted hover:text-main transition-all"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-border-main">
              <div className="flex items-center space-x-2 text-xs text-muted">
                <Shield className="w-3 h-3 text-info" />
                <span>Automatically updated with your agent settings</span>
              </div>
              <button 
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'Call my AI Agent',
                        url: shareableUrl
                      });
                    } catch (error) {
                      if ((error as Error).name !== 'AbortError') {
                        console.error('Error sharing:', error);
                        handleCopy();
                      }
                    }
                  } else {
                    handleCopy();
                  }
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6 border-info/20 bg-info/5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-info/20 rounded-2xl border border-info/30 shadow-lg shadow-info/10">
                <MessageSquare className="w-6 h-6 text-info" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-main">Botcake / Facebook Flow Link</h3>
                <p className="text-sm text-muted">Personalize calls by fetching customer names from Botcake.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-card border border-border-main rounded-xl">
                <div className="flex-1 truncate font-mono text-sm text-info/80">
                  {`${window.location.origin}/botcake/${businessId}?psid={{psid}}`}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/botcake/${businessId}?psid={{psid}}`);
                    showToast("Botcake link copied!", "success");
                  }}
                  className="p-2 hover:bg-muted/10 rounded-lg text-muted hover:text-main transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-muted/5 rounded-xl border border-border-main/50">
                <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Setup Instructions</h4>
                <ol className="list-decimal list-inside text-xs text-muted space-y-2 leading-relaxed">
                  <li>Go to your <span className="text-info font-bold underline cursor-pointer" onClick={() => navigate(ROUTES.SETTINGS)}>Settings</span> and enter your Botcake API Key and Page ID.</li>
                  <li>In your Botcake Flow, add a "Button" or "Card" with a "Web URL" action.</li>
                  <li>Paste the link above into the URL field. Botcake will automatically replace <code className="text-info bg-info/10 px-1 rounded">{"{{psid}}"}</code> with the customer's ID.</li>
                  <li>When clicked, your AI agent will greet the customer by their Facebook name!</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6 border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-main">Call Result Link</h3>
                <p className="text-sm text-muted">Send customers a summary of their call via Messenger.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-card border border-border-main rounded-xl">
                <div className="flex-1 truncate font-mono text-sm text-emerald-500/80">
                  {`${window.location.origin}/call-status/${businessId}?psid={{psid}}`}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/call-status/${businessId}?psid={{psid}}`);
                    showToast("Call result link copied!", "success");
                  }}
                  className="p-2 hover:bg-muted/10 rounded-lg text-muted hover:text-main transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-muted/5 rounded-xl border border-border-main/50">
                <h4 className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Botcake Integration</h4>
                <ol className="list-decimal list-inside text-xs text-muted space-y-2 leading-relaxed">
                  <li>In your Botcake Flow, add a <span className="text-emerald-500 font-bold">4-minute delay</span> node after the call button.</li>
                  <li>Add a "Send Message" node with a button linking to the URL above.</li>
                  <li>The customer will receive a personalized summary and booking confirmation automatically!</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-lg font-semibold text-main mb-4">How it works</h3>
            <div className="space-y-4">
              {[
                {
                  icon: Zap,
                  title: "Real-time Sync",
                  description: "Any changes you make to your agent's voice, personality, or instructions are immediately updated on your public link."
                },
                {
                  icon: Shield,
                  title: "Secure Connection",
                  description: "All calls are encrypted and handled securely through our high-performance voice infrastructure."
                },
                {
                  icon: Globe,
                  title: "Global Access",
                  description: "Your link works anywhere in the world, allowing customers to reach your business 24/7."
                }
              ].map((item, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <div className="p-2 bg-muted/10 rounded-lg mt-1">
                    <item.icon className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-main">{item.title}</h4>
                    <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-info/5 border-info/10">
            <h3 className="text-sm font-bold text-info uppercase tracking-widest mb-4">Quick Preview</h3>
            <div className="aspect-video bg-card rounded-xl border border-border-main flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-info/5 group-hover:bg-info/10 transition-colors" />
              <div className="relative z-10 flex flex-col items-center space-y-2">
                <Logo iconSize={32} />
                <span className="text-[10px] font-bold text-muted uppercase tracking-widest">Voice Interface</span>
              </div>
            </div>
            <p className="text-xs text-muted mt-4 leading-relaxed">
              This is what your customers will see when they visit your shareable link.
            </p>
            <a 
              href={shareableUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 w-full flex items-center justify-center space-x-2 py-2 bg-card border border-border-main rounded-xl text-xs font-bold text-main hover:bg-muted/10 transition-all"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Preview Page</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
