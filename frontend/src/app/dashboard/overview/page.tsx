"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  analyticsApi,
  callsApi,
  agentsApi,
  tenantsApi,
  tenantApi,
  normalizeApiError,
  companyDashboardApi,
  CompanyDashboardData,
  DashboardMetrics,
  CallMetrics,
  CallTrendItem,
  AgentPerformanceItem,
  ConversionFunnelItem,
  CallItem,
  AgentItem,
  TenantItem,
  TenantUsage,
} from "@/lib/api";
import {
  computeRange,
  granularityForRange,
  PeriodPreset,
  DashboardRange,
} from "@/lib/dashboard-range";

import { realtimeSocket } from "@/lib/socket";

import { SuperAdminView } from "./components/SuperAdminView";
import { CompanyAdminView } from "./components/CompanyAdminView";
import { ManagerView } from "./components/ManagerView";

export default function OverviewPage() {
  const [period, setPeriod] = useState<PeriodPreset>("last7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Backend Data States (shared)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallItem[]>([]);
  const [agentPerfList, setAgentPerfList] = useState<AgentPerformanceItem[]>([]);
  const [allAgents, setAllAgents] = useState<AgentItem[]>([]);
  const [callTrends, setCallTrends] = useState<CallTrendItem[]>([]);
  const [funnelData, setFunnelData] = useState<ConversionFunnelItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [tenantUsage, setTenantUsage] = useState<TenantUsage | null>(null);
  const [companyDashboard, setCompanyDashboard] = useState<CompanyDashboardData | null>(null);

  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const router = useRouter();

  const rawRole = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = rawRole === "super_admin" || rawRole === "superadmin" || rawRole === "owner";
  const isManager = rawRole === "manager" || rawRole === "supervisor";
  const isCompanyAdmin = rawRole === "company_admin" || rawRole === "admin" || (!isSuperAdmin && !isManager);

  useEffect(() => {
    if (isSuperAdmin) {
      router.replace("/dashboard/admin");
    }
  }, [isSuperAdmin, router]);

  const range = useMemo<DashboardRange>(
    () => computeRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  // ── Company Admin fetcher ──────────────────────────────────
  const fetchCompanyAdminData = useCallback(
    async (opts?: { loading?: boolean; manual?: boolean }) => {
      if (opts?.loading) setIsLoading(true);
      if (opts?.manual) setIsRefreshing(true);
      setErrorMessage(null);

      const [dashboardRes, callsRes, usageRes, agentsRes] = await Promise.allSettled([
        companyDashboardApi.get({
          from: range.from,
          to: range.to,
          prevFrom: range.prevFrom,
          prevTo: range.prevTo,
          granularity: granularityForRange(range),
        }),
        callsApi.list({ limit: 6 }),
        tenantApi.usage(),
        agentsApi.list(),
      ]);

      let primaryError: string | null = null;

      if (dashboardRes.status === "fulfilled") {
        setCompanyDashboard(dashboardRes.value);
      } else {
        primaryError = normalizeApiError(dashboardRes.reason);
      }

      if (callsRes.status === "fulfilled") {
        setRecentCalls(callsRes.value.items || []);
      }

      if (usageRes.status === "fulfilled") {
        setTenantUsage(usageRes.value);
      }

      if (agentsRes.status === "fulfilled") {
        setAllAgents(agentsRes.value || []);
      }

      if (dashboardRes.status === "rejected" && callsRes.status === "rejected") {
        setErrorMessage(primaryError || "Unable to connect to backend server at this time.");
      }

      if (opts?.loading) setIsLoading(false);
      if (opts?.manual) setIsRefreshing(false);
    },
    [range]
  );

  // ── Manager fetcher ────────────────────────────────────────
  const fetchManagerData = useCallback(
    async (opts?: { loading?: boolean; manual?: boolean }) => {
      if (opts?.loading) setIsLoading(true);
      if (opts?.manual) setIsRefreshing(true);
      setErrorMessage(null);

      const [dashboardRes, callsRes, funnelRes, agentsRes] = await Promise.allSettled([
        companyDashboardApi.get({
          from: range.from,
          to: range.to,
          prevFrom: range.prevFrom,
          prevTo: range.prevTo,
          granularity: granularityForRange(range),
        }),
        callsApi.list({ limit: 8 }),
        analyticsApi.conversionFunnel(),
        agentsApi.list(),
      ]);

      let primaryError: string | null = null;

      if (dashboardRes.status === "fulfilled") setCompanyDashboard(dashboardRes.value);
      else primaryError = normalizeApiError(dashboardRes.reason);
      if (callsRes.status === "fulfilled") setRecentCalls(callsRes.value.items || []);
      if (funnelRes.status === "fulfilled") setFunnelData(funnelRes.value || []);
      if (agentsRes.status === "fulfilled") setAllAgents(agentsRes.value || []);

      if (dashboardRes.status === "rejected" && callsRes.status === "rejected") {
        setErrorMessage(primaryError || "Unable to connect to backend server at this time.");
      }

      if (opts?.loading) setIsLoading(false);
      if (opts?.manual) setIsRefreshing(false);
    },
    [range]
  );

  // ── Super admin fetcher ────────────────────────────────────
  const fetchSuperAdminData = useCallback(async (opts?: { loading?: boolean; manual?: boolean }) => {
    if (opts?.loading) setIsLoading(true);
    if (opts?.manual) setIsRefreshing(true);
    setErrorMessage(null);

    const [metricsRes, callsRes, agentsRes, tenantsRes] = await Promise.allSettled([
      analyticsApi.overview("week"),
      callsApi.list({ limit: 5 }),
      agentsApi.list(),
      tenantsApi.list(),
    ]);

    if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value);
    if (callsRes.status === "fulfilled") setRecentCalls(callsRes.value.items || []);
    if (agentsRes.status === "fulfilled") setAllAgents(agentsRes.value || []);
    if (tenantsRes.status === "fulfilled") setTenants(tenantsRes.value || []);

    if (opts?.loading) setIsLoading(false);
    if (opts?.manual) setIsRefreshing(false);
  }, []);

  // Latest fetcher accessible to interval / socket handlers without re-binding.
  const fetcherRef = useRef<() => void>(() => {});
  fetcherRef.current = () => {
    if (isSuperAdmin) fetchSuperAdminData({});
    else if (isManager) fetchManagerData({});
    else fetchCompanyAdminData({});
  };

  // Initial load + re-load whenever the selected period changes (user intent only).
  useEffect(() => {
    if (isSuperAdmin) return; // redirected to /dashboard/admin
    if (isManager) fetchManagerData({ loading: true });
    else fetchCompanyAdminData({ loading: true });
  }, [range, fetchCompanyAdminData, fetchManagerData, isSuperAdmin, isManager]);

  // Background live sync (mount once): realtime socket + 8s interval.
  useEffect(() => {
    realtimeSocket.connect();
    const refresh = () => fetcherRef.current();
    const unsub1 = realtimeSocket.on("calls:overview_status", refresh);
    const unsub2 = realtimeSocket.on("call:status", refresh);
    const unsub3 = realtimeSocket.on("campaign:status", refresh);

    const interval = setInterval(refresh, 8000);

    return () => {
      clearInterval(interval);
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, []);

  const totalCallsCount = metrics?.totalCalls ?? callMetrics?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {errorMessage && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">Connection Warning</p>
              <p className="text-xs text-rose-600/80 dark:text-rose-200/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => fetcherRef.current()}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-700 dark:text-rose-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {isSuperAdmin ? (
        <SuperAdminView
          tenants={tenants}
          totalCalls={totalCallsCount}
          isLoading={isLoading}
          onRefresh={() => fetchSuperAdminData({ manual: true })}
          isRefreshing={isRefreshing}
        />
      ) : isManager ? (
        <ManagerView
          dashboard={companyDashboard}
          recentCalls={recentCalls}
          funnelData={funnelData}
          agents={allAgents}
          period={period}
          setPeriod={setPeriod}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          range={range}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onRefresh={() => fetchManagerData({ manual: true })}
          workspaceName={tenant?.name ?? "Your Workspace"}
          workspacePlan={tenant?.plan ?? null}
        />
      ) : (
        <CompanyAdminView
          dashboard={companyDashboard}
          recentCalls={recentCalls}
          tenantUsage={tenantUsage}
          agents={allAgents}
          period={period}
          setPeriod={setPeriod}
          customFrom={customFrom}
          setCustomFrom={setCustomFrom}
          customTo={customTo}
          setCustomTo={setCustomTo}
          range={range}
          isLoading={isLoading}
          onRefresh={() => fetchCompanyAdminData({ manual: true })}
          isRefreshing={isRefreshing}
          companyName={tenant?.name ?? "Your Company"}
          companyPlan={tenant?.plan ?? null}
        />
      )}
    </div>
  );
}