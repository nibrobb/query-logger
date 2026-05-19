import { QueryLoggerBatch, QueryLoggerTransport } from './types.js';

export const createFetchTransport = (endpoint: string): QueryLoggerTransport => ({
  async sendBatch(batch: QueryLoggerBatch): Promise<void> {
	const response = await fetch(endpoint, {
	  method: 'POST',
	  headers: {
		'content-type': 'application/json',
	  },
	  body: JSON.stringify(batch),
	});

	if (!response.ok) {
	  throw new Error(`Query logger transport failed with status ${response.status}`);
	}
  },
});


