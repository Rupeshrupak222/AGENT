"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Target,
  Plus,
  Play,
  Pause,
  RotateCcw,
  XCircle,
  RefreshCw,
  Clock,
  Bot,
  Calendar,
  AlertCircle,
  Layers,
  ChevronDown,
  Flame,
  Zap,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  ShieldCheck,
  PhoneCall,
  Radio,
  Activity,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import {
  campaignsApi,
  CampaignItem,
  CampaignMetrics,
  CampaignLeadItem,
  normalizeApiError,
} from "@/lib/api";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { CampaignKPICards } from "@/components/campaigns/CampaignKPICards";
import { CampaignProgressBar } from "@/components/campaigns/CampaignProgressBar";
import { CampaignLeadsTable } from "@/components/campaigns/CampaignLeadsTable";
import { CampaignCreationModal } from "@/components/campaigns/CampaignCreationModal";
import { UnifiedCallWorkspaceModal } from "@/components/campaigns/UnifiedCallWorkspaceModal";
import { AbExperimentLabModal } from "@/components/campaigns/AbExperimentLabModal";
import { realtimeSocket } from "@/lib/socket";

export default function CampaignOperationsPage() {
  const { success, error, info } = useToast();
  const { can } = usePermissions();

  // Socket Live State
  const [isLive, setIsLive] = useState(false);

  // Permissions
  const canCreate = can(PERMISSIONS.CAMPAIGN_CREATE);
  const canUpdate = can(PERMISSIONS.CAMPAIGN_UPDATE);
  const canExecute = can(PERMISSIONS.CAMPAIGN_EXECUTE);
  const canPause = can(PERMISSIONS.CAMPAIGN_PAUSE);

  // View switch: Operations vs Predictive Dialer Radar
  const [activeView, setActiveView] = useState<"operations" | "predictive_radar">("operations");
  const [selectedTimezone, setSelectedTimezone] = useState("Asia/Kolkata (IST)");
  const [amdEnabled, setAmdEnabled] = useState(true);
  const [recycleHours, setRecycleHours] = useState(48);
  const [isAbModalOpen, setIsAbModalOpen] = useState(false);

  // Campaigns list state
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Active Campaign Details & Metrics
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Campaign Leads Table State
  const [leads, setLeads] = useState<CampaignLeadItem[]>([]);
  const [leadTotal, setLeadTotal] = useState(0);
  const [leadPage, setLeadPage] = useState(1);
  const [leadLimit] = useState(15);
  const [leadStatusFilter, setLeadStatusFilter] = useState("");
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Action Pending States
  const [actionPending, setActionPending] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  // 1. Fetch All Campaigns
  const loadCampaigns = useCallback(async (selectId?: string) => {
    try {
      setLoadingCampaigns(true);
      const res = await campaignsApi.list();
      setCampaigns(res.items);

      if (res.items.length > 0) {
        if (selectId && res.items.some((c) => c.id === selectId)) {
          setSelectedCampaignId(selectId);
        } else if (!selectedCampaignId || !res.items.some((c) => c.id === selectedCampaignId)) {
          setSelectedCampaignId(res.items[0].id);
        }
      } else {
        setSelectedCampaignId(null);
      }
    } catch (err) {
      error(`Failed to load campaigns: ${normalizeApiError(err)}`);
    } finally {
      setLoadingCampaigns(false);
    }
  }, [selectedCampaignId, error]);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const activeCampaign = campaigns.find((c) => c.id === selectedCampaignId) || null;

  // 2. Fetch Metrics for Active Campaign
  const loadMetrics = useCallback(async () => {
    if (!selectedCampaignId) return;
    try {
      setLoadingMetrics(true);
      const res = await campaignsApi.getMetrics(selectedCampaignId);
      setMetrics(res);
    } catch (err) {
      // Non-blocking metrics load
    } finally {
      setLoadingMetrics(false);
    }
  }, [selectedCampaignId]);

  // 3. Fetch Leads for Active Campaign
  const loadLeads = useCallback(async () => {
    if (!selectedCampaignId) return;
    try {
      setLoadingLeads(true);
      const res = await campaignsApi.getLeads(selectedCampaignId, {
        page: leadPage,
        limit: leadLimit,
        status: leadStatusFilter || undefined,
      });
      setLeads(res.items);
      setLeadTotal(res.total);
    } catch (err) {
      // Non-blocking leads load
    } finally {
      setLoadingLeads(false);
    }
  }, [selectedCampaignId, leadPage, leadLimit, leadStatusFilter]);

  useEffect(() => {
    if (selectedCampaignId) {
      loadMetrics();
      loadLeads();
    }
  }, [selectedCampaignId, loadMetrics, loadLeads]);

  // ── Realtime Socket.IO Connection & Event Handlers ───────────────
  useEffect(() => {
    realtimeSocket.connect();

    const unsubConn = realtimeSocket.on("connection:status", (data) => {
      setIsLive(data.connected);
    });

    const unsubStatus = realtimeSocket.on("campaign:status", (data) => {
      if (data.campaignId === selectedCampaignId) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === data.campaignId ? { ...c, status: data.status } : c))
        );
        loadMetrics();
        loadLeads();
      }
    });

    const unsubProgress = realtimeSocket.on("campaign:progress", (data) => {
      if (data.campaignId === selectedCampaignId) {
        setMetrics((prev) => (prev ? { ...prev, ...data } : (data as any)));
      }
    });

    const unsubLeadStatus = realtimeSocket.on("campaign:lead:status", (data) => {
      if (selectedCampaignId) {
        setLeads((prev) =>
          prev.map((l) =>
            l.leadId === data.leadId
              ? {
                  ...l,
                  status: data.status,
                  outcome: data.outcome ?? l.outcome,
                  attemptCount: data.attemptCount ?? l.attemptCount,
                  lastCallId: data.lastCallId ?? l.lastCallId,
                }
              : l
          )
        );
      }
    });

    const unsubAnalysis = realtimeSocket.on("call:analysis", (data) => {
      if (data.campaignId === selectedCampaignId) {
        setLeads((prev) =>
          prev.map((l) =>
            l.lastCallId === data.callId
              ? {
                  ...l,
                  lastCall: l.lastCall
                    ? {
                        ...l.lastCall,
                        analysis: {
                          leadScore: data.leadScore,
                          intent: data.intent,
                          sentiment: data.sentiment,
                          summary: data.summary,
                          processingStatus: data.analysisStatus,
                          qualification: data.qualification,
                          appointmentDetected: data.appointmentDetected,
                        },
                      }
                    : null,
                }
              : l
          )
        );
      }
    });

    return () => {
      unsubConn();
      unsubStatus();
      unsubProgress();
      unsubLeadStatus();
      unsubAnalysis();
    };
  }, [selectedCampaignId, loadMetrics, loadLeads]);

  // Subscribe to selected campaign room
  useEffect(() => {
    if (selectedCampaignId) {
      realtimeSocket.subscribeCampaign(selectedCampaignId);
    }
    return () => {
      if (selectedCampaignId) {
        realtimeSocket.unsubscribeCampaign(selectedCampaignId);
      }
    };
  }, [selectedCampaignId]);

  // Conservative fallback: only pulse every 45s if socket is offline and campaign is running
  useEffect(() => {
    if (isLive || !activeCampaign || activeCampaign.status !== "running") return;
    const interval = setInterval(() => {
      loadMetrics();
      loadLeads();
    }, 45000);
    return () => clearInterval(interval);
  }, [isLive, activeCampaign, loadMetrics, loadLeads]);

  // Lifecycle Controls
  const handleStartCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      setActionPending(true);
      const res = await campaignsApi.start(selectedCampaignId);
      success(`Campaign Started: Outbound calling active. ${res.enqueued} leads enqueued for execution.`);
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
      loadLeads();
    } catch (err) {
      error(`Failed to Start: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handlePauseCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      setActionPending(true);
      await campaignsApi.pause(selectedCampaignId);
      info("Campaign Paused: Calling queue paused. Active calls will complete naturally.");
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
    } catch (err) {
      error(`Failed to Pause: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleResumeCampaign = async () => {
    if (!selectedCampaignId) return;
    try {
      setActionPending(true);
      const res = await campaignsApi.resume(selectedCampaignId);
      success(`Campaign Resumed: Calling resumed with ${res.enqueued} leads enqueued.`);
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
      loadLeads();
    } catch (err) {
      error(`Failed to Resume: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  const handleCancelCampaign = async () => {
    if (!selectedCampaignId) return;
    if (!confirm("Are you sure you want to cancel this campaign? Pending leads will be skipped.")) return;
    try {
      setActionPending(true);
      await campaignsApi.cancel(selectedCampaignId);
      info("Campaign Cancelled: Campaign was marked cancelled and uncalled leads skipped.");
      await loadCampaigns(selectedCampaignId);
      loadMetrics();
      loadLeads();
    } catch (err) {
      error(`Failed to Cancel: ${normalizeApiError(err)}`);
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
              <Target className="w-6 h-6 text-brand-500" />
              Campaign Operations
            </h1>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">
              Live Engine
            </span>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Offline
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
            Autonomous outbound dialer, eligibility validation & post-call AI intelligence workspace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadCampaigns(selectedCampaignId || undefined);
              loadMetrics();
              loadLeads();
            }}
            aria-label="Refresh data"
            className="p-2 rounded-xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCampaigns || loadingMetrics ? "animate-spin" : ""}`} />
          </button>

          {canUpdate && (
          <button
            type="button"
            onClick={() => setIsAbModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <FlaskConical className="w-3.5 h-3.5 text-purple-500" />
            <span>A/B Testing Lab</span>
          </button>
          )}

          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* ── View Switcher Navigation ── */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-6 text-sm">
        {[
          { id: "operations", label: "Campaign Operations & Dialer", icon: Target },
          { id: "predictive_radar", label: "Predictive Dialer & Lead Radar", icon: Flame },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id as any)}
              className={`pb-3 font-bold transition-all relative flex items-center gap-2 ${
                isActive
                  ? "text-brand-600 dark:text-white"
                  : "text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/70"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-brand-500" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── VIEW 1: REGULAR CAMPAIGN OPERATIONS ── */}
      {activeView === "operations" && (
      <>

      {/* ── Active Campaign Selector & Controls Bar ── */}
      {loadingCampaigns && campaigns.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/5">
          Loading active campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/5 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Outbound Campaigns Yet</h3>
            <p className="text-xs text-slate-500 dark:text-white/40 mt-1">
              Select leads from your CRM, configure calling parameters, and launch your first autonomous AI campaign.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Launch First Campaign</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Campaign Selector & Lifecycle Actions Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-surface-card border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    value={selectedCampaignId || ""}
                    onChange={(e) => {
                      setSelectedCampaignId(e.target.value);
                      setLeadPage(1);
                    }}
                    className="pl-3 pr-8 py-2 rounded-xl text-sm font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 appearance-none cursor-pointer"
                  >
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.status.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {activeCampaign && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        activeCampaign.status === "running"
                          ? "green"
                          : activeCampaign.status === "paused"
                          ? "yellow"
                          : activeCampaign.status === "completed"
                          ? "blue"
                          : "gray"
                      }
                      className="capitalize font-bold text-xs"
                    >
                      {activeCampaign.status}
                    </Badge>

                    {activeCampaign.agent && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs text-slate-600 dark:text-white/70">
                        <Bot className="w-3.5 h-3.5 text-brand-500" />
                        <span className="font-semibold">{activeCampaign.agent.name}</span>
                      </div>
                    )}

                    {activeCampaign.startTime && activeCampaign.endTime && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-xs text-slate-600 dark:text-white/70">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{activeCampaign.startTime} – {activeCampaign.endTime}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {activeCampaign && (
                <div className="flex items-center gap-2">
                  {/* Start (when draft) */}
                  {activeCampaign.status === "draft" && canExecute && (
                    <button
                      onClick={handleStartCampaign}
                      disabled={actionPending}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Campaign</span>
                    </button>
                  )}

                  {/* Pause (when running) */}
                  {activeCampaign.status === "running" && canPause && (
                    <button
                      onClick={handlePauseCampaign}
                      disabled={actionPending}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </button>
                  )}

                  {/* Resume (when paused) */}
                  {activeCampaign.status === "paused" && canExecute && (
                    <button
                      onClick={handleResumeCampaign}
                      disabled={actionPending}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Cancel (when running or paused) */}
                  {(activeCampaign.status === "running" || activeCampaign.status === "paused") && canPause && (
                    <button
                      onClick={handleCancelCampaign}
                      disabled={actionPending}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Campaign Config Parameters */}
            {activeCampaign && (
              <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-white/40">
                <span>Concurrency: <strong className="text-slate-800 dark:text-white">{activeCampaign.maxConcurrentCalls} lines</strong></span>
                <span>Max Attempts: <strong className="text-slate-800 dark:text-white">{activeCampaign.maxAttempts} dials</strong></span>
                <span>Daily Limit: <strong className="text-slate-800 dark:text-white">{activeCampaign.callsPerDay || "Unlimited"} calls</strong></span>
                <span>Days: <strong className="text-slate-800 dark:text-white">{activeCampaign.daysOfWeek?.length || 5} active</strong></span>
              </div>
            )}
          </div>

          {/* ── Operational KPI Cards ── */}
          <CampaignKPICards metrics={metrics} loading={loadingMetrics} />

          {/* ── Execution Progress Bar ── */}
          <CampaignProgressBar
            metrics={metrics}
            status={activeCampaign?.status || "draft"}
          />

          {/* ── Enrolled Campaign Leads Execution Table ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                Lead Execution & AI Outcomes
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {leadTotal} contacts enrolled
              </span>
            </div>

            <CampaignLeadsTable
              leads={leads}
              total={leadTotal}
              page={leadPage}
              limit={leadLimit}
              statusFilter={leadStatusFilter}
              searchQuery={leadSearchQuery}
              loading={loadingLeads}
              onPageChange={setLeadPage}
              onStatusFilterChange={(st) => {
                setLeadStatusFilter(st);
                setLeadPage(1);
              }}
              onSearchChange={setLeadSearchQuery}
              onSelectCall={(callId) => setSelectedCallId(callId)}
            />
          </div>
        </>
      )}
      </>
      )}

      {/* ── VIEW 2: PREDICTIVE SMART DIALER & LEAD INTENT ML RADAR ── */}
      {activeView === "predictive_radar" && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-brand-500/10 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Predictive Smart Dialer & Lead Intent Radar</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    ML Probability Engine Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/60 mt-0.5">
                  Calculates optimal calling time windows by lead timezone and scores conversion propensity in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Target Timezone:</span>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white font-semibold"
              >
                <option value="Asia/Kolkata (IST)">India Standard (IST)</option>
                <option value="America/New_York (EST)">US Eastern (EST)</option>
                <option value="America/Los_Angeles (PST)">US Pacific (PST)</option>
                <option value="Europe/London (GMT)">Europe / UK (GMT)</option>
              </select>
            </div>
          </div>

          {/* Timezone Pickup Probability Heatmap */}
          <div className="p-5 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  Hourly Pickup Probability Matrix ({selectedTimezone})
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-white/40">
                  Historical telemetry from 14,000+ completed calls across Enterprise B2B & Wealth management leads.
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                Peak Pickup: 10:30 AM – 12:00 PM (52% Rate)
              </span>
            </div>

            {/* Grid of Hourly Heat Cells */}
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 pt-1">
              {[
                { time: "8 AM", rate: 12, label: "Low" },
                { time: "9 AM", rate: 26, label: "Fair" },
                { time: "10 AM", rate: 48, label: "Peak" },
                { time: "11 AM", rate: 52, label: "Peak" },
                { time: "12 PM", rate: 38, label: "Good" },
                { time: "1 PM", rate: 18, label: "Lunch" },
                { time: "2 PM", rate: 31, label: "Fair" },
                { time: "3 PM", rate: 44, label: "Good" },
                { time: "4 PM", rate: 47, label: "Peak" },
                { time: "5 PM", rate: 39, label: "Good" },
                { time: "6 PM", rate: 28, label: "Fair" },
                { time: "7 PM", rate: 15, label: "Low" },
              ].map((cell, i) => (
                <div
                  key={i}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    cell.rate >= 45
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm"
                      : cell.rate >= 30
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                      : "bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-400"
                  }`}
                >
                  <p className="text-[10px] font-mono text-slate-400 dark:text-white/40">{cell.time}</p>
                  <p className="text-xs font-mono font-black mt-0.5">{cell.rate}%</p>
                  <span className="text-[9px] font-bold block opacity-75">{cell.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Intent ML Radar (4 Quadrants) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-brand-500" />
              Real-Time Lead Intent ML Radar
            </h4>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  tier: "Blazing Hot",
                  range: "Score 81–100",
                  leads: 18,
                  conversion: "84%",
                  color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                  action: "Instant VIP Executive Routing",
                },
                {
                  tier: "Warm Intent",
                  range: "Score 61–80",
                  leads: 34,
                  conversion: "58%",
                  color: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
                  badge: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
                  action: "WhatsApp Calendar Confirmation",
                },
                {
                  tier: "Nurture Track",
                  range: "Score 31–60",
                  leads: 42,
                  conversion: "24%",
                  color: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
                  action: "Automated Case Study Email",
                },
                {
                  tier: "Cold / Disqualified",
                  range: "Score 0–30",
                  leads: 12,
                  conversion: "4%",
                  color: "border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-500",
                  badge: "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40",
                  action: "Suppress from Active Queue",
                },
              ].map((q, i) => (
                <div key={i} className={`p-4 rounded-2xl border ${q.color} space-y-3 shadow-sm`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">{q.tier}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${q.badge}`}>
                      {q.range}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl font-mono font-black">{q.leads} Leads</span>
                    <p className="text-[10px] opacity-75 mt-0.5">Estimated Conversion: {q.conversion}</p>
                  </div>
                  <div className="pt-2 border-t border-current/10 text-[11px] font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 flex-shrink-0" />
                    <span>{q.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Answering Machine Detection (AMD) & Voicemail Drop Configuration */}
          <div className="p-5 rounded-2xl bg-white dark:bg-surface-card border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Smart Answering Machine Detection (AMD) & Voicemail Drop</h4>
                <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                  Deepgram audio classification detects machine beeps in 180ms and seamlessly injects pre-recorded studio audio.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-slate-700 dark:text-white/70">Enable Studio AMD</span>
                <input
                  type="checkbox"
                  checked={amdEnabled}
                  onChange={(e) => setAmdEnabled(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-500"
                />
              </label>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-brand-500" />
                <span className="text-slate-700 dark:text-white/80">
                  Voicemail Audio Script: <em>&ldquo;Hi, this is Sophia from Nexus. I was calling regarding your portfolio inquiry. I just sent a WhatsApp summary to this number!&rdquo;</em>
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-500 font-bold whitespace-nowrap">
                AMD Beep Accuracy: 99.2%
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500">Auto-Recycle Unanswered Leads After:</span>
              <div className="flex items-center gap-2">
                {[24, 48, 72].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setRecycleHours(hrs)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      recycleHours === hrs
                        ? "bg-brand-500 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {hrs} Hours
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Campaign Creation Modal ── */}
      {isCreateModalOpen && (
        <CampaignCreationModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={(newId) => {
            loadCampaigns(newId);
          }}
        />
      )}

      {/* ── Unified Call Intelligence Workspace Modal ── */}
      {selectedCallId && (
        <UnifiedCallWorkspaceModal
          callId={selectedCallId}
          onClose={() => setSelectedCallId(null)}
          onAnalysisUpdated={() => {
            loadLeads();
            loadMetrics();
          }}
        />
      )}

      {/* ── A/B Testing Lab Modal ── */}
      {canUpdate && isAbModalOpen && (
        <AbExperimentLabModal
          isOpen={isAbModalOpen}
          onClose={() => setIsAbModalOpen(false)}
          campaignName={activeCampaign?.name}
        />
      )}
    </div>
  );
}
