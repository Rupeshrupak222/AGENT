"use client";
import { useState } from "react";
import {
  Settings, Key, Bell, Shield, Globe, Webhook,
  Save, CheckCircle2, Lock, Eye, EyeOff, RefreshCw
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const [activeTab, setActiveTab] = useState<"general" | "api_keys" | "telephony" | "security">("general");
  const [saved, setSaved] = useState(false);

  // General state
  const [companyName, setCompanyName] = useState("Acme Corp (Demo)");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");

  // Telephony state
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [callerId, setCallerId] = useState("");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Settings & Integrations</h1>
        <p className="text-sm text-white/50 mt-1">Configure company preferences, telephony credentials, and security controls.</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Settings successfully updated!
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-6 text-sm">
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
                ? "text-white"
                : "text-white/40 hover:text-white/70"
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
          <div className="rounded-2xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white mb-4">Workspace Preferences</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Company / Tenant Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-white/[0.04] border border-white/15 text-white outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Timezone</label>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-xs bg-[#180305] border border-white/15 text-white outline-none"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5">Primary Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full max-w-xs h-10 rounded-xl px-3 text-xs bg-[#180305] border border-white/15 text-white outline-none"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="AED">AED (د.إ) — UAE Dirham</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === "telephony" && (
          <div className="rounded-2xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white mb-4">Twilio SIP Trunking & Numbers</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Twilio Account SID</label>
                <input
                  type="text"
                  value={twilioSid}
                  onChange={e => setTwilioSid(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-white/[0.04] border border-white/15 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Twilio Auth Token</label>
                <input
                  type="password"
                  value={twilioToken}
                  onChange={e => setTwilioToken(e.target.value)}
                  className="w-full h-10 rounded-xl px-3 text-sm bg-white/[0.04] border border-white/15 text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5">Verified Outbound Caller ID</label>
                <input
                  type="text"
                  value={callerId}
                  onChange={e => setCallerId(e.target.value)}
                  className="w-full max-w-sm h-10 rounded-xl px-3 text-sm bg-white/[0.04] border border-white/15 text-white outline-none font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "api_keys" && (
          <div className="rounded-2xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white mb-4">REST API Keys</h3>
            <p className="text-xs text-white/50">Use these keys to programmatically dispatch phone calls or sync contacts from your external CRM.</p>

            <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">Production Secret Key</p>
                <p className="text-xs font-mono text-white/60 mt-1">agy_live_98a76b12f45c7890123456</p>
              </div>
              <button
                type="button"
                onClick={() => alert("Copied API key to clipboard")}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/10 hover:bg-white/20 text-white font-medium"
              >
                Copy
              </button>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="rounded-2xl p-6 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] shadow-xl space-y-5">
            <h3 className="text-base font-bold text-white mb-4">Security & Access Control</h3>
            <div className="space-y-3 text-xs text-white/70">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="font-semibold text-white">Enforce Two-Factor Authentication (2FA)</p>
                  <p className="text-white/40 mt-0.5">Require TOTP for all team members.</p>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#D42027] w-4 h-4" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <p className="font-semibold text-white">Session Inactivity Timeout (30 mins)</p>
                  <p className="text-white/40 mt-0.5">Automatically log out idle browser tabs.</p>
                </div>
                <input type="checkbox" defaultChecked className="accent-[#D42027] w-4 h-4" />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button type="submit" className="btn-red text-xs py-2 px-6 h-10 shadow-lg shadow-brand-500/25 flex items-center gap-2">
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </div>

      </form>

    </div>
  );
}
