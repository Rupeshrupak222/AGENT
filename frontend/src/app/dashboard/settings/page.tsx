"use client";
import { useState, useEffect } from "react";
import { Save, CheckCircle2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/components/ui/Toast";
import { tenantApi, normalizeApiError } from "@/lib/api";

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const tenant = useAuthStore(s => s.tenant);
  const updateTenant = useAuthStore(s => s.updateTenant);
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<"general" | "api_keys" | "telephony" | "security">("general");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // General state
  const [companyName, setCompanyName] = useState(tenant?.name || "My Workspace");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");

  // Hydrate from real tenant config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await tenantApi.me();
        if (cancelled) return;
        if (data.name) setCompanyName(data.name);
        if (data.settings) {
          if (typeof data.settings.timezone === "string") setTimezone(data.settings.timezone);
          if (typeof data.settings.currency === "string") setCurrency(data.settings.currency);
        }
      } catch {
        // Non-fatal: keep local defaults
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await tenantApi.updateMe({
        name: companyName.trim() || undefined,
        settings: { timezone, currency },
      });
      updateTenant({ name: updated.name });
      setSaved(true);
      success("Settings saved successfully");
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      error(normalizeApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Settings & Integrations</h1>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Configure company preferences, telephony credentials, and security controls.</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Settings successfully updated!
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-6 text-sm">
        {[
          { id: "general", label: "General & Branding" },
          { id: "telephony", label: "Telephony (Twilio/Exotel)" },
          { id: "api_keys", label: "API Keys & Webhooks" },
          { id: "security", label: "Security & RBAC" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === tab.id
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <form onSubmit={handleSave} className="space-y-6">

        {activeTab === "general" && (
          <div className="rounded-2xl p-6 panel-card border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Workspace Preferences</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">Company / Tenant Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-xs bg-input border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">Primary Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full max-w-xs h-10 rounded-xl px-3 text-xs bg-input border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="AED">AED (د.إ) — UAE Dirham</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "telephony" && (
          <div className="rounded-2xl p-6 panel-card border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Telephony Provider</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
              Outbound calling credentials (Twilio / Exotel account SID, auth token, verified caller ID) are
              provisioned per-workspace through the platform telephony service. Per-workspace credential management
              is not exposed by the API yet — live PSTN calling activates with the tenant provisioning flow.
            </p>

            <div className="max-w-2xl space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                <span className="font-semibold text-slate-700 dark:text-white/70">Twilio Account SID</span>
                <span className="font-mono text-xs text-slate-400 dark:text-white/40">Not configured in this workspace</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                <span className="font-semibold text-slate-700 dark:text-white/70">Verified Outbound Caller ID</span>
                <span className="font-mono text-xs text-slate-400 dark:text-white/40">None</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "api_keys" && (
          <div className="rounded-2xl p-6 panel-card border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">REST API Keys & Webhooks</h3>
            <p className="text-xs text-slate-500 dark:text-white/50">Use these keys to programmatically dispatch phone calls or sync contacts from your external CRM.</p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold text-slate-900 dark:text-white">API Key Management</p>
              <p className="text-xs text-slate-500 dark:text-white/60 mt-1 leading-relaxed">
                No API keys are provisioned for this workspace yet. Key creation and webhook endpoint management
                are not exposed by the platform service at this time.
              </p>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="rounded-2xl p-6 panel-card border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Security & Access Control</h3>
            <div className="space-y-3 text-xs text-slate-700 dark:text-white/70">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                  <p className="text-slate-500 dark:text-white/40 mt-0.5">TOTP enforcement is not configurable from this panel yet — rollout is tracked at the platform level.</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50 border border-slate-200 dark:border-white/10">Not available</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Session Inactivity Timeout</p>
                  <p className="text-slate-500 dark:text-white/40 mt-0.5">Idle-session expiry is enforced by the auth layer and is not user-configurable at this time.</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50 border border-slate-200 dark:border-white/10">Not available</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pt-4">
          {activeTab !== "general" && (
            <p className="text-xs text-slate-500 dark:text-white/40">
              This tab has no server persistence yet — only General &amp; Branding settings are saved.
            </p>
          )}
          <button
            type="submit"
            disabled={saving || activeTab !== "general"}
            className="btn-red text-xs py-2 px-6 h-10 shadow-lg shadow-brand-500/25 flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving…" : "Save Preferences"}
          </button>
        </div>

      </form>

    </div>
  );
}
