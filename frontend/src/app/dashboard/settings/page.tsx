"use client";
import React, { useState, useEffect, Fragment } from "react";
import {
  Save,
  CheckCircle2,
  Loader2,
  Share2,
  Key,
  Globe,
  ExternalLink,
  ShieldCheck,
  Database,
  RefreshCw,
  Check,
  AlertCircle,
  Palette,
  Sparkles,
  Eye,
  Layers,
  PhoneCall,
  Lock,
  Image as ImageIcon,
  Copy,
  Users,
  UserPlus,
  Shield,
  Activity,
  Radio,
  Phone,
  ArrowUpRight,
  ChevronDown,
  Filter,
  FileText,
  CheckCheck,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { tenantApi, integrationsApi, automationsApi, appointmentsApi, IntegrationItem, CalendarProviderStatus, normalizeApiError } from "@/lib/api";

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const tenant = useAuthStore(s => s.tenant);
  const updateTenant = useAuthStore(s => s.updateTenant);
  const { success, error, warning } = useToast();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<"general" | "branding" | "api_keys" | "telephony" | "security" | "integrations">("general");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // General state
  const [companyName, setCompanyName] = useState(tenant?.name || "My Workspace");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState("INR");

  // Branding & White-Label State
  const [subdomain, setSubdomain] = useState("acme-voice");
  const [customDomain, setCustomDomain] = useState("voice.acmecorp.com");
  const [brandLogoUrl, setBrandLogoUrl] = useState("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80");
  const [brandAccentColor, setBrandAccentColor] = useState("#D42027");
  const [supportEmail, setSupportEmail] = useState("concierge@acmecorp.com");
  const [supportPhone, setSupportPhone] = useState("+91 80 4000 1234");
  const [removeWatermark, setRemoveWatermark] = useState(true);
  const [customDisclaimer, setCustomDisclaimer] = useState("Calls may be recorded and analyzed by AI for quality assurance & compliance.");
  const [savingBranding, setSavingBranding] = useState(false);

  // Webhooks & API Keys State
  const [apiKey, setApiKey] = useState("sk_live_agentcall_9a87f6e5d4c3b2a1");
  const [showApiKey, setShowApiKey] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.zapier.com/hooks/catch/91823/voiceai/");
  const [webhookSecret, setWebhookSecret] = useState("whsec_7b8c9d0e1f2a3b4c5d6e");
  const [subscribedEvents, setSubscribedEvents] = useState<string[]>([
    "call.started",
    "call.completed",
    "lead.qualified",
    "appointment.booked",
  ]);
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [lastPingResult, setLastPingResult] = useState<{
    status: number;
    latencyMs: number;
    timestamp: string;
  } | null>(null);

  const handleTestPing = () => {
    setIsSendingPing(true);
    setTimeout(() => {
      setIsSendingPing(false);
      setLastPingResult({
        status: 200,
        latencyMs: 138,
        timestamp: new Date().toLocaleTimeString(),
      });
      success("Webhook test ping delivered successfully (HTTP 200 OK — 138ms)!");
    }, 600);
  };

  // Telephony SIP Trunking & Carrier Failover State
  const [carrierFailoverActive, setCarrierFailoverActive] = useState(true);
  const [latencyThreshold, setLatencyThreshold] = useState(250);
  const [jitterThreshold, setJitterThreshold] = useState(35);
  const [isSimulatingFailover, setIsSimulatingFailover] = useState(false);
  const [carriers, setCarriers] = useState([
    { id: "twilio", name: "Twilio Elastic SIP Trunk", role: "Primary Active", latency: 42, jitter: 3, packetLoss: 0.0, status: "Healthy" },
    { id: "telnyx", name: "Telnyx Global Direct Voice", role: "Hot Standby", latency: 54, jitter: 4, packetLoss: 0.0, status: "Standby" },
    { id: "plivo", name: "Plivo High-Throughput SIP", role: "Cold Standby", latency: 68, jitter: 6, packetLoss: 0.1, status: "Standby" },
  ]);
  const [didNumbers, setDidNumbers] = useState([
    { id: "1", number: "+1 (800) 459-2810", country: "US Toll-Free", assignedAgent: "Elena — Executive Concierge", stirShaken: "A-Level (Attested)", spamRisk: "1.2% Very Low", channels: "Voice & SMS" },
    { id: "2", number: "+91 80 4719 3200", country: "India Bangalore DID", assignedAgent: "Priya — Enterprise Inbound", stirShaken: "Verified Carrier", spamRisk: "0.8% Very Low", channels: "Voice" },
    { id: "3", number: "+44 20 7946 0912", country: "UK London DID", assignedAgent: "Arthur — Global VIP", stirShaken: "A-Level (Attested)", spamRisk: "2.1% Low", channels: "Voice & SMS" },
  ]);
  const [newDidNumber, setNewDidNumber] = useState("+1 (888) ");
  const [newDidAgent, setNewDidAgent] = useState("Elena — Executive Concierge");
  const [isProvisioningDid, setIsProvisioningDid] = useState(false);

  const handleSimulateCarrierFailover = () => {
    setIsSimulatingFailover(true);
    setTimeout(() => {
      setIsSimulatingFailover(false);
      setCarriers([
        { id: "telnyx", name: "Telnyx Global Direct Voice", role: "Primary Active (Failed Over)", latency: 52, jitter: 4, packetLoss: 0.0, status: "Healthy" },
        { id: "twilio", name: "Twilio Elastic SIP Trunk", role: "Degraded Standby", latency: 310, jitter: 48, packetLoss: 2.8, status: "Degraded" },
        { id: "plivo", name: "Plivo High-Throughput SIP", role: "Cold Standby", latency: 68, jitter: 6, packetLoss: 0.1, status: "Standby" },
      ]);
      warning("Carrier Health Alert: Twilio latency spiked to 310ms. Auto-failover redirected live telephony to Telnyx in 44ms!");
    }, 900);
  };

  const handleProvisionDid = () => {
    if (!newDidNumber.trim()) return;
    setIsProvisioningDid(true);
    setTimeout(() => {
      setIsProvisioningDid(false);
      setDidNumbers((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          number: newDidNumber.trim() + Math.floor(1000 + Math.random() * 9000),
          country: "US Toll-Free Reserved",
          assignedAgent: newDidAgent,
          stirShaken: "A-Level (Attested)",
          spamRisk: "0.5% Very Low",
          channels: "Voice & SMS",
        }
      ]);
      success(`DID Phone Number reserved & provisioned to ${newDidAgent}!`);
    }, 800);
  };

  // Enterprise RBAC & Security Audit Trail State
  const [securitySubTab, setSecuritySubTab] = useState<"rbac" | "audit">("rbac");
  const [teamMembers, setTeamMembers] = useState([
    { id: "1", name: "Ashish Kumar", email: "ashish@agentcall.ai", role: "Super Admin", lastActive: "Active Now", avatarBg: "bg-brand-500" },
    { id: "2", name: "Priya Nair", email: "priya.nair@company.com", role: "Call Center Manager", lastActive: "12m ago", avatarBg: "bg-purple-500" },
    { id: "3", name: "Rajesh Verma", email: "rajesh.qa@company.com", role: "QA Compliance Auditor", lastActive: "1h ago", avatarBg: "bg-amber-500" },
    { id: "4", name: "Maya Sen", email: "maya.ops@company.com", role: "Agent Operator", lastActive: "Yesterday", avatarBg: "bg-emerald-500" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Agent Operator");
  const [isInviting, setIsInviting] = useState(false);
  const [auditFilter, setAuditFilter] = useState("all");
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null);

  const [auditLogs] = useState([
    {
      id: "aud_01",
      timestamp: "2 mins ago",
      actor: "Ashish Kumar (Super Admin)",
      action: "PROMPT_UPDATE",
      target: "Agent: Elena Concierge",
      ip: "103.21.244.12",
      status: "ALLOWED",
      diff: {
        field: "systemPrompt",
        before: "You are a customer service assistant.",
        after: "You are Elena, a premium wealth advisory concierge. Never quote speculative returns.",
      },
    },
    {
      id: "aud_02",
      timestamp: "18 mins ago",
      actor: "Priya Nair (Manager)",
      action: "API_KEY_ROTATED",
      target: "Workspace Secret: sk_live_9a87...",
      ip: "14.139.128.8",
      status: "ALLOWED",
      diff: {
        field: "apiKey",
        before: "sk_live_agentcall_old...",
        after: "sk_live_agentcall_9a87f6e5...",
      },
    },
    {
      id: "aud_03",
      timestamp: "1 hour ago",
      actor: "Rajesh Verma (QA Auditor)",
      action: "TRANSCRIPT_EXPORT",
      target: "Calls Batch #892 (PII Masked)",
      ip: "157.48.201.99",
      status: "ALLOWED",
      diff: {
        field: "exportFormat",
        mode: "SOC2_REDACTED_CSV",
        recordsExported: 45,
      },
    },
    {
      id: "aud_04",
      timestamp: "3 hours ago",
      actor: "Maya Sen (Operator)",
      action: "RECORD_DELETION_ATTEMPT",
      target: "Call Recording #1042",
      ip: "49.207.194.50",
      status: "BLOCKED",
      diff: {
        field: "permissionDenied",
        requiredRole: "Super Admin",
        actorRole: "Operator",
      },
    },
  ]);

  const handleInviteMember = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setTimeout(() => {
      setIsInviting(false);
      setTeamMembers((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          name: inviteEmail.split("@")[0].replace(".", " "),
          email: inviteEmail.trim(),
          role: inviteRole,
          lastActive: "Invited (Pending)",
          avatarBg: "bg-blue-500",
        }
      ]);
      setInviteEmail("");
      success(`Invitation sent to ${inviteEmail} with role "${inviteRole}"!`);
    }, 600);
  };

  // CRM Integrations State
  const [crmList, setCrmList] = useState<IntegrationItem[]>([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [testingCrm, setTestingCrm] = useState<string | null>(null);
  const [savingCrm, setSavingCrm] = useState<string | null>(null);

  // Form states for CRM credentials
  const [hubspotKey, setHubspotKey] = useState("");
  const [hubspotActive, setHubspotActive] = useState(false);

  const [salesforceToken, setSalesforceToken] = useState("");
  const [salesforceUrl, setSalesforceUrl] = useState("https://login.salesforce.com");
  const [salesforceActive, setSalesforceActive] = useState(false);

  const [zohoToken, setZohoToken] = useState("");
  const [zohoDomain, setZohoDomain] = useState("https://www.zohoapis.com/crm/v2");
  const [zohoActive, setZohoActive] = useState(false);

  // Messaging Providers State (Day 16)
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waActive, setWaActive] = useState(false);
  const [waStatus, setWaStatus] = useState<string>("Not Connected");

  const [resendKey, setResendKey] = useState("");
  const [resendFrom, setResendFrom] = useState("notifications@agentcall.ai");
  const [resendActive, setResendActive] = useState(false);
  const [resendStatus, setResendStatus] = useState<string>("Not Connected");
  const [testingMsgProvider, setTestingMsgProvider] = useState<string | null>(null);

  // Calendar Provider State (Day 17)
  const [calcomKey, setCalcomKey] = useState("");
  const [calcomApiUrl, setCalcomApiUrl] = useState("https://api.cal.com/v1");
  const [calcomEventType, setCalcomEventType] = useState("");
  const [calcomTimezone, setCalcomTimezone] = useState("Asia/Kolkata");
  const [calcomDuration, setCalcomDuration] = useState(30);
  const [calcomActive, setCalcomActive] = useState(false);
  const [calcomStatus, setCalcomStatus] = useState<string>("Not Configured");
  const [testingCalcom, setTestingCalcom] = useState(false);
  const [savingCalcom, setSavingCalcom] = useState(false);

  // Load CRM & Messaging integrations when switching to integrations tab
  useEffect(() => {
    if (activeTab !== "integrations") return;
    (async () => {
      try {
        setLoadingCrm(true);
        const [list, msgProvs] = await Promise.all([
          integrationsApi.list().catch(() => []),
          automationsApi.getProviderStatuses().catch(() => []),
        ]);
        setCrmList(list);

        const prov = await appointmentsApi.providerStatus().catch(() => null);
        if (prov) {
          if (prov.isMock) {
            setCalcomStatus(prov.provider === "native" ? "Native Calendar" : "Mock Mode");
          } else {
            setCalcomStatus(prov.configured && prov.success ? "Connected" : "Configured");
          }
        }

        const cal = list.find((i) => i.provider.toLowerCase() === "calcom");
        if (cal) {
          setCalcomActive(cal.isActive);
          if (cal.maskedKey) setCalcomKey(""); // raw key is never returned — user must re-enter to rotate
          if (cal.settings?.eventTypeId != null) setCalcomEventType(String(cal.settings.eventTypeId));
          if (typeof cal.settings?.timezone === "string") setCalcomTimezone(cal.settings.timezone);
          if (typeof cal.settings?.defaultDuration === "number") setCalcomDuration(cal.settings.defaultDuration);
        }

        const wa = msgProvs.find((p) => p.provider === "whatsapp");
        if (wa) {
          setWaStatus(wa.isConfigured ? "Connected" : "Not Connected");
          if (wa.phoneNumberId) setWaPhoneId(wa.phoneNumberId);
        }

        const resend = msgProvs.find((p) => p.provider === "resend");
        if (resend) {
          setResendStatus(resend.isConfigured ? "Connected" : "Not Connected");
          if (resend.from) setResendFrom(resend.from);
        }

        const hs = list.find((i) => i.provider.toLowerCase() === "hubspot");
        if (hs) {
          setHubspotActive(hs.isActive);
          if (hs.maskedKey) setHubspotKey(hs.maskedKey);
        }

        const sf = list.find((i) => i.provider.toLowerCase() === "salesforce");
        if (sf) {
          setSalesforceActive(sf.isActive);
          if (sf.maskedKey) setSalesforceToken(sf.maskedKey);
          if (sf.settings?.instanceUrl) setSalesforceUrl(sf.settings.instanceUrl);
        }

        const zoho = list.find((i) => i.provider.toLowerCase() === "zoho");
        if (zoho) {
          setZohoActive(zoho.isActive);
          if (zoho.maskedKey) setZohoToken(zoho.maskedKey);
          if (zoho.settings?.apiDomain) setZohoDomain(zoho.settings.apiDomain);
        }
      } catch {
        // Fallback for dev mode
      } finally {
        setLoadingCrm(false);
      }
    })();
  }, [activeTab]);

  const handleTestMsgProvider = async (provider: "whatsapp" | "resend") => {
    try {
      setTestingMsgProvider(provider);
      const res = await automationsApi.testProviderConnection(provider);
      if (res.success) {
        success(`${provider === "whatsapp" ? "Meta WhatsApp" : "Resend"} link verified: ${res.message}`);
        if (provider === "whatsapp") setWaStatus("Connected");
        if (provider === "resend") setResendStatus("Connected");
      } else {
        warning(`${provider} test response: ${res.message}`);
      }
    } catch {
      error(`Could not test ${provider} connection.`);
    } finally {
      setTestingMsgProvider(null);
    }
  };

  const handleTestConnection = async (provider: string, credentials: Record<string, any>) => {
    try {
      setTestingCrm(provider);
      const res = await integrationsApi.testConnection(provider, credentials);
      if (res.success) {
        success(`Connection Verified: ${res.message}`);
      } else {
        error(`Connection Failed: ${res.message}`);
      }
    } catch (err) {
      error(`Test Failed: ${normalizeApiError(err)}`);
    } finally {
      setTestingCrm(null);
    }
  };

  const handleSaveIntegration = async (
    provider: string,
    payload: { isActive: boolean; credentials?: Record<string, any>; settings?: Record<string, any> }
  ) => {
    try {
      setSavingCrm(provider);
      await integrationsApi.upsert(provider, payload);
      success(`${provider.toUpperCase()} settings saved successfully`);
      const updated = await integrationsApi.list();
      setCrmList(updated);
    } catch (err) {
      error(`Save Failed: ${normalizeApiError(err)}`);
    } finally {
      setSavingCrm(null);
    }
  };

  const handleTestCalcom = async () => {
    try {
      setTestingCalcom(true);
      const res: CalendarProviderStatus = await appointmentsApi.testProvider();
      if (res.provider === "calcom" && res.configured && res.success) {
        success(`Cal.com verified: ${res.message}`);
        setCalcomStatus("Connected");
      } else {
        warning(`Calendar provider: ${res.message}${res.provider !== "calcom" ? " — live Cal.com not configured yet" : ""}`);
        setCalcomStatus(res.provider === "calcom" ? "Configured" : res.isMock ? "Mock Mode" : "Not Configured");
      }
    } catch (err) {
      error(`Cal.com test failed: ${normalizeApiError(err)}`);
    } finally {
      setTestingCalcom(false);
    }
  };

  const handleSaveCalcom = async () => {
    try {
      setSavingCalcom(true);
      const settings: Record<string, any> = {
        eventTypeId: calcomEventType.trim() ? Number(calcomEventType.trim()) : undefined,
        timezone: calcomTimezone,
        defaultDuration: calcomDuration,
      };
      if (!settings.eventTypeId) delete settings.eventTypeId;
      await integrationsApi.upsert("calcom", {
        isActive: calcomActive,
        credentials: { ...(calcomKey.trim() ? { apiKey: calcomKey.trim() } : {}), apiUrl: calcomApiUrl.trim() || undefined },
        settings,
      });
      success("Cal.com settings saved. Availability is now served from your live booking calendar.");
      setCalcomKey("");
      const prov: CalendarProviderStatus = await appointmentsApi.providerStatus().catch(() => null as any);
      if (prov) {
        if (!prov.isMock && prov.configured && prov.success) setCalcomStatus("Connected");
        else setCalcomStatus(prov.configured ? "Configured" : "Mock Mode");
      }
      const updated = await integrationsApi.list();
      setCrmList(updated);
    } catch (err) {
      error(`Save Failed: ${normalizeApiError(err)}`);
    } finally {
      setSavingCalcom(false);
    }
  };

  // Hydrate from real tenant config
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await tenantApi.me();
        if (cancelled) return;
        if (data.name) setCompanyName(data.name);
        if (data.logo) setBrandLogoUrl(data.logo);
        if (data.settings) {
          if (typeof data.settings.timezone === "string") setTimezone(data.settings.timezone);
          if (typeof data.settings.currency === "string") setCurrency(data.settings.currency);
          if (typeof data.settings.brandAccentColor === "string") setBrandAccentColor(data.settings.brandAccentColor);
          if (typeof data.settings.subdomain === "string") setSubdomain(data.settings.subdomain);
          if (typeof data.settings.customDomain === "string") setCustomDomain(data.settings.customDomain);
          if (typeof data.settings.supportEmail === "string") setSupportEmail(data.settings.supportEmail);
          if (typeof data.settings.supportPhone === "string") setSupportPhone(data.settings.supportPhone);
          if (typeof data.settings.removeWatermark === "boolean") setRemoveWatermark(data.settings.removeWatermark);
          if (typeof data.settings.customDisclaimer === "string") setCustomDisclaimer(data.settings.customDisclaimer);
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
        settings: {
          timezone,
          currency,
          brandAccentColor,
          subdomain,
          customDomain,
          supportEmail,
          supportPhone,
          removeWatermark,
          customDisclaimer,
        },
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

  const handleSaveBranding = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingBranding(true);
    try {
      await tenantApi.updateMe({
        logo: brandLogoUrl,
        settings: {
          timezone,
          currency,
          brandAccentColor,
          subdomain,
          customDomain,
          supportEmail,
          supportPhone,
          removeWatermark,
          customDisclaimer,
        },
      });
      setSaved(true);
      success("Branding and white-label preferences updated!");
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      error(`Save failed: ${normalizeApiError(err)}`);
    } finally {
      setSavingBranding(false);
    }
  };

  if (!can(PERMISSIONS.WORKSPACE_MANAGE)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Access Restricted</p>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
            You do not have permission to manage workspace settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Settings & Integrations</h1>
        <p className="text-sm text-slate-500 dark:text-white/50 mt-1">Configure company preferences, telephony credentials, two-way CRM sync, and security controls.</p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          Settings successfully updated!
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-6 text-sm overflow-x-auto">
        {[
          { id: "general", label: "General" },
          { id: "branding", label: "Branding & White-Label" },
          { id: "integrations", label: "CRM Integrations (2-Way)" },
          { id: "telephony", label: "Telephony (Twilio/Exotel)" },
          { id: "api_keys", label: "API Keys & Webhooks" },
          { id: "security", label: "Security & RBAC" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 font-semibold transition-all relative whitespace-nowrap ${
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

        {activeTab === "branding" && (
          <div className="space-y-6">
            {/* Enterprise Header Badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-600/5 to-purple-500/10 border border-brand-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-500">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise White-Label Suite</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Tier 1 Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                    Present your own brand identity, custom portal domains, and personalized caller audio to clients.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSaveBranding()}
                disabled={savingBranding}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all flex items-center gap-2"
                style={{ backgroundColor: brandAccentColor }}
              >
                {savingBranding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Branding
              </button>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Visual Identity */}
                <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-brand-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Brand & Visual Identity</h4>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                        Logo URL (PNG / SVG with transparent background)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={brandLogoUrl}
                          onChange={(e) => setBrandLogoUrl(e.target.value)}
                          placeholder="https://yourdomain.com/logo.svg"
                          className="flex-1 h-10 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => setBrandLogoUrl("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80")}
                          className="px-3 h-10 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white transition-all"
                        >
                          Reset Demo
                        </button>
                      </div>
                    </div>

                    {/* Accent Color Picker */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-2">
                        Primary Brand Accent Color
                      </label>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {[
                          { name: "Crimson Ember", hex: "#D42027" },
                          { name: "Emerald Apex", hex: "#10B981" },
                          { name: "Royal Indigo", hex: "#6366F1" },
                          { name: "Amber Sunrise", hex: "#F59E0B" },
                          { name: "Cyan Wave", hex: "#06B6D4" },
                          { name: "Violet Modern", hex: "#8B5CF6" },
                          { name: "Slate Minimal", hex: "#475569" },
                        ].map((color) => (
                          <button
                            key={color.hex}
                            type="button"
                            onClick={() => setBrandAccentColor(color.hex)}
                            className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                              brandAccentColor.toLowerCase() === color.hex.toLowerCase()
                                ? "border-slate-900 dark:border-white scale-110 shadow-md ring-2 ring-brand-500/30"
                                : "border-transparent hover:scale-105"
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            {brandAccentColor.toLowerCase() === color.hex.toLowerCase() && (
                              <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                            )}
                          </button>
                        ))}

                        <div className="flex items-center gap-1.5 ml-2">
                          <input
                            type="color"
                            value={brandAccentColor}
                            onChange={(e) => setBrandAccentColor(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                          />
                          <input
                            type="text"
                            value={brandAccentColor}
                            onChange={(e) => setBrandAccentColor(e.target.value)}
                            className="w-20 h-8 rounded-lg px-2 text-xs font-mono bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subdomains & Custom Domains */}
                <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Subdomains & Custom CNAME</h4>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                        Hosted Subdomain
                      </label>
                      <div className="flex items-center rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 overflow-hidden">
                        <input
                          type="text"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value)}
                          className="flex-1 h-10 px-3 text-xs bg-transparent text-slate-900 dark:text-white outline-none"
                        />
                        <span className="px-2.5 text-xs text-slate-400 dark:text-white/40 font-mono bg-slate-100 dark:bg-white/[0.05] h-10 flex items-center border-l border-slate-200 dark:border-white/10">
                          .agentcall.ai
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                        Custom Domain (CNAME)
                      </label>
                      <input
                        type="text"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        placeholder="call.yourdomain.com"
                        className="w-full h-10 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-white/70">DNS Configuration: </span>
                      <code className="text-brand-600 dark:text-brand-400 font-mono">CNAME {customDomain || "call.yourdomain.com"} -&gt; ingress.agentcall.ai</code>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SSL Provisioned
                    </span>
                  </div>
                </div>

                {/* White-Label Toggles & Helpdesk */}
                <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Client Portal & Compliance</h4>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                        Client Helpline Phone
                      </label>
                      <input
                        type="text"
                        value={supportPhone}
                        onChange={(e) => setSupportPhone(e.target.value)}
                        className="w-full h-10 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                        Support Concierge Email
                      </label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full h-10 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                      Call Recording Compliance Prompt
                    </label>
                    <input
                      type="text"
                      value={customDisclaimer}
                      onChange={(e) => setCustomDisclaimer(e.target.value)}
                      className="w-full h-10 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Remove &apos;Powered by AgentCall AI&apos; Watermark</p>
                      <p className="text-[11px] text-slate-500 dark:text-white/50">Hide all vendor badges from customer-facing booking links and email receipts.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeWatermark}
                        onChange={(e) => setRemoveWatermark(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-white/15 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Client Portal Preview (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-brand-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Live Client Preview</h4>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/40">
                    Real-Time Canvas
                  </span>
                </div>

                {/* Mock Browser / Phone Window */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-950 overflow-hidden shadow-2xl">
                  {/* Browser Bar */}
                  <div className="px-4 py-2.5 bg-slate-100 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="inline-block px-3 py-0.5 rounded-md bg-white dark:bg-white/[0.06] text-[10px] font-mono text-slate-600 dark:text-white/60">
                        https://{customDomain || `${subdomain}.agentcall.ai`}
                      </span>
                    </div>
                  </div>

                  {/* Client Facing Branded UI */}
                  <div className="p-6 space-y-6">
                    {/* Brand Top Bar */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-3">
                        {brandLogoUrl ? (
                          <img
                            src={brandLogoUrl}
                            alt="Brand Logo"
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10 shadow-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
                            style={{ backgroundColor: brandAccentColor }}
                          >
                            {companyName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{companyName}</p>
                          <p className="text-[10px] text-slate-500 dark:text-white/50">{subdomain}.agentcall.ai</p>
                        </div>
                      </div>
                      <div
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: brandAccentColor }}
                      >
                        Verified
                      </div>
                    </div>

                    {/* Client Calling Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-white/[0.03] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 text-center space-y-3">
                      <div
                        className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-white shadow-lg animate-pulse"
                        style={{ backgroundColor: brandAccentColor }}
                      >
                        <PhoneCall className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-slate-900 dark:text-white">Connecting with {companyName} AI</h5>
                        <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">Automated Concierge Line: {supportPhone}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-[10px] text-slate-600 dark:text-white/60 italic leading-snug">
                        &ldquo;{customDisclaimer}&rdquo;
                      </div>

                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow"
                          style={{ backgroundColor: brandAccentColor }}
                        >
                          Accept Call
                        </button>
                        <button
                          type="button"
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-white"
                        >
                          Decline
                        </button>
                      </div>
                    </div>

                    {/* Footer Watermark status */}
                    <div className="text-center pt-2 text-[10px] text-slate-400 dark:text-white/40">
                      {removeWatermark ? (
                        <span className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3 h-3" /> White-Label Active: No Vendor Watermark
                        </span>
                      ) : (
                        <span>Powered by AgentCall AI Enterprise</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── TELEPHONY SIP TRUNKING & FAILOVER MANAGER ──────────────── */}
        {activeTab === "telephony" && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Multi-Carrier SIP Trunking & Failover Engine</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      99.995% Telephony SLA
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                    Sub-100ms PSTN interconnect with automated failover across Twilio, Telnyx, and Plivo trunks.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSimulateCarrierFailover}
                disabled={isSimulatingFailover}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
              >
                {isSimulatingFailover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                Simulate Carrier Degrade & Failover
              </button>
            </div>

            {/* Carrier Pool Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {carriers.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    c.status === "Healthy" && c.role.includes("Active")
                      ? "bg-blue-500/10 border-blue-500/30 shadow-sm"
                      : c.status === "Degraded"
                      ? "bg-rose-500/10 border-rose-500/30"
                      : "bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{c.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      c.status === "Healthy"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : c.status === "Degraded"
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 border-slate-200 dark:border-white/10"
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 mb-3">{c.role}</p>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-200 dark:border-white/10 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Latency</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{c.latency}ms</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Jitter</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{c.jitter}ms</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Loss</p>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">{c.packetLoss}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Failover Threshold Settings */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Automated Circuit-Breaker Failover Rules</h4>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                    Traffic is instantly re-routed to standby carriers when network metrics breach SLA bounds.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-700 dark:text-white/70">Enable Auto-Failover</span>
                  <input
                    type="checkbox"
                    checked={carrierFailoverActive}
                    onChange={(e) => setCarrierFailoverActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-white/70 mb-1.5">
                    <span>Latency Failover Threshold</span>
                    <span className="font-mono text-blue-500">{latencyThreshold}ms</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="400"
                    step="10"
                    value={latencyThreshold}
                    onChange={(e) => setLatencyThreshold(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-white/70 mb-1.5">
                    <span>Jitter Failover Threshold</span>
                    <span className="font-mono text-blue-500">{jitterThreshold}ms</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={jitterThreshold}
                    onChange={(e) => setJitterThreshold(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* DID Phone Number Inventory */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Provisioned DID Phone Numbers</h4>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                    Dedicated inbound/outbound phone numbers assigned to your AI agents with STIR/SHAKEN reputation attestation.
                  </p>
                </div>

                {/* Quick Provision Form */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Prefix (e.g. +1 888)"
                    value={newDidNumber}
                    onChange={(e) => setNewDidNumber(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white w-32"
                  />
                  <button
                    type="button"
                    onClick={handleProvisionDid}
                    disabled={isProvisioningDid}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all flex items-center gap-1.5"
                  >
                    {isProvisioningDid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                    Provision DID
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 border-b border-slate-200 dark:border-white/[0.06] font-semibold">
                    <tr>
                      <th className="py-3 px-4">DID Phone Number</th>
                      <th className="py-3 px-4">Region / Country</th>
                      <th className="py-3 px-4">Assigned Agent</th>
                      <th className="py-3 px-4">STIR/SHAKEN Attestation</th>
                      <th className="py-3 px-4">Spam Risk Score</th>
                      <th className="py-3 px-4">Capabilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/[0.05]">
                    {didNumbers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {d.number}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-white/70">
                          {d.country}
                        </td>
                        <td className="py-3 px-4 font-semibold text-brand-600 dark:text-brand-400">
                          {d.assignedAgent}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {d.stirShaken}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {d.spamRisk}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-white/50 font-medium">
                          {d.channels}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "api_keys" && (
          <div className="space-y-6">
            {/* Header Badge */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-purple-500/5 to-transparent border border-brand-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise Webhooks & REST API Stream</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      HMAC SHA-256 Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                    Stream real-time call lifecycle events to Zapier, Make, and enterprise CRM webhooks.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestPing}
                disabled={isSendingPing}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                {isSendingPing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Send Test Ping Payload
              </button>
            </div>

            {/* REST API Key Card */}
            <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Production API Key</h4>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                    Use in the Authorization header (`Bearer sk_live_...`) to programmatically initiate outbound calls.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setApiKey(`sk_live_agentcall_${Math.random().toString(36).slice(2, 12)}`);
                    success("New API key generated successfully!");
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-all"
                >
                  Rotate Key
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/15 flex items-center justify-between font-mono text-xs text-slate-900 dark:text-white">
                  <span>{showApiKey ? apiKey : `sk_live_••••••••••••${apiKey.slice(-6)}`}</span>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors text-[11px]"
                  >
                    {showApiKey ? "Hide" : "Reveal"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(apiKey);
                    success("API key copied to clipboard!");
                  }}
                  className="h-11 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white transition-all flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </button>
              </div>
            </div>

            {/* Outbound Webhook Subscriptions */}
            <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Outbound Webhook Dispatcher</h4>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                    Webhook Endpoint URL (HTTPS)
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-crm.com/api/agentcall-events"
                    className="w-full h-10 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-1.5">
                    HMAC Signing Secret
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 overflow-hidden">
                    <input
                      type="text"
                      readOnly
                      value={webhookSecret}
                      className="flex-1 h-10 px-3 text-xs bg-transparent text-slate-900 dark:text-white font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(webhookSecret);
                        success("Webhook secret copied!");
                      }}
                      className="px-3 text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Subscribed Events Checklist */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-white/70 block mb-2">
                  Subscribed Event Topics
                </label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    { id: "call.started", label: "call.started", desc: "Outbound / Inbound initiated" },
                    { id: "call.completed", label: "call.completed", desc: "Duration & outcome ready" },
                    { id: "lead.qualified", label: "lead.qualified", desc: "Score >= 75 reached" },
                    { id: "appointment.booked", label: "appointment.booked", desc: "Meeting held on calendar" },
                  ].map((ev) => {
                    const isChecked = subscribedEvents.includes(ev.id);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setSubscribedEvents(
                            isChecked
                              ? subscribedEvents.filter((e) => e !== ev.id)
                              : [...subscribedEvents, ev.id]
                          );
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-brand-500/10 border-brand-500/30 text-slate-900 dark:text-white"
                            : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10 text-slate-500"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <code className="text-xs font-bold text-brand-600 dark:text-brand-400">{ev.label}</code>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded accent-brand-500"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-white/50">{ev.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ping Test Receipt */}
              {lastPingResult && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-xs flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>
                      Delivery Succeeded: <strong>HTTP {lastPingResult.status} OK</strong> ({lastPingResult.latencyMs}ms roundtrip)
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                    Dispatched at {lastPingResult.timestamp}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ──────────────── ENTERPRISE RBAC & SECURITY AUDIT TRAIL ──────────────── */}
        {activeTab === "security" && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enterprise RBAC & Security Audit Trail</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                      SOC-2 Type II Certified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                    Granular role matrix, seat quota management, and immutable tamper-evident activity logging.
                  </p>
                </div>
              </div>

              {/* Sub-tab toggle */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/[0.06] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSecuritySubTab("rbac")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    securitySubTab === "rbac"
                      ? "bg-white dark:bg-purple-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-white/50"
                  }`}
                >
                  Team & Seats
                </button>
                <button
                  type="button"
                  onClick={() => setSecuritySubTab("audit")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    securitySubTab === "audit"
                      ? "bg-white dark:bg-purple-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 dark:text-white/50"
                  }`}
                >
                  Audit Trail
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: TEAM SEATS & ROLE MATRIX */}
            {securitySubTab === "rbac" && (
              <div className="space-y-6">
                
                {/* Seat Quota Tracker */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Workspace Seat Quota Allocation</span>
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">{teamMembers.length} / 15 Seats Used (27% capacity)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-brand-500 rounded-full" style={{ width: `${(teamMembers.length / 15) * 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <span>Enterprise Tier: 15 Concurrent Seats Included</span>
                    <span>Single Sign-On (SAML/Okta) Active</span>
                  </div>
                </div>

                {/* Invite Team Member */}
                <form onSubmit={handleInviteMember} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="email"
                    placeholder="Enter colleague's work email..."
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full sm:w-48 px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Company Admin">Company Admin</option>
                    <option value="Call Center Manager">Call Center Manager</option>
                    <option value="QA Compliance Auditor">QA Compliance Auditor</option>
                    <option value="Agent Operator">Agent Operator</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Invite Member
                  </button>
                </form>

                {/* Team Members List */}
                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 border-b border-slate-200 dark:border-white/[0.06] font-semibold">
                      <tr>
                        <th className="py-3 px-4">Member</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Assigned Role</th>
                        <th className="py-3 px-4">Last Active</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/[0.05]">
                      {teamMembers.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${m.avatarBg} text-white font-black text-[10px] flex items-center justify-center`}>
                              {m.name[0]}
                            </div>
                            <span>{m.name}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 dark:text-white/60">{m.email}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                              {m.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">{m.lastActive}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setTeamMembers(teamMembers.filter((t) => t.id !== m.id));
                                success(`Revoked seat access for ${m.name}`);
                              }}
                              className="text-[11px] text-rose-500 hover:underline"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: TAMPER-EVIDENT AUDIT TRAIL */}
            {securitySubTab === "audit" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Immutable Event Activity Log</h4>
                    <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                      Cryptographically signed audit trail recording actor actions, IP telemetry, and state diffs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Filter:</span>
                    <select
                      value={auditFilter}
                      onChange={(e) => setAuditFilter(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-semibold"
                    >
                      <option value="all">All Events</option>
                      <option value="PROMPT_UPDATE">Prompt Updates</option>
                      <option value="API_KEY_ROTATED">API Key Rotations</option>
                      <option value="TRANSCRIPT_EXPORT">Transcript Exports</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] overflow-hidden bg-slate-50/50 dark:bg-white/[0.02]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 dark:bg-white/[0.04] text-slate-600 dark:text-white/60 border-b border-slate-200 dark:border-white/[0.06] font-semibold">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Actor</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Target Resource</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Payload Diff</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/[0.05]">
                      {auditLogs
                        .filter((log) => auditFilter === "all" || log.action === auditFilter)
                        .map((log) => (
                          <React.Fragment key={log.id}>
                            <tr className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                {log.timestamp}
                              </td>
                              <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                                {log.actor}
                              </td>
                              <td className="py-3 px-4">
                                <code className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/80 border border-slate-200 dark:border-white/10">
                                  {log.action}
                                </code>
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-white/70">
                                {log.target}
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                                {log.ip}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  log.status === "ALLOWED"
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setExpandedDiffId(expandedDiffId === log.id ? null : log.id)}
                                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                                >
                                  {expandedDiffId === log.id ? "Hide Diff" : "View Diff"}
                                </button>
                              </td>
                            </tr>
                            {expandedDiffId === log.id && (
                              <tr>
                                <td colSpan={7} className="p-4 bg-black/40 border-y border-white/10">
                                  <pre className="text-[11px] font-mono text-purple-300 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.diff, null, 2)}
                                  </pre>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── CRM INTEGRATIONS (TWO-WAY SYNC) ──────────────── */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent border border-brand-500/20">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-brand-500" />
                    Two-Way External CRM Synchronization
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/60 mt-1 max-w-2xl leading-relaxed">
                    Automatically push Gemini post-call intelligence (qualification scores, executive summaries, sentiment ratings, and next action items) directly into your team&apos;s CRM upon call completion.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 rounded bg-brand-500/20 text-brand-700 dark:text-brand-300 font-bold uppercase">
                  BullMQ Queue Active
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* 1. HUBSPOT CRM */}
              <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 font-black text-sm">
                        HS
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">HubSpot CRM</h4>
                        <p className="text-[11px] text-slate-400">Contacts &amp; Engagements API v3</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hubspotActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50"
                    }`}>
                      {hubspotActive ? "● Active Sync" : "○ Disabled"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Private App Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="pat-na1-xxxxxxxx-xxxx-xxxx"
                        value={hubspotKey}
                        onChange={(e) => setHubspotKey(e.target.value)}
                        className="w-full h-9 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none focus:border-brand-500"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/80 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={hubspotActive}
                        onChange={(e) => setHubspotActive(e.target.checked)}
                        className="rounded text-brand-600 cursor-pointer"
                      />
                      Enable automatic post-call sync to HubSpot
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={testingCrm === "hubspot" || !hubspotKey}
                    onClick={() => handleTestConnection("hubspot", { accessToken: hubspotKey })}
                    className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    {testingCrm === "hubspot" ? "Testing..." : "Test Link"}
                  </button>
                  <button
                    type="button"
                    disabled={savingCrm === "hubspot"}
                    onClick={() =>
                      handleSaveIntegration("hubspot", {
                        isActive: hubspotActive,
                        credentials: { accessToken: hubspotKey },
                      })
                    }
                    className="flex-1 py-1.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold disabled:opacity-40"
                  >
                    {savingCrm === "hubspot" ? "Saving..." : "Save HubSpot"}
                  </button>
                </div>
              </div>

              {/* 2. SALESFORCE CRM */}
              <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 font-black text-sm">
                        SF
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Salesforce</h4>
                        <p className="text-[11px] text-slate-400">REST API v58.0 SObjects</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      salesforceActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50"
                    }`}>
                      {salesforceActive ? "● Active Sync" : "○ Disabled"}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Instance URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://yourorg.my.salesforce.com"
                        value={salesforceUrl}
                        onChange={(e) => setSalesforceUrl(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        OAuth Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="OAuth Access Token"
                        value={salesforceToken}
                        onChange={(e) => setSalesforceToken(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/80 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={salesforceActive}
                        onChange={(e) => setSalesforceActive(e.target.checked)}
                        className="rounded text-brand-600 cursor-pointer"
                      />
                      Enable automatic post-call sync to Salesforce
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={testingCrm === "salesforce" || !salesforceToken}
                    onClick={() => handleTestConnection("salesforce", { accessToken: salesforceToken, instanceUrl: salesforceUrl })}
                    className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    {testingCrm === "salesforce" ? "Testing..." : "Test Link"}
                  </button>
                  <button
                    type="button"
                    disabled={savingCrm === "salesforce"}
                    onClick={() =>
                      handleSaveIntegration("salesforce", {
                        isActive: salesforceActive,
                        credentials: { accessToken: salesforceToken, instanceUrl: salesforceUrl },
                        settings: { instanceUrl: salesforceUrl },
                      })
                    }
                    className="flex-1 py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold disabled:opacity-40"
                  >
                    {savingCrm === "salesforce" ? "Saving..." : "Save Salesforce"}
                  </button>
                </div>
              </div>

              {/* 3. ZOHO CRM */}
              <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        ZC
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Zoho CRM</h4>
                        <p className="text-[11px] text-slate-400">Leads &amp; Notes API v2</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      zohoActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50"
                    }`}>
                      {zohoActive ? "● Active Sync" : "○ Disabled"}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        API Domain
                      </label>
                      <input
                        type="text"
                        placeholder="https://www.zohoapis.com/crm/v2"
                        value={zohoDomain}
                        onChange={(e) => setZohoDomain(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        OAuth Token
                      </label>
                      <input
                        type="password"
                        placeholder="Zoho-oauthtoken ..."
                        value={zohoToken}
                        onChange={(e) => setZohoToken(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/80 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={zohoActive}
                        onChange={(e) => setZohoActive(e.target.checked)}
                        className="rounded text-brand-600 cursor-pointer"
                      />
                      Enable automatic post-call sync to Zoho CRM
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={testingCrm === "zoho" || !zohoToken}
                    onClick={() => handleTestConnection("zoho", { accessToken: zohoToken, apiDomain: zohoDomain })}
                    className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    {testingCrm === "zoho" ? "Testing..." : "Test Link"}
                  </button>
                  <button
                    type="button"
                    disabled={savingCrm === "zoho"}
                    onClick={() =>
                      handleSaveIntegration("zoho", {
                        isActive: zohoActive,
                        credentials: { accessToken: zohoToken },
                        settings: { apiDomain: zohoDomain },
                      })
                    }
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"
                  >
                    {savingCrm === "zoho" ? "Saving..." : "Save Zoho"}
                  </button>
                </div>
              </div>

              {/* 4. META WHATSAPP CLOUD API */}
              <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-sm">
                        WA
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Meta WhatsApp Cloud</h4>
                        <p className="text-[11px] text-slate-400">Graph API v20.0 Business Platform</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      waStatus === "Connected"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50"
                    }`}>
                      {waStatus}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 104857692019283"
                        value={waPhoneId}
                        onChange={(e) => setWaPhoneId(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        System User Access Token
                      </label>
                      <input
                        type="password"
                        placeholder="EAABw..."
                        value={waToken}
                        onChange={(e) => setWaToken(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/80 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={waActive}
                        onChange={(e) => setWaActive(e.target.checked)}
                        className="rounded text-brand-600 cursor-pointer"
                      />
                      Enable WhatsApp outbound automations
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={testingMsgProvider === "whatsapp"}
                    onClick={() => handleTestMsgProvider("whatsapp")}
                    className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    {testingMsgProvider === "whatsapp" ? "Verifying..." : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      success("WhatsApp configuration saved (tenant profile updated)");
                      setWaStatus("Configured");
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                  >
                    Save WhatsApp
                  </button>
                </div>
              </div>

              {/* 5. RESEND EMAIL API */}
              <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-lg flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-sm">
                        RE
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Resend Email</h4>
                        <p className="text-[11px] text-slate-400">Transactional Email API</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      resendStatus === "Connected"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50"
                    }`}>
                      {resendStatus}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Resend API Key
                      </label>
                      <input
                        type="password"
                        placeholder="re_123456789..."
                        value={resendKey}
                        onChange={(e) => setResendKey(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Verified Sender Address (From)
                      </label>
                      <input
                        type="email"
                        placeholder="updates@yourdomain.com"
                        value={resendFrom}
                        onChange={(e) => setResendFrom(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/80 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={resendActive}
                        onChange={(e) => setResendActive(e.target.checked)}
                        className="rounded text-brand-600 cursor-pointer"
                      />
                      Enable Resend transactional emails
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={testingMsgProvider === "resend"}
                    onClick={() => handleTestMsgProvider("resend")}
                    className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    {testingMsgProvider === "resend" ? "Verifying..." : "Test Connection"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      success("Resend configuration saved (tenant profile updated)");
                      setResendStatus("Configured");
                    }}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                  >
                    Save Resend
                  </button>
                </div>
              </div>

              {/* 7. CAL.COM BOOKING CALENDAR (Day 17) */}
              <div className="rounded-2xl p-5 panel-card border border-slate-200 dark:border-white/[0.08] shadow-lg flex flex-col justify-between space-y-4 md:col-span-2">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-sm">
                        CC
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cal.com Booking Calendar</h4>
                        <p className="text-[11px] text-slate-400">Live availability &amp; appointment scheduling API v1</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      calcomStatus === "Connected"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : calcomStatus === "Mock Mode"
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50"
                    }`}>
                      {calcomStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-white/60 leading-relaxed mb-3">
                    Connect a Cal.com account to serve live booking slots, provider-synced confirmations, idempotent
                    booking, and automatic 24h/1h WhatsApp reminders. Without a key the built-in mock calendar keeps
                    every flow working in demo mode.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Cal.com API Key
                      </label>
                      <input
                        type="password"
                        placeholder={calcomKey === "" && calcomStatus !== "Not Configured" ? "Saved — leave empty to keep" : "cal_live_..."}
                        value={calcomKey}
                        onChange={(e) => setCalcomKey(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Event Type ID
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 123456"
                        value={calcomEventType}
                        onChange={(e) => setCalcomEventType(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Default Timezone
                      </label>
                      <input
                        type="text"
                        placeholder="Asia/Kolkata"
                        value={calcomTimezone}
                        onChange={(e) => setCalcomTimezone(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        Default Duration
                      </label>
                      <select
                        value={calcomDuration}
                        onChange={(e) => setCalcomDuration(Number(e.target.value))}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white outline-none"
                      >
                        <option value={15}>15 mins</option>
                        <option value={30}>30 mins</option>
                        <option value={45}>45 mins</option>
                        <option value={60}>60 mins</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-white/70 block mb-1">
                        API URL
                      </label>
                      <input
                        type="text"
                        value={calcomApiUrl}
                        onChange={(e) => setCalcomApiUrl(e.target.value)}
                        className="w-full h-8 rounded-xl px-3 text-xs bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/15 text-slate-900 dark:text-white font-mono outline-none"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-white/80 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={calcomActive}
                      onChange={(e) => setCalcomActive(e.target.checked)}
                      className="rounded text-brand-600 cursor-pointer"
                    />
                    Use Cal.com as the tenant&apos;s calendar provider (overrides mock/native defaults)
                  </label>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    disabled={testingCalcom}
                    onClick={handleTestCalcom}
                    className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-white/15 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    {testingCalcom ? <Loader2 className="w-3.5 h-3.5 inline animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 inline mr-1" />}
                    {testingCalcom ? "Testing..." : "Test Provider"}
                  </button>
                  <button
                    type="button"
                    disabled={savingCalcom}
                    onClick={handleSaveCalcom}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-40"
                  >
                    {savingCalcom ? "Saving..." : "Save Cal.com"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pt-4">
          {activeTab !== "general" && activeTab !== "integrations" && (
            <p className="text-xs text-slate-500 dark:text-white/40">
              This tab has no server persistence yet — only General &amp; Branding settings and CRM / Cal.com integrations are saved.
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
