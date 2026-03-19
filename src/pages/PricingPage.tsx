import { Check, Zap, Shield, Rocket, Crown, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { SubscriptionPlan } from "../types";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useState, useEffect } from "react";
import { AuthService } from "../services/authService";
import { useToast } from "../components/Toast";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../constants";

const PLANS = [
  {
    id: SubscriptionPlan.FREE,
    name: "Free",
    price: "0",
    minutes: 60,
    calls: "~24",
    features: ["60 voice minutes", "Basic AI agent", "Public call link", "Call transcripts"],
    icon: Shield,
    color: "zinc"
  },
  {
    id: SubscriptionPlan.STARTER,
    name: "Starter",
    price: "99",
    minutes: 600,
    calls: "~240",
    features: ["600 voice minutes", "Advanced AI agent", "Custom instructions", "Priority support"],
    icon: Zap,
    color: "blue"
  },
  {
    id: SubscriptionPlan.GROWTH,
    name: "Growth",
    price: "249",
    minutes: 1800,
    calls: "~720",
    features: ["1,800 voice minutes", "Multiple agents", "Advanced analytics", "API access"],
    icon: Rocket,
    color: "indigo",
    popular: true
  },
  {
    id: SubscriptionPlan.SCALE,
    name: "Scale",
    price: "499",
    minutes: 4000,
    calls: "~1,600",
    features: ["4,000 voice minutes", "Unlimited agents", "White-labeling", "Dedicated account manager"],
    icon: Crown,
    color: "purple"
  }
];

export default function PricingPage() {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const authState = AuthService.getAuthState();
  const businessId = authState.user?.id;

  useEffect(() => {
    if (!businessId) return;

    const unsubscribe = onSnapshot(doc(db, "businesses", businessId), (doc) => {
      if (doc.exists()) {
        setCurrentPlan(doc.data().plan as SubscriptionPlan);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `businesses/${businessId}`);
    });

    return () => unsubscribe();
  }, [businessId]);

  const handleUpgrade = async (planId: SubscriptionPlan, minutes: number) => {
    if (!businessId) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "businesses", businessId), {
        plan: planId,
        totalMinutes: minutes,
        // We don't reset usedMinutes here, but we could if it's a new billing cycle
      });
      showToast(`Successfully upgraded to ${planId} plan!`, "success");
    } catch (error) {
      console.error("Upgrade error:", error);
      showToast("Failed to upgrade. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const location = useLocation();
  const auth = AuthService.getAuthState();
  const isPublic = !auth.isAuthenticated;

  return (
    <div className="p-8 max-w-7xl mx-auto relative">
      {isPublic && (
        <Link 
          to={ROUTES.HOME}
          className="fixed top-8 left-8 z-50 flex items-center space-x-2 text-zinc-500 hover:text-white transition-colors group bg-zinc-950/50 backdrop-blur-sm p-2 rounded-lg border border-zinc-800"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium tracking-tight">Back to Home</span>
        </Link>
      )}
      
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-white mb-4">Simple, Credit-Based Pricing</h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Choose the plan that fits your business needs. All plans include our core AI features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`relative flex flex-col p-8 rounded-3xl border ${
              plan.popular 
                ? "bg-zinc-900 border-blue-500/50 shadow-2xl shadow-blue-500/10" 
                : "bg-zinc-900/50 border-zinc-800"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                Most Popular
              </div>
            )}

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
              plan.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
              plan.color === 'indigo' ? 'bg-indigo-500/10 text-indigo-400' :
              plan.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
              'bg-zinc-800 text-zinc-400'
            }`}>
              <plan.icon className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
            <div className="flex items-baseline space-x-1 mb-6">
              <span className="text-4xl font-bold text-white">${plan.price}</span>
              <span className="text-zinc-500">/month</span>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 text-center">
                <p className="text-2xl font-bold text-white">{plan.minutes.toLocaleString()}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Voice Minutes</p>
                <p className="text-[10px] text-zinc-600 mt-1">{plan.calls} calls/month</p>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start space-x-3 text-sm text-zinc-400">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={currentPlan === plan.id || loading}
              onClick={() => handleUpgrade(plan.id, plan.minutes)}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${
                currentPlan === plan.id
                  ? "bg-zinc-800 text-zinc-500 cursor-default"
                  : plan.popular
                  ? "bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                  : "bg-white text-zinc-950 hover:bg-zinc-200"
              }`}
            >
              {currentPlan === plan.id ? "Current Plan" : "Upgrade Now"}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 p-8 bg-zinc-900/50 border border-zinc-800 rounded-3xl text-center">
        <h3 className="text-xl font-bold text-white mb-2">Need a custom plan?</h3>
        <p className="text-zinc-400 mb-6">We offer enterprise solutions for businesses with high call volumes.</p>
        <button className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors">
          Contact Sales
        </button>
      </div>
    </div>
  );
}
