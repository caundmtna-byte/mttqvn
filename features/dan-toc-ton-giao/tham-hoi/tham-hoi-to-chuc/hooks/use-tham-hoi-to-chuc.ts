import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { ThamHoiToChucFormValues } from '../core/schema';
import type { TienDoThamHoi } from '../core/constants';
import type { ThamHoiToChuc } from '../core/types';
import {
  createThamHoiToChuc,
  deleteThamHoiToChucMany,
  getThamHoiToChucById,
  getThamHoiToChucByToChucId,
  getThamHoiToChucByDipId,
  getThamHoiToChucList,
  updateThamHoiToChuc,
  updateThamHoiToChucTienDo,
} from '../services/tham-hoi-to-chuc-service';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import {
  importThamHoiToChucRows,
  type ThamHoiToChucImportContext,
} from '../services/tham-hoi-to-chuc-import';

const listKey = queryKeys.danTocThamHoiToChuc.all;

/**
 * Danh sách chính chạy phân trang phía máy chủ, nên vá `listKey` KHÔNG đủ:
 * mỗi trang là một query riêng. Mọi mutation phải cho các trang đó stale.
 */
const pageKeyPrefix = ['dttg-tham-hoi-to-chuc', 'page'] as const;

function invalidatePages(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: pageKeyPrefix });
}

export function useThamHoiToChucList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThamHoiToChucList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiToChucDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiToChuc.detail(id?.trim() ?? '__'),
    queryFn: () => getThamHoiToChucById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiToChucByToChucId(toChucId: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(toChucId?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiToChuc.byToChuc(toChucId?.trim() ?? '__'),
    queryFn: () => getThamHoiToChucByToChucId(toChucId!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiToChucByDipId(dipId: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(dipId?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiToChuc.byDip(dipId?.trim() ?? '__'),
    queryFn: () => getThamHoiToChucByDipId(dipId!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateThamHoiToChuc(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThamHoiToChucFormValues; idNguoiTao: string }) =>
      createThamHoiToChuc(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThamHoiToChuc[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(created.id), created);
      queryClient.invalidateQueries({
        queryKey: queryKeys.danTocThamHoiToChuc.byToChuc(created.to_chuc_id),
      });
      if (created.dip_tham_hoi_id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.danTocThamHoiToChuc.byDip(created.dip_tham_hoi_id),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.all });
      }
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiToChuc.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateThamHoiToChuc(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThamHoiToChucFormValues }) =>
      updateThamHoiToChuc(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThamHoiToChuc[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(updated.id), updated);
      queryClient.invalidateQueries({
        queryKey: queryKeys.danTocThamHoiToChuc.byToChuc(updated.to_chuc_id),
      });
      if (updated.dip_tham_hoi_id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.danTocThamHoiToChuc.byDip(updated.dip_tham_hoi_id),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.all });
      }
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiToChuc.toast.update'));
      onSuccess?.();
    },
  });
}

export function useUpdateThamHoiToChucTienDo(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      tienDo,
      thoiGianThucTe,
    }: {
      id: string;
      tienDo: TienDoThamHoi;
      thoiGianThucTe?: string | null;
    }) => updateThamHoiToChucTienDo(id, tienDo, thoiGianThucTe),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThamHoiToChuc[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(updated.id), updated);
      if (updated.dip_tham_hoi_id) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.danTocThamHoiToChuc.byDip(updated.dip_tham_hoi_id),
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.all });
      }
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiToChuc.toast.changeStatus'));
      onSuccess?.();
    },
  });
}

export function useDeleteThamHoiToChucMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThamHoiToChucMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThamHoiToChuc[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocThamHoiToChuc.detail(id) });
      }
      void queryClient.invalidateQueries({ queryKey: ['dttg-tham-hoi-to-chuc', 'by-to-chuc'] });
      invalidatePages(queryClient);
      toast.success(txt('danTocThamHoiToChuc.toast.delete', { count: ids.length }));
    },
  });
}

/**
 * Không tự đóng hộp thoại khi xong: bước kết quả của `ImportDialog` cần ở lại để
 * người dùng xem dòng lỗi / tải file lỗi.
 */
export function useImportThamHoiToChuc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      options,
      ctx,
    }: {
      rows: Record<string, unknown>[];
      options: ImportRunOptions;
      ctx: ThamHoiToChucImportContext;
    }) => importThamHoiToChucRows(rows, options, ctx),
    onSuccess: (result) => {
      // Tiền tố `all` phủ cả trang server, chi tiết, by-to-chuc và by-dip.
      void queryClient.invalidateQueries({ queryKey: listKey });
      if ((result.created ?? 0) + (result.updated ?? 0) > 0) {
        toast.success(
          txt('danTocThamHoiToChuc.import.toastDone', {
            created: String(result.created ?? 0),
            updated: String(result.updated ?? 0),
          }),
        );
      }
    },
  });
}
