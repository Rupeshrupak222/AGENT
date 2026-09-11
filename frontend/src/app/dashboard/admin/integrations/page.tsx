"use client";

import { useState, useEffect } from "react";
import {
  Plug,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Webhook,
  MessageSquare,
  Mail,
  Phone,
  Bot,
  Database,
  CreditCard,
  Calendar,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { integrationsApi, IntegrationItem } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

const PROVIDER_CONFIG: Record<
  string,
  { icon: any; color: string; description: string }
> = {
  salesforce: {
    icon: Database,
    color: "from-blue-500 to-blue-600",
    description: "CRM integration for syncing leads and call data",
  },
  hubspot: {
    icon: Database,
    color: "from-orange-500 to-orange-600",
    description: "Inbound marketing and CRM platform integration",
  },
  zapier: {
    icon: Webhook,
    color: "from-amber-500 to-orange-500",
    description: "Automation platform connecting 5000+ apps",
  },
  webhook: {
    icon: Webhook,
    color: "from-slate-500 to-slate-600",
    description: "Custom HTTP webhook endpoints for event notifications",
  },
  whatsapp: {
    icon: MessageSquare,
    color: "from-emerald-500 to-emerald-600",
    description: "WhatsApp Business API for messaging automations",
  },
  resend: {
    icon: Mail,
    color: "from-violet-500 to-violet-600",
    description: "Transactional email delivery service",
  },
  twilio: {
    icon: Phone,
    color: "from-red-500 to-red-600",
    description: "Cloud telephony for voice calls and SMS",
  },
  openai: {
    icon: Bot,
    color: "from-teal-500 to-teal-600",
    description: "AI language model for conversation intelligence",
  },
  stripe: {
    icon: CreditCard,
    color: "from-indigo-500 to-indigo-600",
    description: "Payment processing for subscriptions and billing",
  },
  google: {
    icon: Calendar,
    color: "from-blue-400 to-blue-500",
    description: "Google Calendar integration for appointment scheduling",
  },
  calcom: {
    icon: Calendar,
    color: "from-purple-500 to-purple-600",
    description: "Open-source scheduling infrastructure",
  },
};

function IntegrationCard({ item }: { item: IntegrationItem }) {
  const config = PROVIDER_CONFIG[item.provider] || {
    icon: Plug,
    color: "from-slate-500 to-slate-600",
    description: "Third-party integration",
  };
  const Icon = config.icon;

  return (
    <div className="p-5 rounded-xl border bg-white dark:bg-[#120a06]/80 border-slate-200 dark:border-white/[0.07] shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "p-2.5 rounded-xl bg-gradient-to-br text-white shadow-sm",
            config.color
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex items-center gap-2">
          {item.isConfigured ? (
            item.isActive ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertTriangle className="w-3 h-3" />
                Inactive
              </span>
            )
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40">
              <XCircle className="w-3 h-3" />
              Not Configured
            </span>
          )}
        </div>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white capitalize mb-1">
        {item.provider}
      </h3>
      <p className="text-xs text-slate-500 dark:text-white/35 line-clamp-2">
        {config.description}
      </p>
      {item.lastSyncAt && (
        <p className="text-[11px] text-slate-400 dark:text-white/25 mt-3">
          Last synced:{" "}
          {new Date(item.lastSyncAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await integrationsApi.list();
        if (!cancelled) setIntegrations(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load integrations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && integrations.length === 0) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-40 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse"
              />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-8 text-center">
            <XCircle className="w-8 h-8 mx-auto mb-3 text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const activeCount = integrations.filter(
    (i) => i.isConfigured && i.isActive
  ).length;
  const configuredCount = integrations.filter((i) => i.isConfigured).length;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Integrations
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Manage third-party provider connections and integrations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07]">
              <span className="text-xs font-semibold text-slate-600 dark:text-white/60">
                {activeCount} active / {configuredCount} configured
              </span>
            </div>
            <button
              onClick={() => {
                setLoading(true);
                integrationsApi
                  .list()
                  .then(setIntegrations)
                  .catch(() => {})
                  .finally(() => setLoading(false));
              }}
              className="p-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <RefreshCw
                className={cn("w-4 h-4", loading && "animate-spin")}
              />
            </button>
          </div>
        </div>

        {integrations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-12 text-center">
            <Plug className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-white/20" />
            <p className="text-sm text-slate-400 dark:text-white/30">
              No integrations configured yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((item) => (
              <IntegrationCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
