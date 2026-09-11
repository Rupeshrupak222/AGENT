import { Injectable, Logger } from '@nestjs/common';

export interface MetricEntry {
  count: number;
  lastOccurrence: number;
  lastValue?: number;
}

export interface IMetricsExporter {
  readonly name: string;
  export(snapshot: Record<string, any>): Promise<void> | void;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly counters = new Map<string, MetricEntry>();
  private readonly histograms = new Map<string, number[]>();
  private readonly exporters: IMetricsExporter[] = [];
  private readonly MAX_HISTOGRAM_SIZE = 1000;
  private readonly MAX_METRIC_NAMES = 500;

  registerExporter(exporter: IMetricsExporter): void {
    this.exporters.push(exporter);
  }

  async flush(): Promise<void> {
    const snapshot = this.getAllMetrics();
    for (const exporter of this.exporters) {
      try {
        await exporter.export(snapshot);
      } catch (err: any) {
        this.logger.warn(`MetricsExporter [${exporter.name}] failed: ${err.message}`);
      }
    }
  }

  increment(name: string, value = 1): void {
    const existing = this.counters.get(name);
    if (existing) {
      existing.count += value;
      existing.lastOccurrence = Date.now();
    } else {
      if (this.counters.size >= this.MAX_METRIC_NAMES) {
        this.logger.warn(`Metrics counter cap (${this.MAX_METRIC_NAMES}) reached. Dropping metric: ${name}`);
        return;
      }
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
      if (this.histograms.size >= this.MAX_METRIC_NAMES) {
        return;
      }
      this.histograms.set(name, [latencyMs]);
    }
  }

  gauge(name: string, value: number): void {
    const existing = this.counters.get(name);
    if (existing) {
      existing.lastValue = value;
      existing.lastOccurrence = Date.now();
    } else {
      if (this.counters.size >= this.MAX_METRIC_NAMES) {
        return;
      }
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
    const p95Index = Math.floor((count - 1) * 0.95);

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

  toPrometheusFormat(): string {
    const lines: string[] = [
      '# HELP agentcall_info AgentCall AI platform telemetry and metrics',
      '# TYPE agentcall_info gauge',
      'agentcall_info{version="1.0.0"} 1',
    ];

    for (const [key, entry] of this.counters.entries()) {
      const safeName = 'agentcall_' + key.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`# TYPE ${safeName} counter`);
      lines.push(`${safeName} ${entry.count}`);
      if (entry.lastValue !== undefined) {
        lines.push(`# TYPE ${safeName}_gauge gauge`);
        lines.push(`${safeName}_gauge ${entry.lastValue}`);
      }
    }

    for (const [key, samples] of this.histograms.entries()) {
      if (samples.length === 0) continue;
      const stats = this.getHistogramStats(key);
      if (stats) {
        const safeName = 'agentcall_' + key.replace(/[^a-zA-Z0-9_]/g, '_');
        const metricName = safeName.endsWith('_duration') ? safeName : `${safeName}_duration`;
        lines.push(`# TYPE ${metricName} summary`);
        lines.push(`${metricName}{quantile="0.0"} ${stats.min}`);
        lines.push(`${metricName}{quantile="0.5"} ${stats.avg}`);
        lines.push(`${metricName}{quantile="0.95"} ${stats.p95}`);
        lines.push(`${metricName}{quantile="1.0"} ${stats.max}`);
        lines.push(`${metricName}_count ${stats.count}`);
      }
    }

    return lines.join('\n') + '\n';
  }

  reset(): void {
    this.counters.clear();
    this.histograms.clear();
  }
}

export class PrometheusMetricsExporter implements IMetricsExporter {
  readonly name = 'prometheus';
  private latestText = '';

  constructor(private readonly metrics: MetricsService) {}

  export(): void {
    this.latestText = this.metrics.toPrometheusFormat();
  }

  getText(): string {
    return this.latestText || this.metrics.toPrometheusFormat();
  }
}
