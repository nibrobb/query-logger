import {
  QueryLoggerBatch,
  QueryLoggerConfig,
  QueryLoggerEvent,
  QueryLoggerTransport,
  TrackResultClickPayload,
  TrackSearchPayload,
} from "./types.js";
import { createFetchTransport } from "./transports.js";

const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_BATCH_SIZE = 10;
const DEFAULT_SESSION_STORAGE_KEY = "query-logger-session-id";

const createSessionId = (): string => {
  const random = Math.random().toString(16).slice(2);
  return `ql-${Date.now()}-${random}`;
};

const getSessionId = (storageKey: string): string => {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return createSessionId();
  }

  const existingSessionId = window.sessionStorage.getItem(storageKey);
  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = createSessionId();
  window.sessionStorage.setItem(storageKey, newSessionId);
  return newSessionId;
};

const normalizeIds = (ids: string[] | undefined): string[] => {
  if (!ids) {
    return [];
  }

  return ids.map((id) => String(id));
};

type NormalizedConfig = Required<
  Pick<QueryLoggerConfig, "flushIntervalMs" | "maxBatchSize" | "sessionStorageKey">
> &
  Omit<QueryLoggerConfig, "flushIntervalMs" | "maxBatchSize" | "sessionStorageKey">;

export class QueryLogger {
  private readonly config: NormalizedConfig;
  private readonly transport: QueryLoggerTransport;
  private readonly sessionId: string;
  private readonly pendingEvents: QueryLoggerEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  private lastSearchContext: {
    query: string;
    resultIds: string[];
  } | null = null;

  constructor(config: QueryLoggerConfig) {
    this.config = {
      ...config,
      flushIntervalMs: config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
      maxBatchSize: config.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE,
      sessionStorageKey: config.sessionStorageKey ?? DEFAULT_SESSION_STORAGE_KEY,
    };

    this.transport = config.transport ?? createFetchTransport(this.config.endpoint);
    this.sessionId = getSessionId(this.config.sessionStorageKey);
    this.startAutoFlush();
  }

  trackSearch(payload: TrackSearchPayload): void {
    const query = payload.query.trim();
    if (!query) {
      return;
    }

    const resultIds = normalizeIds(payload.resultIds);
    this.lastSearchContext = { query, resultIds };

    this.queueEvent({
      eventType: "search_results",
      query,
      resultIds,
      clickedResultId: null,
      actionSource: payload.actionSource ?? "search_submit",
      metadata: payload.metadata,
    });
  }

  trackResultClick(payload: TrackResultClickPayload): void {
    const contextQuery = payload.query ?? this.lastSearchContext?.query;
    if (!contextQuery) {
      return;
    }

    const resultIds = normalizeIds(payload.resultIds ?? this.lastSearchContext?.resultIds);

    this.queueEvent({
      eventType: "result_click",
      query: contextQuery,
      resultIds,
      clickedResultId: String(payload.resultId),
      actionSource: payload.actionSource ?? "result_click",
      metadata: payload.metadata,
    });
  }

  async flush(): Promise<void> {
    if (this.pendingEvents.length === 0) {
      return;
    }

    const batchEvents = this.pendingEvents.splice(0, this.config.maxBatchSize);
    const batch: QueryLoggerBatch = {
      sentAt: new Date().toISOString(),
      events: batchEvents,
    };

    try {
      await this.transport.sendBatch(batch);
    } catch (error) {
      this.pendingEvents.unshift(...batchEvents);
      this.config.onError?.(error);
    }
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.config.flushIntervalMs);
  }

  private queueEvent(
    event: Omit<QueryLoggerEvent, "sessionId" | "siteId" | "pageUrl" | "userAgent" | "timestamp">,
  ): void {
    const fullEvent: QueryLoggerEvent = {
      ...event,
      sessionId: this.sessionId,
      siteId: this.config.siteId,
      pageUrl: typeof window === "undefined" ? "server" : window.location.href,
      userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      timestamp: new Date().toISOString(),
      metadata: {
        ...this.config.metadata,
        ...(event.metadata ?? {}),
      },
    };

    this.pendingEvents.push(fullEvent);
    if (this.pendingEvents.length >= this.config.maxBatchSize) {
      void this.flush();
    }
  }
}

export const createQueryLogger = (config: QueryLoggerConfig): QueryLogger => {
  return new QueryLogger(config);
};
