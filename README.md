# Query Logger

Elegant, modular query logging for internal site search.

## What it captures

For each user interaction, the logger sends:

1. Search query
2. Result IDs returned by your search
3. Result ID the user clicked

Events are batched and posted to your backend.

## Assumptions

- Your page has a header search form and query input.
- Search results are rendered in a container with clickable rows/items.
- Each result row has a `data-result-id` attribute.
- Your backend accepts JSON POSTs at a configured endpoint.

## Quick start (script include)

Build the browser bundle:

```bash
npm install
npm run build:browser
```

Include it on your site:

```html
<script src="/dist/query-logger.js"></script>
<script>
  const logger = QueryLogger.createQueryLogger({
    siteId: 'my-site',
    endpoint: '/api/query-logs',
  });

  QueryLogger.attachHeaderSearch(logger, {
    formSelector: '#header-search',
    inputSelector: '#query-input',
    resultsContainerSelector: '#results',
    performSearch: async (query) => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      renderResults(data.resultIds);
      return data.resultIds;
    },
  });
</script>
```

## Demo

Run a complete demo site + backend:

```bash
npm install
npm run demo
```

Open `http://localhost:8080`.

The demo includes:
- Header search box
- Mock search API
- Log ingestion API
- Console output of received event batches

## Test

```bash
npm install
npm test
```
