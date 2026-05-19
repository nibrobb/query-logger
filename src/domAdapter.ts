import { QueryLogger } from './queryLogger.js';

export interface HeaderSearchAdapterConfig {
  formSelector: string;
  inputSelector: string;
  resultsContainerSelector: string;
  resultItemSelector?: string;
  performSearch: (query: string) => Promise<string[]>;
  onResults?: (resultIds: string[], query: string) => void;
}

export interface HeaderSearchAdapterHandle {
  detach: () => void;
}

const getInputValue = (form: HTMLFormElement, selector: string): string => {
  const input = form.querySelector<HTMLInputElement>(selector);
  return input?.value.trim() ?? '';
};

export const attachHeaderSearch = (
  logger: QueryLogger,
  config: HeaderSearchAdapterConfig,
): HeaderSearchAdapterHandle => {
  const form = document.querySelector<HTMLFormElement>(config.formSelector);
  const resultsContainer = document.querySelector<HTMLElement>(config.resultsContainerSelector);

  if (!form) {
    throw new Error(`Header search form not found: ${config.formSelector}`);
  }

  if (!resultsContainer) {
    throw new Error(`Results container not found: ${config.resultsContainerSelector}`);
  }

  const resultItemSelector = config.resultItemSelector ?? '[data-result-id]';

  const onSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();

    const query = getInputValue(form, config.inputSelector);
    if (!query) {
      return;
    }

    const resultIds = await config.performSearch(query);
    logger.trackSearch({
      query,
      resultIds,
      actionSource: 'header_submit',
    });

    config.onResults?.(resultIds, query);
  };

  const onClick = (event: Event): void => {
    const target = event.target as Element | null;
    const resultItem = target?.closest<HTMLElement>(resultItemSelector);
    const resultId = resultItem?.dataset.resultId;
    if (!resultId) {
      return;
    }

    logger.trackResultClick({
      resultId,
      actionSource: 'result_row_click',
    });
  };

  form.addEventListener('submit', onSubmit);
  resultsContainer.addEventListener('click', onClick);

  return {
    detach: () => {
      form.removeEventListener('submit', onSubmit);
      resultsContainer.removeEventListener('click', onClick);
    },
  };
};

