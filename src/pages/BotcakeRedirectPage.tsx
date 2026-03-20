import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Business } from "../types";
import { ROUTES } from "../constants";
import { Loader2, AlertCircle } from "lucide-react";

export default function BotcakeRedirectPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleRedirect() {
      if (!businessId) {
        setError("Invalid business ID");
        return;
      }

      const psid = searchParams.get("psid");
      if (!psid) {
        // If no PSID, just redirect to the normal call page
        navigate(`/call/${businessId}`);
        return;
      }

      try {
        // 1. Fetch business data for Botcake credentials
        const businessDoc = await getDoc(doc(db, "businesses", businessId));
        if (!businessDoc.exists()) {
          setError("Business not found");
          return;
        }

        const businessData = businessDoc.data() as Business;
        const { botcakeApiKey, botcakePageId } = businessData;

        if (!botcakeApiKey || !botcakePageId) {
          console.warn("Botcake credentials not configured for this business");
          navigate(`/call/${businessId}?psid=${psid}`);
          return;
        }

        // 2. Fetch user info from Botcake via our proxy
        const response = await fetch(`/api/botcake/user?pageId=${botcakePageId}&psid=${psid}&apiKey=${botcakeApiKey}`);
        
        if (!response.ok) {
          console.error("Failed to fetch Botcake user info");
          navigate(`/call/${businessId}?psid=${psid}`);
          return;
        }

        const botcakeData = await response.json();
        const userName = botcakeData.data?.full_name || botcakeData.data?.first_name || "";

        // 3. Redirect to call page with user info
        const params = new URLSearchParams();
        if (userName) params.set("userName", userName);
        params.set("psid", psid);
        
        navigate(`/call/${businessId}?${params.toString()}`);
      } catch (err) {
        console.error("Botcake redirect error:", err);
        navigate(`/call/${businessId}?psid=${psid}`);
      }
    }

    handleRedirect();
  }, [businessId, searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-[var(--color-danger)]/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-[var(--color-danger)]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Redirect Error</h1>
          <p className="text-[var(--text-muted)]">{error}</p>
          <button 
            onClick={() => navigate("/")}
            className="w-full py-3 bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)]/80 text-white font-bold rounded-xl transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col items-center justify-center p-6 space-y-6">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">Connecting to Agent...</h2>
        <p className="text-[var(--text-muted)] animate-pulse">Fetching your profile from Botcake</p>
      </div>
    </div>
  );
}
