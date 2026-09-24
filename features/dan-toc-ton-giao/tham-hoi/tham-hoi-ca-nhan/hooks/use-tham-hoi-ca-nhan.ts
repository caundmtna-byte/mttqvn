import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
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
  updateThamHoiCaNhan,
  updateThamHoiCaNhanTrangThai,
} from '../services/tham-hoi-ca-nhan-service';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import {
  importThamHoiCaNhanRows,
  type ThamHoiCaNhanImportContext,
} from '../services/tham-hoi-ca-nhan-import';

const listKey = queryKeys.danTocThamHoiCaNhan.all;

/**
 * Danh sách chính chạy phân trang phía máy chủ, nên vá `listKey` KHÔNG đủ:
 * mỗi trang là một query riêng. Mọi mutation phải cho các trang đó stale.
 */
const pageKeyPrefix = ['dttg-tham-hoi-ca-nhan', 'page'] as const;

function invalidatePages(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: pageKeyPrefix });
}

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
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiCaNhan.toast.create'));
      onSuccess?.();
    },
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
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiCaNhan.toast.update'));
      onSuccess?.();
    },
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
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiCaNhan.toast.changeStatus'));
      onSuccess?.();
    },
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
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiCaNhan.toast.delete', { count: ids.length }));
    },
  });
}

/**
 * Không tự đóng hộp thoại khi xong: bước kết quả của `ImportDialog` cần ở lại để
 * người dùng xem dòng lỗi / tải file lỗi.
 */
export function useImportThamHoiCaNhan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      options,
      ctx,
    }: {
      rows: Record<string, unknown>[];
      options: ImportRunOptions;
      ctx: ThamHoiCaNhanImportContext;
    }) => importThamHoiCaNhanRows(rows, options, ctx),
    onSuccess: (result) => {
      // Tiền tố `all` phủ cả trang server, chi tiết, by-ca-nhan và by-dip.
      void queryClient.invalidateQueries({ queryKey: listKey });
      if ((result.created ?? 0) + (result.updated ?? 0) > 0) {
        toast.success(
          txt('danTocThamHoiCaNhan.import.toastDone', {
            created: String(result.created ?? 0),
            updated: String(result.updated ?? 0),
          }),
        );
      }
    },
  });
}
