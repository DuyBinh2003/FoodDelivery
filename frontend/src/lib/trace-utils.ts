export interface TraceableErrorBody {
  traceId?: string;
}

export function extractTraceId(
  headers?: { get?: (name: string) => string | null } | Record<string, string | undefined> | null,
  errorBody?: TraceableErrorBody | null,
): string | undefined {
  if (headers && typeof headers.get === 'function') {
    const val = headers.get('x-trace-id') || headers.get('traceparent');
    if (val && val.trim() !== '') return val.trim();
  } else if (headers && typeof headers === 'object') {
    const map = headers as Record<string, string | undefined>;
    const val = map['x-trace-id'] || map['traceparent'];
    if (val && val.trim() !== '') return val.trim();
  }
  const bodyTraceId = errorBody?.traceId;
  if (typeof bodyTraceId === 'string' && bodyTraceId.trim() !== '') {
    return bodyTraceId.trim();
  }
  return undefined;
}
