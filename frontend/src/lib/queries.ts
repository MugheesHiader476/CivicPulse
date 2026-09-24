import { QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getComplaint,
  getProviders,
  getStats,
  type CacheStatus,
  type Complaint,
  type ComplaintPage,
  type ListComplaintsQuery,
  type StatsResult,
} from "../api/client";
import { ApiError } from "../api/http";

export const queryKeys = {
  complaints: ["complaints"] as const,
  complaintList: (query: ListComplaintsQuery) => ["complaints", "list", query] as const,
  complaint: (id: string) => ["complaints", "detail", id] as const,
  stats: ["stats"] as const,
  providers: ["meta", "providers"] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry transient failures once; never retry a 4xx - the request was wrong and stays wrong.
        retry: (failureCount, error) => failureCount < 1 && error instanceof ApiError && error.isTransient,
        refetchOnWindowFocus: false,
        staleTime: 5_000,
      },
      mutations: { retry: false },
    },
  });
}

export function useComplaint(id: string) {
  return useQuery({
    queryKey: queryKeys.complaint(id),
    queryFn: ({ signal }) => getComplaint(id, signal),
  });
}

export function useProviders(refetchInterval: number | false = 30_000) {
  return useQuery({
    queryKey: queryKeys.providers,
    queryFn: ({ signal }) => getProviders(signal),
    refetchInterval,
  });
}

export interface CacheSample {
  cache: CacheStatus;
  elapsedMs: number;
  at: number;
}

export interface StatsWithHistory extends StatsResult {
  /** Cache outcome of this session's recent /api/stats calls, oldest first. */
  history: CacheSample[];
}

const HISTORY_LENGTH = 12;

/** Keeps a rolling history of X-Cache outcomes inside the query cache itself. */
export function useStats() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.stats,
    staleTime: 0,
    queryFn: async ({ signal }): Promise<StatsWithHistory> => {
      const result = await getStats(signal);
      const previous = queryClient.getQueryData<StatsWithHistory>(queryKeys.stats)?.history ?? [];
      const sample: CacheSample = { cache: result.cache, elapsedMs: result.elapsedMs, at: result.fetchedAt };
      return { ...result, history: [...previous, sample].slice(-HISTORY_LENGTH) };
    },
  });
}

/** After a status change: patch every cached copy, then let the server have the final word. */
export function applyComplaintUpdate(queryClient: QueryClient, updated: Complaint): void {
  queryClient.setQueryData(queryKeys.complaint(updated.id), updated);
  queryClient.setQueriesData<ComplaintPage>({ queryKey: ["complaints", "list"] }, (page) =>
    page ? { ...page, items: page.items.map((item) => (item.id === updated.id ? updated : item)) } : page,
  );
  void queryClient.invalidateQueries({ queryKey: queryKeys.complaints });
  void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  void queryClient.invalidateQueries({ queryKey: queryKeys.providers });
}
