import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import {
  getHangNxHistory,
  getNXTByPeriod,
  getNXTProductWarehouseBreakdown,
  getTonKhoDisplayRows,
} from '../services/kho-ton-kho-service';
import type { NXTFilters } from '../core/types';

export function isNXTDateRangeValid(filters: NXTFilters): boolean {
  const { dateFrom, dateTo } = filters;
  if (!dateFrom || !dateTo) return false;
  return dateFrom <= dateTo;
}

export function useTonKhoDisplay(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.khoTonKho.display,
    queryFn: getTonKhoDisplayRows,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useNXTByPeriod(filters: NXTFilters, enabled: boolean) {
  const rangeOk = isNXTDateRangeValid(filters);
  return useQuery({
    queryKey: queryKeys.khoTonKho.nxt(filters),
    queryFn: () => getNXTByPeriod(filters),
    enabled: enabled && rangeOk,
    ...transactionalCrudListQueryOptions,
  });
}

export function useNXTProductWarehouse(
  filters: NXTFilters,
  hangHoaId: string | null,
  enabled: boolean
) {
  const rangeOk = isNXTDateRangeValid(filters);
  const q = Boolean(hangHoaId?.trim() && enabled && rangeOk);
  return useQuery({
    queryKey: queryKeys.khoTonKho.nxtProductWh(filters, hangHoaId ?? ''),
    queryFn: () => getNXTProductWarehouseBreakdown(filters, hangHoaId!),
    enabled: q,
    ...transactionalCrudListQueryOptions,
  });
}

export function useHangNxHistory(hangHoaId: string, options?: { enabled?: boolean }) {
  const id = hangHoaId.trim();
  const enabled = Boolean(id) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.khoTonKho.hangNxHistory(id || '__'),
    queryFn: () => getHangNxHistory(id),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}
