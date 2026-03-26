import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Link as LinkIcon, Copy, ExternalLink, Check, Share2, Globe, Shield, Zap, MessageSquare } from "lucide-react";
import { ROUTES, PRODUCTION_URL } from "../constants";
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
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const shareableUrl = `${PRODUCTION_URL}/call/${businessId}`;
  const botcakeUrl = `${PRODUCTION_URL}/botcake/${businessId}?psid={{psid}}`;

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
          <h1 className="text-4xl font-bold text-[var(--text-main)]">Shareable Links</h1>
          <p className="text-[var(--text-muted)] mt-1">Manage and share your AI agent with the world.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-main)]">Public Voice Agent Link</h3>
                <p className="text-sm text-[var(--text-muted)]">This link allows anyone to call your AI agent directly.</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl">
              <div className="flex-1 truncate font-mono text-sm text-[var(--text-muted)]">
                {shareableUrl}
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleCopy}
                  className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                  title="Copy link"
                >
                  {copied ? <Check className="w-4 h-4 text-blue-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <a 
                  href={shareableUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-[var(--border-main)]">
              <div className="flex items-center space-x-2 text-xs text-[var(--text-muted)]">
                <Shield className="w-3 h-3 text-blue-400" />
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
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-400 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6 border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30 shadow-lg shadow-blue-500/10">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-main)]">Botcake / Facebook Flow Link</h3>
                <p className="text-sm text-[var(--text-muted)]">Personalize calls by fetching customer names from Botcake.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl">
                <div className="flex-1 truncate font-mono text-sm text-blue-400/80">
                  {botcakeUrl}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(botcakeUrl);
                    showToast("Botcake link copied!", "success");
                  }}
                  className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-[var(--bg-card)]/50 rounded-xl border border-[var(--border-main)]/50">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Setup Instructions</h4>
                <ol className="list-decimal list-inside text-xs text-[var(--text-muted)] space-y-2 leading-relaxed">
                  <li>Go to your <span className="text-[var(--brand-primary)] font-bold underline cursor-pointer" onClick={() => navigate(ROUTES.SETTINGS)}>Settings</span> and enter your Botcake API Key and Page ID.</li>
                  <li>In your Botcake Flow, add a "Button" or "Card" with a "Web URL" action.</li>
                  <li>Paste the link above into the URL field. Botcake will automatically replace <code className="text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1 rounded">{"{{psid}}"}</code> with the customer's ID.</li>
                  <li>When clicked, your AI agent will greet the customer by their Facebook name!</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 space-y-6 border-green-500/20 bg-green-500/5">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-500/20 rounded-2xl border border-green-500/30 shadow-lg shadow-green-500/10">
                <LinkIcon className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-main)]">Call Result Link</h3>
                <p className="text-sm text-[var(--text-muted)]">Send this link to callers so they can view the summary and status of their call.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-4 bg-[var(--bg-main)] border border-[var(--border-main)] rounded-xl">
                <div className="flex-1 truncate font-mono text-sm text-green-400/80">
                  {`${PRODUCTION_URL}/call-status/${businessId}?psid={{psid}}`}
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${PRODUCTION_URL}/call-status/${businessId}?psid={{psid}}`);
                    showToast("Call Result link copied!", "success");
                  }}
                  className="p-2 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 bg-[var(--bg-card)]/50 rounded-xl border border-[var(--border-main)]/50">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Usage Instructions</h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Use this link in your Botcake flow after a call is completed. Botcake will replace <code className="text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 px-1 rounded">{"{{psid}}"}</code> with the customer's ID, allowing them to see their specific call result.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8">
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-4">How it works</h3>
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
                  <div className="p-2 bg-[var(--bg-card-hover)] rounded-lg mt-1">
                    <item.icon className="w-4 h-4 text-[var(--brand-primary)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-main)]">{item.title}</h4>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-blue-500/5 border-blue-500/10">
            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-4">Quick Preview</h3>
            <div className="aspect-video bg-[var(--bg-main)] rounded-xl border border-[var(--border-main)] flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
              <div className="relative z-10 flex flex-col items-center space-y-2">
                <Logo iconSize={32} />
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Voice Interface</span>
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4 leading-relaxed">
              This is what your customers will see when they visit your shareable link.
            </p>
            <a 
              href={shareableUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 w-full flex items-center justify-center space-x-2 py-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-all"
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
