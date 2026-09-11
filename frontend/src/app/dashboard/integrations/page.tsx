"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plug,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Database,
  FileSpreadsheet,
  MessageSquare,
  Mail,
  Calendar,
  Settings2,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { integrationsApi, IntegrationItem, normalizeApiError } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

const PROVIDER_CONFIG: Record<
  string,
  { icon: any; color: string; description: string; credLabel: string; isCrm: boolean }
> = {
  salesforce: { icon: Database, color: "from-blue-500 to-blue-600", description: "CRM sync for leads, calls and dispositions", credLabel: "Salesforce Access Token", isCrm: true },
  hubspot: { icon: Database, color: "from-orange-500 to-orange-600", description: "HubSpot CRM inbound marketing sync", credLabel: "HubSpot API Key", isCrm: true },
  zoho: { icon: Database, color: "from-red-500 to-red-600", description: "Zoho CRM pipeline integration", credLabel: "Zoho OAuth Token", isCrm: true },
  pipedrive: { icon: Database, color: "from-emerald-500 to-emerald-600", description: "Pipedrive CRM deal pipeline sync", credLabel: "Pipedrive API Token", isCrm: true },
  google_sheets: { icon: FileSpreadsheet, color: "from-green-500 to-green-600", description: "Sync leads and call data to Google Sheets", credLabel: "Google API Key", isCrm: false },
  slack: { icon: MessageSquare, color: "from-pink-500 to-rose-600", description: "Workspace notifications and alerts in Slack", credLabel: "Slack Bot Token", isCrm: false },
  teams: { icon: MessageSquare, color: "from-indigo-500 to-indigo-600", description: "Microsoft Teams channel notifications", credLabel: "Teams Webhook URL", isCrm: false },
  google_calendar: { icon: Calendar, color: "from-blue-400 to-blue-500", description: "Google Calendar for appointment booking", credLabel: "Google OAuth Token", isCrm: false },
  outlook_calendar: { icon: Calendar, color: "from-sky-500 to-sky-600", description: "Outlook calendar scheduling integration", credLabel: "Outlook Token", isCrm: false },
  whatsapp: { icon: MessageSquare, color: "from-emerald-500 to-emerald-600", description: "WhatsApp Business messaging automation", credLabel: "WhatsApp API Key", isCrm: false },
  resend: { icon: Mail, color: "from-violet-500 to-violet-600", description: "Transactional email delivery service", credLabel: "Resend API Key", isCrm: false },
  calcom: { icon: Calendar, color: "from-purple-500 to-purple-600", description: "Open source scheduling infrastructure", credLabel: "Cal.com API Key", isCrm: false },
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

  const [editing, setEditing] = useState<string | null>(null);
  const [credential, setCredential] = useState("");
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
    setActive(item?.isActive && item.isConfigured ? true : false);
    setTestResult(null);
  };

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
      success(`${humanize(editing)} configuration saved.`);
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
        msg: res.message || (res.success ? "Connection successful." : "Connection failed."),
      });
    } catch (e) {
      setTestResult({ provider, ok: false, msg: normalizeApiError(e) });
    } finally {
      setTesting(null);
    }
  };

  function credKeyFor(provider: string): string {
    const cfg = PROVIDER_CONFIG[provider];
    if (!cfg) return "apiKey";
    if (cfg.isCrm) return "accessToken";
    if (provider === "slack" || provider === "teams") return "webhookUrl";
    return "apiKey";
  }

  if (!can(PERMISSIONS.INTEGRATIONS_VIEW)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Restricted</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">You do not have permission to view integrations.</p>
        </div>
      </div>
    );
  }

  const activeCount = integrations.filter((i) => i.isConfigured && i.isActive).length;
  const configuredCount = integrations.filter((i) => i.isConfigured).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Plug className="w-6 h-6 text-brand-500 dark:text-brand-400" /> Integrations
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/50 mt-1">
            Connect third-party providers to automate outreach, scheduling and CRM workflows.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-white/60">
            {activeCount} active / {configuredCount} configured
          </span>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/80 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-brand-500 dark:text-brand-400" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {testResult && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-sm flex items-center gap-2 ${
            testResult.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          {testResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {humanize(testResult.provider)}: {testResult.msg}
        </div>
      )}

      {/* Catalog grid */}
      {loading && integrations.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATALOG_ORDER.slice(0, 6).map((p) => (
            <div key={p} className="h-44 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATALOG_ORDER.map((provider) => {
            const cfg = PROVIDER_CONFIG[provider];
            const Icon = cfg.icon;
            const item = getItem(provider);
            return (
              <div key={provider} className="rounded-2xl p-5 panel-card flex flex-col">
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white shadow-sm", cfg.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {item ? (
                    item.isConfigured ? (
                      item.isActive ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3" /> Inactive
                        </span>
                      )
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40">
                        <XCircle className="w-3 h-3" /> Empty
                      </span>
                    )
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40">
                      <XCircle className="w-3 h-3" /> Not Configured
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{humanize(provider)}</h3>
                <p className="text-xs text-slate-500 dark:text-white/40 line-clamp-2">{cfg.description}</p>

                {item?.lastSyncAt && (
                  <p className="text-[11px] text-slate-400 dark:text-white/30 mt-2">
                    Last synced {new Date(item.lastSyncAt).toLocaleString()}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                  {cfg.isCrm && canManage && (
                    <button
                      onClick={() => handleTest(provider)}
                      disabled={testing === provider}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white/70 hover:bg-slate-200 dark:hover:bg-white/[0.12] disabled:opacity-50 transition-colors"
                    >
                      {testing === provider ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Test
                    </button>
                  )}
                  {canManage ? (
                    <button
                      onClick={() => openConfig(provider)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:brightness-110 transition-all flex-1 justify-center"
                    >
                      {item?.isConfigured ? <Settings2 className="w-3.5 h-3.5" /> : <Plug className="w-3.5 h-3.5" />}
                      {item?.isConfigured ? "Configure" : "Connect"}
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 dark:text-white/40 flex-1 text-center">
                      View only
                    </span>
                  )}
                  {item?.isConfigured && canManage && (
                    <button
                      onClick={() => handleToggle(item)}
                      title={item.isActive ? "Deactivate" : "Activate"}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-500 dark:text-white/60 hover:text-brand-500 transition-colors"
                    >
                      {item.isActive ? <Trash2 className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Config modal */}
      {editing && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white dark:bg-[#1a0405] border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Configure {humanize(editing)}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="integ-cred" className="block text-xs font-semibold text-slate-500 dark:text-white/50 mb-1.5">
                  {PROVIDER_CONFIG[editing]?.credLabel ?? "API Key"}
                </label>
                <input
                  id="integ-cred"
                  type="password"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder="Value stored encrypted server-side"
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 accent-[#D42027]"
                />
                <span className="text-sm text-slate-700 dark:text-white/80">Enable immediately</span>
              </label>

              <div className="flex items-center gap-2 justify-end pt-2">
                <button
                  onClick={() => setEditing(null)}
                  className="h-10 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-white/70"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-red text-xs h-10 px-4 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}