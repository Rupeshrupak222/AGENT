"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  CreditCard,
  Shield,
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { platformApi, PlatformSettingsData } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useToast } from "@/components/ui/Toast";

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4">
      <label className="block text-sm font-medium text-slate-700 dark:text-white/70">
        {label}
      </label>
      {description && (
        <p className="text-[11px] text-slate-400 dark:text-white/25 mt-0.5 mb-2">
          {description}
        </p>
      )}
      {!description && <div className="h-1.5" />}
      {children}
    </div>
  );
}

const inputCls = cn(
  "w-full h-10 px-3 rounded-xl text-sm bg-slate-50 dark:bg-white/[0.04]",
  "border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white",
  "placeholder-slate-400 dark:placeholder-white/25 outline-none transition-all",
  "focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 dark:focus:border-brand-400"
);

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
        checked
          ? "bg-emerald-500"
          : "bg-slate-300 dark:bg-white/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/[0.06]">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
          <Icon className="w-4 h-4 text-slate-500 dark:text-white/40" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-white/[0.04]">
        {children}
      </div>
    </div>
  );
}

const PLANS = ["starter", "growth", "business", "enterprise"];
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];
const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Australia/Sydney",
];

const DEFAULTS: PlatformSettingsData = {
  platformName: "AgentCall AI",
  platformSlug: "agentcall-ai",
  logoUrl: "",
  supportEmail: "",
  website: "",
  industry: "",
  whitelabelDomain: "",
  defaultPlan: "starter",
  defaultCurrency: "INR",
  timezone: "Asia/Kolkata",
  registrationEnabled: true,
  maintenanceMode: false,
  emailNotifications: true,
  apiRateLimit: "default",
  defaultCallLimit: 0,
};

export default function SettingsPage() {
  const [form, setForm] = useState<PlatformSettingsData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformApi.getSettings();
      setForm({ ...DEFAULTS, ...res });
    } catch (e: any) {
      setError(e?.message || "Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof PlatformSettingsData>(
    key: K,
    value: PlatformSettingsData[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await platformApi.updateSettings(form);
      setForm({ ...DEFAULTS, ...res });
      success("Platform settings saved successfully.");
    } catch (e: any) {
      showError(e?.message || "Failed to save platform settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
          <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-white/[0.06] animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-52 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse"
            />
          ))}
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
            <button
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-90 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1000px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Platform Settings
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Manage platform-wide configuration
            </p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-90 shadow-md shadow-brand-500/20 disabled:opacity-60 transition-all"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <Section title="Platform Identity" icon={Globe}>
          <Field
            label="Platform Name"
            description="The display name for this platform instance"
          >
            <input
              className={inputCls}
              value={form.platformName}
              onChange={(e) => set("platformName", e.target.value)}
              placeholder="AgentCall AI"
            />
          </Field>
          <Field
            label="Platform Slug"
            description="URL-safe identifier used across branded links"
          >
            <input
              className={inputCls}
              value={form.platformSlug}
              onChange={(e) =>
                set(
                  "platformSlug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")
                )
              }
              placeholder="agentcall-ai"
            />
          </Field>
          <Field label="Website" description="Public website for the platform">
            <input
              className={inputCls}
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://agentcall.ai"
            />
          </Field>
          <Field
            label="Industry"
            description="Primary industry classification"
          >
            <input
              className={inputCls}
              value={form.industry}
              onChange={(e) => set("industry", e.target.value)}
              placeholder="AI Sales Automation"
            />
          </Field>
          <Field
            label="Whitelabel Domain"
            description="Custom domain for whitelabel access"
          >
            <input
              className={inputCls}
              value={form.whitelabelDomain}
              onChange={(e) => set("whitelabelDomain", e.target.value)}
              placeholder="app.yourbrand.com"
            />
          </Field>
          <Field
            label="Support Email"
            description="Contact address shown to tenants"
          >
            <input
              className={inputCls}
              value={form.supportEmail}
              onChange={(e) => set("supportEmail", e.target.value)}
              placeholder="support@agentcall.ai"
            />
          </Field>
        </Section>

        <Section title="Defaults & Regional" icon={CreditCard}>
          <Field
            label="Default Plan"
            description="Plan assigned to new companies"
          >
            <select
              className={inputCls}
              value={form.defaultPlan}
              onChange={(e) => set("defaultPlan", e.target.value)}
            >
              {PLANS.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Default Currency" description="Billing currency">
            <select
              className={inputCls}
              value={form.defaultCurrency}
              onChange={(e) => set("defaultCurrency", e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Timezone" description="Default timezone for analytics">
            <select
              className={inputCls}
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {TIMEZONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Access & Security" icon={Shield}>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-white/70">
                Allow Self-Service Signup
              </p>
              <p className="text-[11px] text-slate-400 dark:text-white/25 mt-0.5">
                Permit new companies to register themselves
              </p>
            </div>
            <Toggle
              checked={form.registrationEnabled}
              onChange={(v) => set("registrationEnabled", v)}
            />
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-white/70">
                Maintenance Mode
              </p>
              <p className="text-[11px] text-slate-400 dark:text-white/25 mt-0.5">
                Temporarily restrict access for all tenants
              </p>
            </div>
            <Toggle
              checked={form.maintenanceMode}
              onChange={(v) => set("maintenanceMode", v)}
            />
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-white/70">
                Email Notifications
              </p>
              <p className="text-[11px] text-slate-400 dark:text-white/25 mt-0.5">
                Platform-level automated email alerts
              </p>
            </div>
            <Toggle
              checked={form.emailNotifications}
              onChange={(v) => set("emailNotifications", v)}
            />
          </div>
          <Field label="API Rate Limit" description="Default throttling policy">
            <select
              className={inputCls}
              value={form.apiRateLimit}
              onChange={(e) => set("apiRateLimit", e.target.value)}
            >
              <option value="default">Default</option>
              <option value="relaxed">Relaxed</option>
              <option value="strict">Strict</option>
            </select>
          </Field>
          <Field
            label="Default Call Limit"
            description="Monthly call allowance per new company (0 = unlimited)"
          >
            <input
              type="number"
              min={0}
              className={inputCls}
              value={form.defaultCallLimit}
              onChange={(e) =>
                set("defaultCallLimit", Math.max(0, Number(e.target.value) || 0))
              }
            />
          </Field>
        </Section>

        <div className="flex justify-end pb-4">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 h-11 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 hover:opacity-90 shadow-md shadow-brand-500/20 disabled:opacity-60 transition-all"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <Settings className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              About this page
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/60 mt-0.5">
              These are platform-wide values (separate from your workspace
              profile in Company Settings). Environment-level secrets such as
              API keys remain managed via configuration and are not editable
              here.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}