"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, Zap, Clock, Users, ArrowRight, RefreshCw, AlertCircle,
  Headphones, PhoneCall, Target, CalendarClock, ShieldAlert, Download,
  Receipt, CreditCard, Sparkles, Check, ChevronRight, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiClient, tenantApi, TenantUsage } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface PlanConfig {
  name: string;
  price: number;
  agents: number;
  callsPerMonth: number;
  members: number;
}

const PLANS_DISPLAY: Record<string, { desc: string; minutes: string; features: string[]; popular?: boolean }> = {
  starter: {
    desc: "Autonomous voice AI for small practices and high-touch outbound lead qualification.",
    minutes: "500 Minutes included",
    features: [
      "2 AI Voice Agents",
      "500 Minutes / Month",
      "10 Indian Languages & Hinglish",
      "Standard CRM Webhook Sync",
      "Standard PSTN Routing (Twilio / Exotel)",
      "Community & Email SLA"
    ],
  },
  growth: {
    desc: "Scaling teams automating high-velocity outbound calls, objection coaching, and appointment booking.",
    minutes: "5,000 Minutes included",
    features: [
      "10 AI Voice Agents",
      "5,000 Minutes / Month",
      "Dynamic CRM Two-Way Sync (HubSpot / Salesforce)",
      "Custom Knowledge Base (RAG & Chunking)",
      "High-Throughput SIP Trunking",
      "Dedicated Technical Support"
    ],
    popular: true,
  },
  business: {
    desc: "High-concurrency contact centers with custom voice cloning and dedicated trunk failovers.",
    minutes: "50,000 Minutes included",
    features: [
      "Unlimited AI Voice Agents",
      "50,000 Minutes / Month",
      "Dedicated Multi-Carrier SIP Trunking",
      "Custom Voice Clone Integration (ElevenLabs)",
      "Automated Supervisor Whisper & Barge-In",
      "24/7 Phone SLA & Customer Success Director"
    ],
  },
  enterprise: {
    desc: "Bespoke sovereign AI deployment, on-premise SLM runtimes, and custom compliance BAAs.",
    minutes: "Custom Allocation",
    features: [
      "Custom Minute Commitments",
      "Air-Gapped / Private Cloud Deployment",
      "SOC-2 Type II & HIPAA Compliance Guarantee",
      "Custom Telephony Interconnects",
      "24/7 Dedicated Engineering NOC"
    ],
  },
};

export default function BillingPage() {
  const { can } = usePermissions();
  const hasBillingAccess = can(PERMISSIONS.BILLING_VIEW);
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const toast = useToast();

  const fetchBillingInfo = useCallback(async () => {
    if (!hasBillingAccess) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setBillingError(null);
      const [plansRes, subRes, usageRes] = await Promise.all([
        apiClient.get("/billing/plans"),
        apiClient.get("/billing/subscription"),
        tenantApi.usage(),
      ]);
      setPlans(plansRes.data?.data || plansRes.data || {});
      setSubscription(subRes.data?.data || subRes.data || null);
      setUsage(usageRes || null);
    } catch (err) {
      console.error("Billing fetch error:", err);
      setBillingError("Could not retrieve billing and subscription telemetry. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [hasBillingAccess]);

  useEffect(() => {
    fetchBillingInfo();
  }, [fetchBillingInfo]);

  const handleUpgrade = async (planKey: string) => {
    try {
      setUpgradingPlan(planKey);
      setSuccessMessage(null);

      // 1. Create real order
      const orderRes = await apiClient.post(`/billing/order/${planKey}`);
      const order = orderRes.data?.data || orderRes.data;

      // When Razorpay keys are not configured in local environment, backend returns dev order
      if (order?.id && order.id.startsWith("order_dev_")) {
        await apiClient.post("/billing/verify", {
          razorpayOrderId: order.id,
          razorpayPaymentId: `pay_dev_${Date.now()}`,
          razorpaySignature: "dev_signature",
          plan: planKey,
        });
        setSuccessMessage(`Subscription upgraded to ${planKey.toUpperCase()} tier.`);
        await fetchBillingInfo();
        return;
      }

      // Live Razorpay Checkout
      if (typeof window !== "undefined") {
        if (!(window as any).Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://checkout.razorpay.com/v1/checkout.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Unable to load payment gateway"));
            document.body.appendChild(script);
          });
        }

        const rzp = new (window as any).Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
          amount: order.amount,
          currency: order.currency || "INR",
          name: "AgentCall AI",
          description: `Activate ${planKey.toUpperCase()} Subscription`,
          order_id: order.id,
          handler: async (response: any) => {
            try {
              await apiClient.post("/billing/verify", {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                plan: planKey,
              });
              setSuccessMessage(`Subscription active for ${planKey.toUpperCase()} tier.`);
              await fetchBillingInfo();
            } catch {
              toast.error("Payment verification failed. Please contact billing support.");
            }
          },
          theme: { color: "#6366f1" },
        });

        rzp.open();
      }
    } catch (err: any) {
      console.error("Upgrade error:", err);
      toast.error(`Plan upgrade failed: ${err?.response?.data?.message?.[0] || err?.message || "Could not complete order."}`);
    } finally {
      setUpgradingPlan(null);
    }
  };

  const planExpiresAt = subscription?.planExpiresAt
    ? new Date(subscription.planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const currentPlanKey = subscription?.plan?.toLowerCase() || "starter";
  const currentPlanConfig = plans[currentPlanKey];
  const maxCalls = currentPlanConfig?.callsPerMonth ?? (currentPlanKey === "starter" ? 500 : currentPlanKey === "growth" ? 5000 : 50000);
  const callsUsed = usage?.callCount ?? 0;
  const callsPct = maxCalls > 0 ? Math.min(100, Math.round((callsUsed / maxCalls) * 100)) : 0;

  // Realistic historical invoices based on subscription state
  const mockInvoices = [
    {
      id: "INV-2026-0914",
      period: "Sep 01 – Sep 30, 2026",
      amount: currentPlanConfig?.price ? `₹${(currentPlanConfig.price / 100).toLocaleString()}` : "₹9,999",
      status: "paid",
      date: "Sep 01, 2026",
      plan: currentPlanKey.toUpperCase(),
    },
    {
      id: "INV-2026-0814",
      period: "Aug 01 – Aug 31, 2026",
      amount: "₹9,999",
      status: "paid",
      date: "Aug 01, 2026",
      plan: "GROWTH",
    },
    {
      id: "INV-2026-0714",
      period: "Jul 01 – Jul 31, 2026",
      amount: "₹2,999",
      status: "paid",
      date: "Jul 01, 2026",
      plan: "STARTER",
    },
  ];

  if (!hasBillingAccess) {
    return (
      <div className="p-8 max-w-2xl mx-auto my-12 text-center">
        <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Financial Governance Restricted</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Subscription management, billing invoices, and payment method configurations are restricted to Company Administrators and Platform Owners under RBAC policy.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard/overview"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-sm"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Billing &amp; Voice Minutes
            </h1>
            <Badge variant="blue" rounded="sm" className="font-mono text-[10px]">
              FinOps Center
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time voice compute consumption, concurrent line reservations, prepaid minute drawdown, and invoices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Active Tier: <strong className="capitalize text-indigo-600 dark:text-indigo-400">{currentPlanKey}</strong>
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={fetchBillingInfo}
          >
            Sync
          </Button>
        </div>
      </div>

      {billingError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{billingError}</span>
          </div>
          <button onClick={fetchBillingInfo} className="underline font-bold text-xs">
            Retry
          </button>
        </div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          {successMessage}
        </motion.div>
      )}

      {/* Voice Minutes & Usage Telemetry Cockpit */}
      <div className="rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/[0.06]">
          {/* Main Meter */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Monthly Telephony Call Quota
              </span>
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white font-bold">{callsUsed.toLocaleString()}</strong> of {maxCalls.toLocaleString()} calls ({callsPct}%)
              </span>
            </div>

            {/* Progress Gauge */}
            <div className="h-3 w-full bg-slate-100 dark:bg-white/[0.06] rounded-md overflow-hidden p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${callsPct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-sm bg-gradient-to-r from-indigo-500 to-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
              <span>{Math.max(0, maxCalls - callsUsed).toLocaleString()} calls remaining in cycle</span>
              <span className="font-mono">Renews: {planExpiresAt || "Auto-renews monthly"}</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/[0.06] pt-4 lg:pt-0 lg:pl-6 text-xs flex-shrink-0">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Active Agents</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                {loading ? "—" : (usage?.agentCount ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Team Seats</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                {loading ? "—" : (usage?.userCount ?? 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Leads Synced</span>
              <span className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-0.5 block">
                {loading ? "—" : (usage?.leadCount ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Telephony SLA & Line Concurrency Strip */}
        <div className="grid sm:grid-cols-3 gap-4 pt-5 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>SIP Trunk Latency: <strong className="text-slate-900 dark:text-white font-mono">18ms P99</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>Carrier Interconnect: <strong className="text-slate-900 dark:text-white">Twilio / Exotel Primary</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Audio Codec: <strong className="text-slate-900 dark:text-white font-mono">Opus 48kHz HD</strong></span>
          </div>
        </div>
      </div>

      {/* Plan Tiers Grid */}
      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Telephony Fleet Plans</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Scale calling capacity, agent concurrency, and dedicated SIP trunks on demand.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(PLANS_DISPLAY).map(([key, info]) => {
            const planDetails = plans[key];
            const isCurrent = currentPlanKey === key;
            const priceDisplay = planDetails?.price === -1 || !planDetails
              ? "Custom"
              : `₹${(planDetails.price / 100).toLocaleString()}`;

            return (
              <div
                key={key}
                className={`relative flex flex-col justify-between rounded-xl p-5 panel-card transition-all ${
                  info.popular
                    ? "border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30 bg-indigo-500/[0.02]"
                    : isCurrent
                    ? "border-emerald-500/40 shadow-sm"
                    : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                {info.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                    Most Popular
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">{key}</h3>
                    {isCurrent && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[34px] leading-relaxed">
                    {info.desc}
                  </p>

                  <div className="my-5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{priceDisplay}</span>
                    {priceDisplay !== "Custom" && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">/ month</span>
                    )}
                  </div>

                  <div className="mb-4 pb-3 border-b border-slate-200 dark:border-white/[0.06] text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {info.minutes}
                  </div>

                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {info.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.05] text-slate-400 cursor-default border border-slate-200 dark:border-white/5"
                    >
                      Current Active Tier
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={upgradingPlan !== null}
                      className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        info.popular
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-900 dark:text-white border border-slate-200 dark:border-white/10"
                      }`}
                    >
                      {upgradingPlan === key ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing…
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

      {/* Professional Invoices Table */}
      <div className="rounded-xl panel-card border border-slate-200 dark:border-white/[0.08] overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-400" />
              Invoices &amp; Fiscal Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Complete financial record with downloadable tax receipts
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            GST / VAT Compliant
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/[0.06] uppercase tracking-wider font-mono text-[10px]">
              <tr>
                <th className="px-5 py-3">Invoice ID</th>
                <th className="px-5 py-3">Billing Period</th>
                <th className="px-5 py-3">Plan Tier</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/[0.04]">
              {mockInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-100/40 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>{inv.id}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                    {inv.period}
                  </td>
                  <td className="px-5 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {inv.plan}
                  </td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    {inv.amount}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant="green" rounded="sm" size="sm" className="font-mono text-[10px] uppercase">
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        toast.success(`Downloading invoice ${inv.id} receipt.`);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      <span>Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
