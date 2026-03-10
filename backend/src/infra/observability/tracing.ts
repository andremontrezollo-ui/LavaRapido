export interface TraceContext {
  traceId: string;
  spanId: string;
  startedAt: Date;
}

export function startTrace(): TraceContext {
  return {
    traceId: crypto.randomUUID(),
    spanId: crypto.randomUUID(),
    startedAt: new Date(),
  };
}

export async function withTrace<T>(
  fn: (trace: TraceContext) => Promise<T>,
): Promise<T> {
  const trace = startTrace();
  return fn(trace);
}
