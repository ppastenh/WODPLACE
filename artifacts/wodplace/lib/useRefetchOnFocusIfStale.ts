import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import type { UseQueryResult } from '@tanstack/react-query';

/**
 * Re-checks a react-query result every time the screen gains focus, but
 * only actually refetches if the data is past the query's `staleTime` —
 * `isStale` is exactly that check, react-query already tracks it. Without
 * this, a query only refetches on mount, and most of these screens stay
 * mounted across tab navigation, so returning to one could otherwise show
 * arbitrarily old data for the rest of the session. Calling `.refetch()`
 * unconditionally on every focus would work too, but defeats the caching
 * benefit `staleTime` (see the QueryClient's `defaultOptions`) is there for
 * — quickly bouncing between screens shouldn't refire the same request.
 */
export function useRefetchOnFocusIfStale(query: Pick<UseQueryResult, 'isStale' | 'refetch'>) {
  useFocusEffect(
    // Re-memoized whenever isStale/refetch change, so useFocusEffect
    // re-subscribes with a callback that reads the CURRENT staleness at
    // the moment a focus event happens — an empty dep array here would
    // freeze on the first render's isStale forever.
    useCallback(() => {
      if (query.isStale) query.refetch();
    }, [query.isStale, query.refetch]),
  );
}
