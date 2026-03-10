export interface MetricCounters {
  requests_total: number;
  events_published_total: number;
  events_failed_total: number;
  jobs_processed_total: number;
  jobs_failed_total: number;
  [key: string]: number;
}

export class MetricsCollector {
  private counters: MetricCounters = {
    requests_total: 0,
    events_published_total: 0,
    events_failed_total: 0,
    jobs_processed_total: 0,
    jobs_failed_total: 0,
  };

  increment(metric: keyof MetricCounters, value: number = 1): void {
    if (!(metric in this.counters)) this.counters[metric] = 0;
    this.counters[metric] += value;
  }

  getCounters(): Readonly<MetricCounters> {
    return { ...this.counters };
  }

  toPrometheusFormat(): string {
    return Object.entries(this.counters)
      .map(([name, value]) => `# TYPE ${name} counter\n${name} ${value}`)
      .join('\n');
  }

  reset(): void {
    for (const key of Object.keys(this.counters)) {
      this.counters[key] = 0;
    }
  }
}
