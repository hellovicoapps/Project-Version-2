import { Check, Zap, Shield, Rocket, Crown, ArrowLeft, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SubscriptionPlan } from "../types";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useState, useEffect } from "react";
import { AuthService } from "../services/authService";
import { useToast } from "../components/Toast";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "../constants";
import { PayPalButton } from "../components/PayPalButton";

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
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
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

  const handlePaymentSuccess = async (details: any) => {
    if (!businessId || !selectedPlan) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "businesses", businessId), {
        plan: selectedPlan.id,
        totalMinutes: selectedPlan.minutes,
        lastPaymentId: details.id,
        paymentStatus: "completed",
        updatedAt: new Date().toISOString()
      });
      showToast(`Successfully upgraded to ${selectedPlan.name} plan!`, "success");
      setSelectedPlan(null);
    } catch (error) {
      console.error("Upgrade error:", error);
      showToast("Payment successful but failed to update account. Please contact support.", "error");
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
          className="fixed top-8 left-8 z-50 flex items-center space-x-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors group bg-[var(--bg-main)]/50 backdrop-blur-sm p-2 rounded-lg border border-[var(--border-main)]"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium tracking-tight">Back to Home</span>
        </Link>
      )}
      
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold text-[var(--text-main)] mb-4">Simple, Credit-Based Pricing</h1>
        <p className="text-[var(--text-muted)] text-lg max-w-2xl mx-auto">
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
                ? "bg-[var(--bg-card)] border-[var(--brand-primary)]/50 shadow-2xl shadow-[var(--brand-primary)]/10" 
                : "bg-[var(--bg-card)]/50 border-[var(--border-main)]"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--brand-primary)] text-white text-xs font-bold rounded-full uppercase tracking-wider">
                Most Popular
              </div>
            )}

            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
              plan.color === 'blue' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' :
              plan.color === 'indigo' ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' :
              plan.color === 'purple' ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' :
              'bg-[var(--bg-main)] text-[var(--text-muted)]'
            }`}>
              <plan.icon className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">{plan.name}</h3>
            <div className="flex items-baseline space-x-1 mb-6">
              <span className="text-4xl font-bold text-[var(--text-main)]">${plan.price}</span>
              <span className="text-[var(--text-muted)]">/month</span>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              <div className="p-4 bg-[var(--bg-main)]/50 rounded-2xl border border-[var(--border-main)]/50 text-center">
                <p className="text-2xl font-bold text-[var(--text-main)]">{plan.minutes.toLocaleString()}</p>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Voice Minutes</p>
                <p className="text-[10px] text-[var(--text-muted)]/60 mt-1">{plan.calls} calls/month</p>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start space-x-3 text-sm text-[var(--text-muted)]">
                    <Check className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              disabled={currentPlan === plan.id || loading || plan.id === SubscriptionPlan.FREE}
              onClick={() => {
                if (!auth.isAuthenticated) {
                  navigate(ROUTES.LOGIN);
                  return;
                }
                setSelectedPlan(plan);
              }}
              className={`w-full py-4 rounded-2xl font-bold transition-all ${
                currentPlan === plan.id
                  ? "bg-[var(--bg-main)] text-[var(--text-muted)] cursor-default"
                  : plan.popular
                  ? "bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] shadow-lg shadow-[var(--brand-primary)]/20"
                  : "bg-[var(--text-main)] text-[var(--bg-main)] hover:bg-[var(--text-main)]/90"
              }`}
            >
              {currentPlan === plan.id ? "Current Plan" : plan.id === SubscriptionPlan.FREE ? "Free Plan" : "Upgrade Now"}
            </button>
          </motion.div>
        ))}
      </div>

      {/* PayPal Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-[var(--text-main)]">Complete Purchase</h3>
                <button 
                  onClick={() => setSelectedPlan(null)}
                  className="p-2 hover:bg-[var(--bg-main)] rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-8 p-6 bg-[var(--bg-main)] rounded-2xl border border-[var(--border-main)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[var(--text-muted)]">Plan</span>
                  <span className="font-bold text-[var(--text-main)]">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[var(--text-muted)]">Minutes</span>
                  <span className="font-bold text-[var(--text-main)]">{selectedPlan.minutes.toLocaleString()}</span>
                </div>
                <div className="h-px bg-[var(--border-main)] mb-4" />
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-[var(--text-main)]">Total</span>
                  <span className="text-2xl font-bold text-[var(--brand-primary)]">${selectedPlan.price}</span>
                </div>
              </div>

              <PayPalButton 
                amount={selectedPlan.price}
                onSuccess={handlePaymentSuccess}
                onError={(err) => showToast("Payment failed. Please try again.", "error")}
              />

              <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
                Secure payment processed by PayPal. By completing your purchase, you agree to our Terms of Service.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-16 p-8 bg-[var(--bg-card)]/50 border border-[var(--border-main)] rounded-3xl text-center">
        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Need a custom plan?</h3>
        <p className="text-[var(--text-muted)] mb-6">We offer enterprise solutions for businesses with high call volumes.</p>
        <button className="px-8 py-3 bg-[var(--bg-main)] hover:bg-[var(--bg-card)] text-[var(--text-main)] font-bold rounded-xl transition-colors border border-[var(--border-main)]">
          Contact Sales
        </button>
      </div>
    </div>
  );
}
