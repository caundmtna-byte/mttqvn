import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type UseTabSearchParamOptions = {
  /** Query key; default `tab` */
  paramKey?: string;
  /** Pass to setSearchParams; default true */
  replace?: boolean;
  /** When true (default), remove param if value equals defaultTab */
  omitWhenDefault?: boolean;
};

/**
 * Keeps the active tab in sync with the URL search param (default `?tab=`).
 * Preserves other query keys. Invalid or missing values fall back to `defaultTab`.
 */
export function useTabSearchParam<T extends string>(
  allowed: readonly T[],
  defaultTab: T,
  options?: UseTabSearchParamOptions,
): readonly [T, (tab: string) => void] {
  const paramKey = options?.paramKey ?? 'tab';
  const replace = options?.replace ?? true;
  const omitWhenDefault = options?.omitWhenDefault ?? true;
  const [searchParams, setSearchParams] = useSearchParams();

  const allowedSet = useMemo(() => new Set<string>(allowed as readonly string[]), [allowed]);

  const activeTab = useMemo(() => {
    const raw = searchParams.get(paramKey);
    if (raw != null && allowedSet.has(raw)) return raw as T;
    return defaultTab;
  }, [searchParams, paramKey, allowedSet, defaultTab]);

  const setTab = useCallback(
    (tab: string) => {
      if (!allowedSet.has(tab)) return;
      const next = new URLSearchParams(searchParams);
      if (omitWhenDefault && tab === defaultTab) {
        next.delete(paramKey);
      } else {
        next.set(paramKey, tab);
      }
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams, paramKey, replace, omitWhenDefault, defaultTab, allowedSet],
  );

  return [activeTab, setTab] as const;
}
