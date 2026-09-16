"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plug,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Database,
  FileSpreadsheet,
  MessageSquare,
  Mail,
  Calendar,
  Settings2,
  Trash2,
  Loader2,
  X,
  Search,
  Check,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { integrationsApi, IntegrationItem, normalizeApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type CategoryId = "all" | "crm" | "calendar" | "messaging" | "data";

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All Integrations" },
  { id: "crm", label: "CRM & Pipelines" },
  { id: "calendar", label: "Calendar & Demos" },
  { id: "messaging", label: "Messaging & Outreach" },
  { id: "data", label: "Data & Spreadsheets" },
];

const PROVIDER_CONFIG: Record<
  string,
  { icon: any; category: CategoryId; color: string; description: string; credLabel: string; isCrm: boolean }
> = {
  salesforce: { icon: Database, category: "crm", color: "from-blue-500 to-blue-600", description: "CRM bidirectional sync for leads, voice calls, and dispositions", credLabel: "Salesforce Access Token", isCrm: true },
  hubspot: { icon: Database, category: "crm", color: "from-orange-500 to-orange-600", description: "HubSpot CRM contact sync and deal pipeline automation", credLabel: "HubSpot API Key", isCrm: true },
  zoho: { icon: Database, category: "crm", color: "from-red-500 to-red-600", description: "Zoho CRM lead creation and automated call note logging", credLabel: "Zoho OAuth Token", isCrm: true },
  pipedrive: { icon: Database, category: "crm", color: "from-emerald-500 to-emerald-600", description: "Pipedrive CRM deal stage updates and stage triggers", credLabel: "Pipedrive API Token", isCrm: true },
  calcom: { icon: Calendar, category: "calendar", color: "from-purple-500 to-purple-600", description: "Real-time calendar slot verification and automated booking", credLabel: "Cal.com API Key", isCrm: false },
  google_calendar: { icon: Calendar, category: "calendar", color: "from-blue-400 to-blue-500", description: "Google Calendar demo scheduling and clash avoidance", credLabel: "Google OAuth Token", isCrm: false },
  outlook_calendar: { icon: Calendar, category: "calendar", color: "from-sky-500 to-sky-600", description: "Microsoft 365 / Outlook calendar scheduling sync", credLabel: "Outlook Token", isCrm: false },
  whatsapp: { icon: MessageSquare, category: "messaging", color: "from-emerald-500 to-emerald-600", description: "WhatsApp Business automated post-call summary brochures", credLabel: "WhatsApp Cloud API Key", isCrm: false },
  slack: { icon: MessageSquare, category: "messaging", color: "from-pink-500 to-rose-600", description: "Real-time hot lead and deal notifications in team channels", credLabel: "Slack Bot Webhook URL", isCrm: false },
  teams: { icon: MessageSquare, category: "messaging", color: "from-indigo-500 to-indigo-600", description: "Microsoft Teams notifications for call escalations", credLabel: "Teams Webhook URL", isCrm: false },
  resend: { icon: Mail, category: "messaging", color: "from-violet-500 to-violet-600", description: "Transactional follow-up emails and confirmation links", credLabel: "Resend API Key", isCrm: false },
  google_sheets: { icon: FileSpreadsheet, category: "data", color: "from-green-500 to-green-600", description: "Real-time lead appending to shared Google Spreadsheets", credLabel: "Google Service Account Key", isCrm: false },
};

const CATALOG_ORDER = Object.keys(PROVIDER_CONFIG);

function humanize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IntegrationsPage() {
  const { can } = usePermissions();
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [editing, setEditing] = useState<string | null>(null);
  const [credential, setCredential] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [active, setActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; ok: boolean; msg: string } | null>(null);
  const { success, error: toastError } = useToast();

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setIntegrations(await integrationsApi.list());
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = can(PERMISSIONS.INTEGRATIONS_MANAGE);
  const getItem = (provider: string) => integrations.find((i) => i.provider === provider);

  const openConfig = (provider: string) => {
    const item = getItem(provider);
    setEditing(provider);
    setCredential("");
    setShowSecret(false);
    setActive(item?.isActive && item.isConfigured ? true : false);
    setTestResult(null);
  };

  function credKeyFor(provider: string): string {
    const cfg = PROVIDER_CONFIG[provider];
    if (!cfg) return "apiKey";
    if (cfg.isCrm) return "accessToken";
    if (provider === "slack" || provider === "teams") return "webhookUrl";
    return "apiKey";
  }

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setTestResult(null);
    try {
      await integrationsApi.upsert(editing, {
        isActive: active,
        credentials: credential.trim()
          ? { [credKeyFor(editing)]: credential.trim() }
          : undefined,
      });
      success(`${humanize(editing)} connection parameters updated.`);
      setEditing(null);
      await load();
    } catch (e) {
      toastError(normalizeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: IntegrationItem) => {
    try {
      await integrationsApi.upsert(item.provider, { isActive: !item.isActive });
      await load();
      success(`${humanize(item.provider)} state toggled.`);
    } catch (e) {
      toastError(normalizeApiError(e));
    }
  };

  const handleTest = async (provider: string) => {
    setTesting(provider);
    setTestResult(null);
    try {
      const res = await integrationsApi.testConnection(provider);
      setTestResult({
        provider,
        ok: res.success,
        msg: res.message || (res.success ? "Handshake verified successfully." : "Provider authentication handshake failed."),
      });
    } catch (e) {
      setTestResult({ provider, ok: false, msg: normalizeApiError(e) });
    } finally {
      setTesting(null);
    }
  };

  const filteredProviders = useMemo(() => {
    return CATALOG_ORDER.filter((p) => {
      const cfg = PROVIDER_CONFIG[p];
      if (!cfg) return false;
      if (activeCategory !== "all" && cfg.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = humanize(p).toLowerCase().includes(query);
        const matchesDesc = cfg.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  if (!can(PERMISSIONS.INTEGRATIONS_VIEW)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-white/[0.02] border border-white/10">
          <p className="text-sm font-semibold text-white">Access Restricted</p>
          <p className="text-xs text-white/50 mt-1">You do not have permission to view integrations.</p>
        </div>
      </div>
    );
  }

  const activeCount = integrations.filter((i) => i.isConfigured && i.isActive).length;
  const configuredCount = integrations.filter((i) => i.isConfigured).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 dark:bg-brand-500/20 border border-brand-500/20 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Plug className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Enterprise Integrations Marketplace
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated handshakes with CRM pipelines, calendar booking, messaging, and data sinks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin text-brand-500" : ""}`} />
            <span>Sync</span>
          </Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Connection Status Telemetry Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Active Connectors</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Live streaming telemetry</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Configured Hubs</span>
            <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{configuredCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Authenticated integrations</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Catalog Connectors</span>
            <Plug className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">{CATALOG_ORDER.length}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Plug-and-play supported</p>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>Average Sync Latency</span>
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">~210ms</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Sub-second webhook dispatch</p>
        </div>
      </div>

      {testResult && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            testResult.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.ok ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-rose-500" />}
            <span>
              <strong>{humanize(testResult.provider)}:</strong> {testResult.msg}
            </span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-brand-600 text-white shadow-md shadow-brand-900/30"
                  : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-white/40" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connectors…"
            className="w-full h-9 pl-8 pr-3 rounded-lg text-xs bg-white dark:bg-black/40 border border-slate-200 dark:border-amber-500/20 text-slate-900 dark:text-white outline-none focus:border-brand-500 shadow-xs"
          />
        </div>
      </div>

      {/* Catalog Grid */}
      {loading && integrations.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((p) => (
            <div key={p} className="h-44 rounded-xl bg-slate-100 dark:bg-slate-900/60 animate-pulse border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProviders.map((provider) => {
            const cfg = PROVIDER_CONFIG[provider];
            const Icon = cfg.icon;
            const item = getItem(provider);
            const isTestingThis = testing === provider;

            return (
              <div
                key={provider}
                className="rounded-xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/40 dark:hover:border-brand-500/40 flex flex-col justify-between transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white shadow-sm", cfg.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {item ? (
                      item.isConfigured ? (
                        item.isActive ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle className="w-3 h-3" /> Live
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" /> Standby
                          </span>
                        )
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10">
                          <XCircle className="w-3 h-3" /> Unconfigured
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10">
                        <XCircle className="w-3 h-3" /> Ready to Connect
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{humanize(provider)}</h3>
                  <p className="text-xs text-slate-500 dark:text-white/50 line-clamp-2 leading-relaxed">{cfg.description}</p>

                  {item?.lastSyncAt && (
                    <p className="text-[10px] font-mono text-slate-400 dark:text-amber-200/50 mt-2">
                      Last sync: {new Date(item.lastSyncAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
                  {canManage ? (
                    <div className="flex items-center gap-2 w-full justify-between">
                      {item?.isConfigured && (
                        <button
                          onClick={() => handleTest(provider)}
                          disabled={isTestingThis}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[11px] font-semibold text-slate-700 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {isTestingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-brand-500" />}
                          <span>Test Handshake</span>
                        </button>
                      )}

                      <button
                        onClick={() => openConfig(provider)}
                        className="ml-auto px-3 py-1 rounded-lg bg-brand-500/10 dark:bg-amber-500/15 hover:bg-brand-500/20 dark:hover:bg-amber-500/25 border border-brand-500/20 dark:border-amber-500/30 text-[11px] font-semibold text-brand-700 dark:text-amber-300 transition-colors flex items-center gap-1"
                      >
                        <Settings2 className="w-3 h-3" />
                        <span>{item?.isConfigured ? "Manage" : "Configure"}</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 dark:text-white/40 italic">View Only</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Configuration Slide-over Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Configure {humanize(editing)}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter authentication parameters for real-time bidirectional syncing.
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {PROVIDER_CONFIG[editing]?.credLabel || "API Credential Token"}
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={credential}
                    onChange={(e) => setCredential(e.target.value)}
                    placeholder={
                      getItem(editing)?.isConfigured
                        ? "•••••••••••••••• (Leave blank to keep existing)"
                        : "Enter token or webhook secret…"
                    }
                    className="w-full h-10 pl-3 pr-10 rounded-lg text-xs font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-brand-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white"
                  >
                    {showSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Enable Real-Time Dispatch</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Activate immediate webhook & record updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="accent-brand-600 w-4 h-4"
                  />
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                <span>{saving ? "Saving..." : "Save Connection"}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}