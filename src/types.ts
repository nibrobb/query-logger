export type QueryLoggerEventType = "search_results" | "result_click";

export interface QueryLoggerEvent {
  eventType: QueryLoggerEventType;
  sessionId: string;
  siteId: string;
  query: string;
  resultIds: string[];
  clickedResultId: string | null;
  actionSource: string;
  pageUrl: string;
  userAgent: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface QueryLoggerBatch {
  sentAt: string;
  events: QueryLoggerEvent[];
}

export interface QueryLoggerTransport {
  sendBatch: (batch: QueryLoggerBatch) => Promise<void>;
}

export interface QueryLoggerConfig {
  siteId: string;
  endpoint: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  sessionStorageKey?: string;
  metadata?: Record<string, unknown>;
  transport?: QueryLoggerTransport;
  onError?: (error: unknown) => void;
}

export interface TrackSearchPayload {
  query: string;
  resultIds: string[];
  actionSource?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackResultClickPayload {
  resultId: string;
  query?: string;
  resultIds?: string[];
  actionSource?: string;
  metadata?: Record<string, unknown>;
}
