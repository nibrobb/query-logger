(() => {
  const resultsElement = document.getElementById("results");
  const formElement = document.getElementById("header-search");
  const inputElement = document.getElementById("query-input");
  const DEBOUNCE_MS = 200;
  let debounceTimer;
  let requestSequence = 0;

  const renderResults = (results) => {
    if (!resultsElement) {
      return;
    }

    resultsElement.innerHTML = results
      .map(
        (item) =>
          `<li data-result-id="${item.id}"><a href="#result-${item.id}">${item.name}</a></li>`,
      )
      .join("");
  };

  const logger = QueryLogger.createQueryLogger({
    siteId: "demo-site",
    endpoint: "/api/query-logs",
    flushIntervalMs: 1500,
    metadata: {
      environment: "demo",
    },
    onError: (error) => {
      console.error("Query logger error", error);
    },
  });

  QueryLogger.attachHeaderSearch(logger, {
    formSelector: "#header-search",
    inputSelector: "#query-input",
    resultsContainerSelector: "#results",
    resultItemSelector: "[data-result-id]",
    performSearch: async (query) => {
      const currentRequest = ++requestSequence;
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      // Prevent older responses from replacing fresher results during rapid typing.
      if (currentRequest === requestSequence) {
        renderResults(data.results ?? []);
      }
      return data.resultIds;
    },
  });

  const triggerIncrementalSearch = () => {
    if (!formElement || !inputElement) {
      return;
    }

    const query = inputElement.value.trim();
    if (!query) {
      renderResults([]);
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      formElement.requestSubmit();
    }, DEBOUNCE_MS);
  };

  inputElement?.addEventListener("input", triggerIncrementalSearch);
})();
