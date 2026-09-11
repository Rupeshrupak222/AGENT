"use client";

import { useState, useEffect, useCallback } from "react";
import {
  HeartPulse,
  Server,
  Database,
  Phone,
  Bot,
  Layers,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { healthApi, telephonyApi, TelephonySystemStatus } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface ServiceCheck {
  id: string;
  name: string;
  icon: any;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastCheck: string;
  detail?: string;
}

function StatusDot({ status }: { status: ServiceCheck["status"] }) {
  return (
    <span
      className={cn(
        "relative flex h-3 w-3",
      )}
    >
      <span
        className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-40",
          status === "healthy" && "bg-emerald-400",
          status === "degraded" && "bg-amber-400",
          status === "down" && "bg-red-400",
          status === "unknown" && "bg-slate-400"
        )}
      />
      <span
        className={cn(
          "relative inline-flex rounded-full h-3 w-3",
          status === "healthy" && "bg-emerald-500",
          status === "degraded" && "bg-amber-500",
          status === "down" && "bg-red-500",
          status === "unknown" && "bg-slate-400"
        )}
      />
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceCheck }) {
  const Icon = service.icon;
  const statusLabel =
    service.status === "healthy"
      ? "Healthy"
      : service.status === "degraded"
      ? "Degraded"
      : service.status === "down"
      ? "Down"
      : "Unknown";

  return (
    <div className="p-5 rounded-xl border bg-white dark:bg-[#120a06]/80 border-slate-200 dark:border-white/[0.07] shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05]">
          <Icon className="w-4.5 h-4.5 text-slate-600 dark:text-white/50" />
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={service.status} />
          <span
            className={cn(
              "text-xs font-bold",
              service.status === "healthy" &&
                "text-emerald-600 dark:text-emerald-400",
              service.status === "degraded" &&
                "text-amber-600 dark:text-amber-400",
              service.status === "down" && "text-red-600 dark:text-red-400",
              service.status === "unknown" && "text-slate-500 dark:text-white/40"
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
        {service.name}
      </h3>
      {service.detail && (
        <p className="text-xs text-slate-500 dark:text-white/35 mb-2 line-clamp-2">
          {service.detail}
        </p>
      )}
      <p className="text-[11px] text-slate-400 dark:text-white/25">
        Last checked: {service.lastCheck}
      </p>
    </div>
  );
}

export default function HealthPage() {
  const [services, setServices] = useState<ServiceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    const now = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const results: ServiceCheck[] = [];
    const fmtStatus = (s: string) =>
      s === "ok" || s === "healthy" ? "healthy" : s === "degraded" ? "degraded" : s === "unhealthy" ? "down" : s === "not_configured" ? "unknown" : "down";

    // Overall API + shared dependency health via /health/ready (public route)
    let readiness: Awaited<ReturnType<typeof healthApi.check>> | null = null;
    try {
      readiness = await healthApi.check();
      results.push({
        id: "api",
        name: "API Server",
        icon: Server,
        status: fmtStatus(readiness.status),
        lastCheck: now,
        detail: `Status: ${readiness.status} · Uptime: ${Math.round(readiness.uptime / 60)}m`,
      });
    } catch {
      results.push({
        id: "api",
        name: "API Server",
        icon: Server,
        status: "down",
        lastCheck: now,
        detail: "Unable to reach API server",
      });
    }

    const checkStatus = (key: string) => {
      const c = readiness?.checks?.[key];
      if (!c) return "unknown";
      return c.status === "ok" ? "healthy" : c.status === "not_configured" ? "unknown" : "degraded";
    };

    results.push({
      id: "database",
      name: "Database",
      icon: Database,
      status: readiness ? checkStatus("database") : "down",
      lastCheck: now,
      detail: readiness
        ? `Status: ${readiness.checks?.database?.status ?? "unknown"}${readiness.checks?.database?.latencyMs != null ? ` · ${readiness.checks.database.latencyMs}ms` : ""}`
        : "Database check failed",
    });

    results.push({
      id: "redis",
      name: "Redis",
      icon: HardDrive,
      status: readiness ? checkStatus("redis") : "down",
      lastCheck: now,
      detail: readiness
        ? `Status: ${readiness.checks?.redis?.status ?? "unknown"}${readiness.checks?.redis?.latencyMs != null ? ` · ${readiness.checks.redis.latencyMs}ms` : ""}`
        : "Redis check failed",
    });

    // Telephony status
    let telephonyData: TelephonySystemStatus | null = null;
    try {
      telephonyData = await telephonyApi.status();
      const providerHealthy = telephonyData.providers.some(
        (p) => p.configured
      );
      results.push({
        id: "telephony",
        name: "Telephony Provider",
        icon: Phone,
        status: telephonyData.status === "ok"
          ? "healthy"
          : providerHealthy
          ? "degraded"
          : "down",
        lastCheck: now,
        detail: `Providers: ${telephonyData.providers.map((p) => `${p.name} (${p.configured ? "configured" : "not configured"})`).join(", ")}`,
      });
    } catch {
      results.push({
        id: "telephony",
        name: "Telephony Provider",
        icon: Phone,
        status: "unknown",
        lastCheck: now,
        detail: "Unable to fetch telephony status",
      });
    }

    // AI Provider from telephony data
    if (telephonyData) {
      const sttStatus = telephonyData.speechPipelineDetail?.stt || "unknown";
      const ttsStatus = telephonyData.speechPipelineDetail?.tts || "unknown";
      const brainStatus = telephonyData.speechPipelineDetail?.brain || "unknown";
      const allOk =
        sttStatus === "ok" && ttsStatus === "ok" && brainStatus === "ok";
      results.push({
        id: "ai",
        name: "AI Provider",
        icon: Bot,
        status: allOk ? "healthy" : "degraded",
        lastCheck: now,
        detail: `STT: ${sttStatus} | TTS: ${ttsStatus} | Brain: ${brainStatus}`,
      });
    } else {
      results.push({
        id: "ai",
        name: "AI Provider",
        icon: Bot,
        status: "unknown",
        lastCheck: now,
        detail: "Dependent on telephony status",
      });
    }

    // Background Jobs from telephony data
    if (telephonyData) {
      results.push({
        id: "jobs",
        name: "Background Jobs",
        icon: Layers,
        status:
          telephonyData.redisQueues === "ok" || telephonyData.redisQueues === "connected"
            ? "healthy"
            : "degraded",
        lastCheck: now,
        detail: `Redis queues: ${telephonyData.redisQueues}`,
      });
    } else {
      results.push({
        id: "jobs",
        name: "Background Jobs",
        icon: Layers,
        status: "unknown",
        lastCheck: now,
        detail: "Unable to determine status",
      });
    }

    // Redis is reported by the shared /health/ready check above

    setServices(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  if (loading && services.length === 0) {
    return (
      <AdminLayout>
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-36 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] animate-pulse"
              />
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const totalCount = services.length;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              System Health
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/40 mt-0.5">
              Monitor platform services and infrastructure status
            </p>
          </div>
          <div className="flex items-center gap-3">
            {services.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07]">
                <StatusDot
                  status={
                    healthyCount === totalCount
                      ? "healthy"
                      : healthyCount > totalCount / 2
                      ? "degraded"
                      : "down"
                  }
                />
                <span className="text-xs font-semibold text-slate-600 dark:text-white/60">
                  {healthyCount}/{totalCount} services healthy
                </span>
              </div>
            )}
            <button
              onClick={runChecks}
              disabled={loading}
              className="p-2 rounded-xl bg-white dark:bg-[#120a06]/80 border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              <RefreshCw
                className={cn("w-4 h-4", loading && "animate-spin")}
              />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-8 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {error}
            </p>
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.07] bg-white dark:bg-[#120a06]/80 p-12 text-center">
            <HeartPulse className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-white/20" />
            <p className="text-sm text-slate-400 dark:text-white/30">
              No health data available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
