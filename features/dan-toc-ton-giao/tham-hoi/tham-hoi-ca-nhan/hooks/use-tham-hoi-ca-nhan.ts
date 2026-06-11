import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { ThamHoiCaNhanFormValues } from '../core/schema';
import type { TrangThaiThamHoi } from '../core/constants';
import type { ThamHoiCaNhan } from '../core/types';
import {
  createThamHoiCaNhan,
  deleteThamHoiCaNhanMany,
  getThamHoiCaNhanById,
  getThamHoiCaNhanByCaNhanId,
  getThamHoiCaNhanByDipId,
  getThamHoiCaNhanList,
  importThamHoiCaNhan,
  updateThamHoiCaNhan,
  updateThamHoiCaNhanTrangThai,
} from '../services/tham-hoi-ca-nhan-service';

const listKey = queryKeys.danTocThamHoiCaNhan.all;

export function useThamHoiCaNhanList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThamHoiCaNhanList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiCaNhanDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiCaNhan.detail(id?.trim() ?? '__'),
    queryFn: () => getThamHoiCaNhanById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiCaNhanByCaNhanId(caNhanId: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(caNhanId?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiCaNhan.byCaNhan(caNhanId?.trim() ?? '__'),
    queryFn: () => getThamHoiCaNhanByCaNhanId(caNhanId!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiCaNhanByDipId(dipId: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(dipId?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiCaNhan.byDip(dipId?.trim() ?? '__'),
    queryFn: () => getThamHoiCaNhanByDipId(dipId!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateThamHoiCaNhan(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThamHoiCaNhanFormValues; idNguoiTao: string }) =>
      createThamHoiCaNhan(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThamHoiCaNhan[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocThamHoiCaNhan.detail(created.id), created);
      queryClient.invalidateQueries({
        queryKey: queryKeys.danTocThamHoiCaNhan.byCaNhan(created.ca_nhan_id),
      });
      if (created.dip_tham_hoi_id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.danTocThamHoiCaNhan.byDip(created.dip_tham_hoi_id),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.all });
      }
      toast.success(txt('danTocThamHoiCaNhan.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateThamHoiCaNhan(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThamHoiCaNhanFormValues }) =>
      updateThamHoiCaNhan(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThamHoiCaNhan[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocThamHoiCaNhan.detail(updated.id), updated);
      queryClient.invalidateQueries({
        queryKey: queryKeys.danTocThamHoiCaNhan.byCaNhan(updated.ca_nhan_id),
      });
      if (updated.dip_tham_hoi_id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.danTocThamHoiCaNhan.byDip(updated.dip_tham_hoi_id),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.all });
      }
      toast.success(txt('danTocThamHoiCaNhan.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateThamHoiCaNhanTrangThai(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      trangThai,
      thoiGianThucTe,
    }: {
      id: string;
      trangThai: TrangThaiThamHoi;
      thoiGianThucTe?: string | null;
    }) => updateThamHoiCaNhanTrangThai(id, trangThai, thoiGianThucTe),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThamHoiCaNhan[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocThamHoiCaNhan.detail(updated.id), updated);
      if (updated.dip_tham_hoi_id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.danTocThamHoiCaNhan.byDip(updated.dip_tham_hoi_id),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.all });
      }
      toast.success(txt('danTocThamHoiCaNhan.toast.changeStatus'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteThamHoiCaNhanMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThamHoiCaNhanMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThamHoiCaNhan[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocThamHoiCaNhan.detail(id) });
      }
      void queryClient.invalidateQueries({ queryKey: ['dttg-tham-hoi-ca-nhan', 'by-ca-nhan'] });
      toast.success(txt('danTocThamHoiCaNhan.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useImportThamHoiCaNhan(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importThamHoiCaNhan(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: ['dttg-tham-hoi-ca-nhan', 'by-ca-nhan'] });
      if (result.created > 0) {
        toast.success(txt('danTocThamHoiCaNhan.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
