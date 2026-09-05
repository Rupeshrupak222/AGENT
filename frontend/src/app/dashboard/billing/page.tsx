"use client";
import { useState, useEffect } from "react";
import {
  CheckCircle2, Zap,
  Clock, Users, ArrowRight, RefreshCw, AlertCircle, Headphones, PhoneCall, Target, CalendarClock
} from "lucide-react";
import { motion } from "framer-motion";
import { apiClient, tenantApi, TenantUsage } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

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
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const toast = useToast();

  const fetchBillingInfo = async () => {
    try {
      setLoading(true);
      setBillingError(null);
      const [plansRes, subRes, usageRes] = await Promise.all([
        apiClient.get("/billing/plans"),
        apiClient.get("/billing/subscription"),
        tenantApi.usage(),
      ]);
      setPlans(plansRes.data || {});
      setSubscription(subRes.data || null);
      setUsage(usageRes || null);
    } catch (err) {
      console.error("Billing fetch error:", err);
      setBillingError("Couldn't load billing details from the backend. Please try again.");
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
      toast.error(`Plan change failed: ${err?.response?.data?.message?.[0] || err?.message || "Could not update subscription."}`);
    } finally {
      setUpgradingPlan(null);
    }
  };

  const planExpiresAt = subscription?.planExpiresAt
    ? new Date(subscription.planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Subscription & Billing</h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Manage your plan, calling minutes allocation, and payment history.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
            Current Plan: <strong className="capitalize">{subscription?.plan || "—"}</strong>
          </span>
        </div>
      </div>

      {billingError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm font-medium flex items-center gap-2" role="alert">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {billingError}
          <button onClick={fetchBillingInfo} className="ml-auto px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-colors">
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          {successMessage}
        </motion.div>
      )}

      {/* Usage Meter Card */}
      <div className="rounded-2xl p-6 panel-card border border-slate-200 dark:border-white/[0.08] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500 dark:text-brand-400" />
              Workspace Usage
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">Live counts from your workspace this billing cycle</p>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-white/60">
            {loading ? "Loading…" : (
              <>
                <strong className="text-slate-900 dark:text-white">
                  {usage?.callCount ?? "—"}
                </strong>{" "}
                calls this month
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
          <div>
            <p className="text-slate-500 dark:text-white/40 flex items-center gap-1.5">
              <PhoneCall className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" /> Calls (this month)
            </p>
            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1 block">
              {loading ? "—" : (usage?.callCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div>
            <p className="text-slate-500 dark:text-white/40 flex items-center gap-1.5">
              <Headphones className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Active AI Agents
            </p>
            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1 block">
              {loading ? "—" : (usage?.agentCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div>
            <p className="text-slate-500 dark:text-white/40 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Team Members
            </p>
            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1 block">
              {loading ? "—" : (usage?.userCount ?? 0).toLocaleString()}
            </span>
          </div>
          <div>
            <p className="text-slate-500 dark:text-white/40 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> Leads Tracked
            </p>
            <span className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-1 block">
              {loading ? "—" : (usage?.leadCount ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 pt-5 border-t border-slate-200 dark:border-white/[0.06] text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/40">
            <CalendarClock className="w-3.5 h-3.5" />
            Renewal date:{" "}
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {planExpiresAt ?? "—"}
            </span>
            <span className="text-white/30">(not set if plan is annual/unbilled)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-white/40">
            <Zap className="w-3.5 h-3.5" />
            Minutes allowance:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {subscription?.plan
                ? (PLANS_DISPLAY[subscription.plan]?.features?.[1] || "See plan below")
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Tiers */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Available Plans</h2>
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
                className={`relative flex flex-col justify-between rounded-2xl p-6 panel-card ${
                  info.popular
                    ? "border-brand-500/50 shadow-2xl shadow-brand-950/40 ring-1 ring-brand-500/30"
                    : isCurrent
                    ? "border-emerald-500/40 shadow-xl"
                    : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                {info.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-brand-600 to-rose-600 text-white uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white capitalize">{key}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-1.5 min-h-[36px]">{info.desc}</p>

                  <div className="my-6">
                    <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">{priceDisplay}</span>
                    {priceDisplay !== "Custom" && <span className="text-xs text-slate-500 dark:text-white/40 ml-1">/ month</span>}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 dark:text-white/70 border-t border-slate-200 dark:border-white/[0.06] pt-5">
                    {info.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/5 cursor-default"
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
                          : "bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.15] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
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
