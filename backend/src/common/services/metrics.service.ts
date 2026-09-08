import { Injectable, Logger } from '@nestjs/common';

export interface MetricEntry {
  count: number;
  lastOccurrence: number;
  lastValue?: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly counters = new Map<string, MetricEntry>();
  private readonly histograms = new Map<string, number[]>();
  private readonly MAX_HISTOGRAM_SIZE = 1000;

  increment(name: string, value = 1): void {
    const existing = this.counters.get(name);
    if (existing) {
      existing.count += value;
      existing.lastOccurrence = Date.now();
    } else {
      this.counters.set(name, { count: value, lastOccurrence: Date.now() });
    }
  }

  recordLatency(name: string, latencyMs: number): void {
    this.increment(`${name}.latency`);
    const hist = this.histograms.get(name);
    if (hist) {
      hist.push(latencyMs);
      if (hist.length > this.MAX_HISTOGRAM_SIZE) {
        hist.splice(0, hist.length - this.MAX_HISTOGRAM_SIZE);
      }
    } else {
      this.histograms.set(name, [latencyMs]);
    }
  }

  gauge(name: string, value: number): void {
    const existing = this.counters.get(name);
    if (existing) {
      existing.lastValue = value;
      existing.lastOccurrence = Date.now();
    } else {
      this.counters.set(name, { count: 0, lastOccurrence: Date.now(), lastValue: value });
    }
  }

  getCounter(name: string): MetricEntry | undefined {
    return this.counters.get(name);
  }

  getCounterValue(name: string): number {
    return this.counters.get(name)?.count || 0;
  }

  getHistogramStats(name: string): { min: number; max: number; avg: number; p95: number; count: number } | undefined {
    const hist = this.histograms.get(name);
    if (!hist || hist.length === 0) return undefined;

    const sorted = [...hist].sort((a, b) => a - b);
    const count = sorted.length;
    const p95Index = Math.floor(count * 0.95);

    return {
      min: sorted[0],
      max: sorted[count - 1],
      avg: Math.round(sorted.reduce((a, b) => a + b, 0) / count),
      p95: sorted[p95Index] || sorted[count - 1],
      count,
    };
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [name, entry] of this.counters) {
      result[name] = {
        count: entry.count,
        lastOccurrence: new Date(entry.lastOccurrence).toISOString(),
        ...(entry.lastValue !== undefined && { lastValue: entry.lastValue }),
      };
    }

    for (const [name] of this.histograms) {
      const stats = this.getHistogramStats(name);
      if (stats) {
        result[`${name}_histogram`] = stats;
      }
    }

    return result;
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}
