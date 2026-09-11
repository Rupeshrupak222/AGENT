import type { DashboardGranularity } from "@/lib/api";

export type PeriodPreset = "today" | "yesterday" | "last7" | "last30" | "last90" | "ytd" | "custom";

export interface DashboardRange {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function computeRange(preset: PeriodPreset, customFrom?: string, customTo?: string): DashboardRange {
  const now = new Date();
  let from: Date;
  let to: Date;

  switch (preset) {
    case "today":
      from = startOfDay(now);
      to = endOfDay(now);
      break;
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = startOfDay(y);
      to = endOfDay(y);
      break;
    }
    case "last7":
      to = endOfDay(now);
      from = startOfDay(new Date(to.getTime() - 6 * 86400000));
      break;
    case "last30":
      to = endOfDay(now);
      from = startOfDay(new Date(to.getTime() - 29 * 86400000));
      break;
    case "last90":
      to = endOfDay(now);
      from = startOfDay(new Date(to.getTime() - 89 * 86400000));
      break;
    case "ytd":
      from = startOfDay(new Date(now.getFullYear(), 0, 1));
      to = endOfDay(now);
      break;
    case "custom":
    default: {
      let cf = customFrom ? new Date(customFrom) : new Date(now.getTime() - 29 * 86400000);
      let ct = customTo ? new Date(customTo) : now;
      if (isNaN(cf.getTime())) cf = new Date(now.getTime() - 29 * 86400000);
      if (isNaN(ct.getTime())) ct = now;
      if (cf.getTime() > ct.getTime()) {
        const tmp = cf;
        cf = ct;
        ct = tmp;
      }
      from = startOfDay(cf);
      to = endOfDay(ct);
      break;
    }
  }

  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    prevFrom: prevFrom.toISOString(),
    prevTo: prevTo.toISOString(),
  };
}

export function granularityForRange(range: DashboardRange): DashboardGranularity {
  const spanMs = new Date(range.to).getTime() - new Date(range.from).getTime();
  if (spanMs <= 2 * 86400000) return "hour";
  if (spanMs <= 50 * 86400000) return "day";
  if (spanMs <= 220 * 86400000) return "week";
  return "month";
}