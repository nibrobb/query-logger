import assert from "node:assert/strict";
import { QueryLogger } from "../dist/esm/queryLogger.js";

const batches = [];

const logger = new QueryLogger({
  siteId: "smoke-test",
  endpoint: "http://unused",
  flushIntervalMs: 10000,
  maxBatchSize: 2,
  transport: {
    sendBatch: async (batch) => {
      batches.push(batch);
    },
  },
});

logger.trackSearch({
  query: "alpha",
  resultIds: ["a1", "a2", "a3"],
});

logger.trackResultClick({
  resultId: "a2",
});

await logger.flush();
logger.stop();

assert.equal(batches.length >= 1, true, "Expected at least one batch");
const allEvents = batches.flatMap((batch) => batch.events);
assert.equal(allEvents.length, 2, "Expected two events");
assert.equal(allEvents[0].query, "alpha");
assert.deepEqual(allEvents[0].resultIds, ["a1", "a2", "a3"]);
assert.equal(allEvents[1].clickedResultId, "a2");

console.log("Smoke test passed.");
