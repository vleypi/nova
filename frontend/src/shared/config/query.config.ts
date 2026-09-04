import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 5 * 60 * 1000;
const QUERY_RETRY_COUNT = 1;
const MUTATION_RETRY_COUNT = 0;

// Фабрика QueryClient с дефолтами проекта: 5-мин stale, без window-focus refetch.
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        retry: QUERY_RETRY_COUNT,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: MUTATION_RETRY_COUNT,
      },
    },
  });
}
