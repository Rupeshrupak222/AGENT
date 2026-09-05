"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import {
  analyticsApi,
  callsApi,
  agentsApi,
  tenantsApi,
  tenantApi,
  normalizeApiError,
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

import { SuperAdminView } from "./components/SuperAdminView";
import { CompanyAdminView } from "./components/CompanyAdminView";
import { ManagerView } from "./components/ManagerView";
import { AgentView } from "./components/AgentView";
import { ViewerView } from "./components/ViewerView";

export default function OverviewPage() {
  const [period, setPeriod] = useState<"today" | "week" | "month">("week");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Backend Data States
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallItem[]>([]);
  const [agentPerfList, setAgentPerfList] = useState<AgentPerformanceItem[]>([]);
  const [allAgents, setAllAgents] = useState<AgentItem[]>([]);
  const [callTrends, setCallTrends] = useState<CallTrendItem[]>([]);
  const [funnelData, setFunnelData] = useState<ConversionFunnelItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [tenantUsage, setTenantUsage] = useState<TenantUsage | null>(null);

  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  // Robust normalized role detection
  const rawRole = (user?.role || "").toLowerCase().trim();
  const isSuperAdmin = rawRole === "super_admin" || rawRole === "superadmin" || rawRole === "owner";
  const isManager = rawRole === "manager" || rawRole === "supervisor";
  const isAgent = rawRole === "agent" || rawRole === "telecaller" || rawRole === "caller" || rawRole === "sales";
  const isViewer = rawRole === "viewer" || rawRole === "auditor" || rawRole === "observer";
  const isCompanyAdmin = rawRole === "company_admin" || rawRole === "admin" || (!isSuperAdmin && !isManager && !isAgent && !isViewer);

  const fetchDashboardData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      const daysForPeriod = period === "today" ? 1 : period === "week" ? 7 : 30;

      const [
        metricsRes,
        callMetricsRes,
        callsRes,
        agentPerfRes,
        agentsRes,
        trendsRes,
        funnelRes,
      ] = await Promise.allSettled([
        analyticsApi.overview(period),
        callsApi.metrics(period),
        callsApi.list({ limit: 5 }),
        analyticsApi.agentPerformance(),
        agentsApi.list(),
        analyticsApi.callTrend(daysForPeriod),
        analyticsApi.conversionFunnel(),
      ]);

      let primaryError: string | null = null;

      if (metricsRes.status === "fulfilled") {
        setMetrics(metricsRes.value);
      } else {
        primaryError = normalizeApiError(metricsRes.reason);
      }

      if (callMetricsRes.status === "fulfilled") {
        setCallMetrics(callMetricsRes.value);
      }

      if (callsRes.status === "fulfilled") {
        setRecentCalls(callsRes.value.items || []);
      }

      if (agentPerfRes.status === "fulfilled") {
        setAgentPerfList(agentPerfRes.value || []);
      }

      if (agentsRes.status === "fulfilled") {
        setAllAgents(agentsRes.value || []);
      }

      if (trendsRes.status === "fulfilled") {
        setCallTrends(trendsRes.value || []);
      }

      if (funnelRes.status === "fulfilled") {
        setFunnelData(funnelRes.value || []);
      }

      // Fetch tenants if Super Admin
      if (isSuperAdmin) {
        try {
          const tenantsList = await tenantsApi.list();
          if (Array.isArray(tenantsList) && tenantsList.length > 0) {
            setTenants(tenantsList);
          }
        } catch {
          // Fallback gracefully
        }
      }

      // Fetch workspace usage for company admins (real quota counters)
      if (isCompanyAdmin) {
        try {
          const usage = await tenantApi.usage();
          if (usage) setTenantUsage(usage);
        } catch {
          setTenantUsage(null);
        }
      }

      if (
        metricsRes.status === "rejected" &&
        callMetricsRes.status === "rejected" &&
        callsRes.status === "rejected"
      ) {
        setErrorMessage(
          primaryError || "Unable to connect to backend server at this time."
        );
      }

      setIsLoading(false);
      setIsRefreshing(false);
    },
    [period, isSuperAdmin, isCompanyAdmin]
  );

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const totalCallsCount = metrics?.totalCalls ?? callMetrics?.total ?? 0;
  const qualifiedLeadsCount = metrics?.qualified ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-white">Connection Warning</p>
              <p className="text-xs text-rose-200/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── ROLE-SPECIFIC DASHBOARD RENDER ──────────────────── */}
      {isSuperAdmin ? (
        <SuperAdminView
          tenants={tenants}
          totalCalls={totalCallsCount}
          isLoading={isLoading}
          onRefresh={() => fetchDashboardData(true)}
          isRefreshing={isRefreshing}
        />
      ) : isAgent ? (
        <AgentView
          agentName={user?.name || "Agent"}
          totalCallsCount={totalCallsCount}
          qualifiedLeadsCount={qualifiedLeadsCount}
          isLoading={isLoading}
          onRefresh={() => fetchDashboardData(true)}
          isRefreshing={isRefreshing}
        />
      ) : isManager ? (
        <ManagerView
          metrics={metrics}
          callMetrics={callMetrics}
          recentCalls={recentCalls}
          allAgents={allAgents}
          isLoading={isLoading}
          onRefresh={() => fetchDashboardData(true)}
          isRefreshing={isRefreshing}
        />
      ) : isViewer ? (
        <ViewerView
          metrics={metrics}
          callMetrics={callMetrics}
          recentCalls={recentCalls}
          allAgents={allAgents}
          callTrends={callTrends}
          funnelData={funnelData}
          isLoading={isLoading}
          onRefresh={() => fetchDashboardData(true)}
          isRefreshing={isRefreshing}
        />
      ) : (
        <CompanyAdminView
          metrics={metrics}
          callMetrics={callMetrics}
          recentCalls={recentCalls}
          allAgents={allAgents}
          agentPerfList={agentPerfList}
          callTrends={callTrends}
          funnelData={funnelData}
          period={period}
          setPeriod={setPeriod}
          isLoading={isLoading}
          onRefresh={() => fetchDashboardData(true)}
          isRefreshing={isRefreshing}
          companyName={tenant?.name || "Acme Corp"}
          companyPlan={tenant?.plan || null}
          companyUsage={tenantUsage}
        />
      )}
    </div>
  );
}
