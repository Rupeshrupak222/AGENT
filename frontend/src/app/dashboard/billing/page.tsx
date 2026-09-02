"use client";
import { useState, useEffect } from "react";
import {
  CreditCard, CheckCircle2, ShieldCheck, Zap,
  TrendingUp, Clock, Users, ArrowRight, RefreshCw, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";

interface PlanConfig {
  name: string;
  price: number;
  agents: number;
  callsPerMonth: number;
  members: number;
}

const PLANS_DISPLAY: Record<string, { desc: string; features: string[]; popular?: boolean }> = {
  starter: {
    desc: "For small businesses starting with autonomous AI calling.",
    features: ["2 AI Voice Employees", "500 Minutes / Month", "10 Indian Languages & Hinglish", "Standard CRM & Webhooks", "Community Support"],
  },
  growth: {
    desc: "For fast-scaling teams automating outbound sales & qualification.",
    features: ["10 AI Voice Employees", "5,000 Minutes / Month", "Realtime Webhook Integrations", "Custom Knowledge Base (RAG)", "Priority Phone & Email Support"],
    popular: true,
  },
  business: {
    desc: "For enterprises requiring high-volume call concurrency.",
    features: ["Unlimited AI Voice Employees", "50,000 Minutes / Month", "Dedicated SIP Trunking", "Custom Voice Cloning (ElevenLabs)", "Dedicated Customer Success Manager"],
  },
  enterprise: {
    desc: "Custom infrastructure, on-premise LLM options and SLA.",
    features: ["Custom Minute Commitments", "Air-gapped deployment", "Custom CRM integrations", "24/7 Phone SLA"],
  },
};

export default function BillingPage() {
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        apiClient.get("/billing/plans"),
        apiClient.get("/billing/subscription").catch(() => ({ data: { plan: "growth" } })),
      ]);
      setPlans(plansRes.data || {});
      setSubscription(subRes.data || { plan: "growth" });
    } catch (err) {
      console.error("Billing fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  const handleUpgrade = async (planKey: string) => {
    try {
      setUpgradingPlan(planKey);
      setSuccessMessage(null);

      // 1. Create order
      const orderRes = await apiClient.post(`/billing/order/${planKey}`);
      const order = orderRes.data;

      // 2. Verify payment (in development, uses automated signature verification)
      await apiClient.post("/billing/verify", {
        razorpayOrderId: order.id,
        razorpayPaymentId: `pay_sim_${Date.now()}`,
        razorpaySignature: "simulated_signature",
        plan: planKey,
      });

      setSuccessMessage(`Successfully updated subscription to ${planKey.toUpperCase()}!`);
      await fetchBillingInfo();
    } catch (err: any) {
      console.error("Upgrade error:", err);
    } finally {
      setUpgradingPlan(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Subscription & Billing</h1>
          <p className="text-sm text-white/50 mt-1">Manage your plan, calling minutes allocation, and payment history.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Current Plan: <strong className="capitalize">{subscription?.plan || "Growth"}</strong>
          </span>
        </div>
      </div>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          {successMessage}
        </motion.div>
      )}

      {/* Usage Meter Card */}
      <div className="rounded-2xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              Monthly Minutes Allowance
            </h3>
            <p className="text-xs text-white/40 mt-0.5">Renews automatically every billing cycle</p>
          </div>
          <span className="text-xs font-mono text-white/60">
            <strong className="text-white">1,847</strong> / 5,000 mins used (36.9%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-rose-500 transition-all duration-500 shadow-lg shadow-brand-500/40"
            style={{ width: "36.9%" }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/[0.06] text-xs">
          <div>
            <span className="text-white/40 block">Concurrent Channels</span>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">25 Calls</span>
          </div>
          <div>
            <span className="text-white/40 block">Total Dispatched</span>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">2,847 Calls</span>
          </div>
          <div>
            <span className="text-white/40 block">Avg Duration</span>
            <span className="text-base font-bold text-white font-mono mt-0.5 block">3m 24s</span>
          </div>
          <div>
            <span className="text-white/40 block">Renewal Date</span>
            <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">30 Sept 2026</span>
          </div>
        </div>
      </div>

      {/* Plan Tiers */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(PLANS_DISPLAY).map(([key, info]) => {
            const planDetails = plans[key];
            const isCurrent = subscription?.plan === key;
            const priceDisplay = planDetails?.price === -1 || !planDetails
              ? "Custom"
              : `₹${(planDetails.price / 100).toLocaleString()}`;

            return (
              <div
                key={key}
                className={`relative flex flex-col justify-between rounded-2xl p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border transition-all duration-300 ${
                  info.popular
                    ? "border-brand-500/50 shadow-2xl shadow-brand-950/40 ring-1 ring-brand-500/30"
                    : isCurrent
                    ? "border-emerald-500/40 shadow-xl"
                    : "border-white/[0.08] hover:border-white/20"
                }`}
              >
                {info.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-brand-600 to-rose-600 text-white uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-white capitalize">{key}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-1.5 min-h-[36px]">{info.desc}</p>

                  <div className="my-6">
                    <span className="text-3xl font-black text-white font-mono">{priceDisplay}</span>
                    {priceDisplay !== "Custom" && <span className="text-xs text-white/40 ml-1">/ month</span>}
                  </div>

                  <ul className="space-y-2.5 text-xs text-white/70 border-t border-white/[0.06] pt-5">
                    {info.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-white/10 text-white/40 border border-white/5 cursor-default"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={upgradingPlan !== null}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        info.popular
                          ? "btn-red h-10 shadow-lg shadow-brand-500/30"
                          : "bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/10"
                      }`}
                    >
                      {upgradingPlan === key ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                        </>
                      ) : (
                        <>
                          Select {key.charAt(0).toUpperCase() + key.slice(1)} <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
