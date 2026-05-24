import { useQuery } from '@tanstack/react-query';
import {
  getTonKhoPTDisplayRows,
  getNXTPTByPeriod,
  getNXTPTProductWarehouseBreakdown,
  getPhieuKhoPTHangNxHistory,
} from '../services/farm-ton-kho-pt';
import type { NXTPTFilters } from '../core/types';

export const FARM_TON_KHO_PT_QUERY_KEY = ['farmTonKhoPT'] as const;

export function useFarmTonKhoPTDisplay() {
  return useQuery({
    queryKey: FARM_TON_KHO_PT_QUERY_KEY,
    queryFn: getTonKhoPTDisplayRows,
    staleTime: 1000 * 60 * 5,
  });
}

export function isNXTDateRangeValid(filters: NXTPTFilters): boolean {
  const { dateFrom, dateTo } = filters;
  if (!dateFrom || !dateTo) return false;
  return dateFrom <= dateTo;
}

export function useFarmNXTPT(filters: NXTPTFilters, enabled: boolean) {
  const rangeOk = isNXTDateRangeValid(filters);
  return useQuery({
    queryKey: [...FARM_TON_KHO_PT_QUERY_KEY, 'nxt', filters] as const,
    queryFn: () => getNXTPTByPeriod(filters),
    enabled: enabled && rangeOk,
    staleTime: 1000 * 60,
  });
}

export function useFarmNXTPTProductWarehouse(filters: NXTPTFilters, idHangHoa: string | null, enabled: boolean) {
  const rangeOk = isNXTDateRangeValid(filters);
  const q = Boolean(idHangHoa?.trim() && enabled && rangeOk);
  return useQuery({
    queryKey: [...FARM_TON_KHO_PT_QUERY_KEY, 'nxtProductWh', filters, idHangHoa] as const,
    queryFn: () => getNXTPTProductWarehouseBreakdown(filters, idHangHoa!),
    enabled: q,
    staleTime: 1000 * 60,
  });
}

export function useFarmPhieuKhoPTHangNxHistory(idHangHoa: string) {
  const enabled = Boolean(idHangHoa?.trim() && !Number.isNaN(Number(idHangHoa)));
  return useQuery({
    queryKey: [...FARM_TON_KHO_PT_QUERY_KEY, 'hangNxHistory', idHangHoa] as const,
    queryFn: () => getPhieuKhoPTHangNxHistory(idHangHoa),
    enabled,
    staleTime: 1000 * 60 * 2,
  });
}
