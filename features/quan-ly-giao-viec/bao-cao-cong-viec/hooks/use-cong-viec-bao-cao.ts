import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import {
  getTaskReportFilterOptions,
  getTaskReportKpi,
  getTaskReportLookup,
  getTaskReportPhanBoMucDo,
  getTaskReportPhanBoTrangThai,
  getTaskReportTopNguoiTao,
  getTaskReportTopTrachNhiem,
  getTaskReportTrend,
} from '../services/cong-viec-bao-cao-service';
import type {
  TaskReportLookupSort,
  TaskReportRpcArgs,
  TaskReportTrendBucket,
} from '../core/types';

interface BaseOpts {
  enabled?: boolean;
}

export const useTaskReportKpi = (args: TaskReportRpcArgs, opts: BaseOpts = {}) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.kpi(args),
    queryFn: () => getTaskReportKpi(args),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

export const useTaskReportTrend = (
  args: TaskReportRpcArgs,
  bucket: TaskReportTrendBucket = 'auto',
  opts: BaseOpts = {},
) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.trend(args, bucket),
    queryFn: () => getTaskReportTrend(args, bucket),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

export const useTaskReportPhanBoTrangThai = (args: TaskReportRpcArgs, opts: BaseOpts = {}) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.phanBoTrangThai(args),
    queryFn: () => getTaskReportPhanBoTrangThai(args),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

export const useTaskReportPhanBoMucDo = (args: TaskReportRpcArgs, opts: BaseOpts = {}) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.phanBoMucDo(args),
    queryFn: () => getTaskReportPhanBoMucDo(args),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

export const useTaskReportTopTrachNhiem = (
  args: TaskReportRpcArgs,
  topN = 10,
  opts: BaseOpts = {},
) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.topTrachNhiem(args, topN),
    queryFn: () => getTaskReportTopTrachNhiem(args, topN),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

export const useTaskReportTopNguoiTao = (
  args: TaskReportRpcArgs,
  topN = 10,
  opts: BaseOpts = {},
) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.topNguoiTao(args, topN),
    queryFn: () => getTaskReportTopNguoiTao(args, topN),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

export interface UseTaskReportLookupOptions {
  limit: number;
  offset: number;
  sort: TaskReportLookupSort;
}

export const useTaskReportLookup = (
  args: TaskReportRpcArgs,
  options: UseTaskReportLookupOptions,
  opts: BaseOpts = {},
) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.lookup(args, options),
    queryFn: () => getTaskReportLookup(args, options),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });

export const useTaskReportFilterOptions = (
  range: { p_start: string; p_end: string },
  opts: BaseOpts = {},
) =>
  useQuery({
    queryKey: queryKeys.congViecBaoCao.filterOptions(range),
    queryFn: () => getTaskReportFilterOptions(range),
    enabled: opts.enabled !== false,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });
