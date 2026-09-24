import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import type { ThongTinCaNhanTieuBieuFormValues } from '../core/schema';
import type { ThongTinCaNhanTieuBieu } from '../core/types';
import {
  createThongTinCaNhanTieuBieu,
  deleteThongTinCaNhanTieuBieuMany,
  getThongTinCaNhanTieuBieuById,
  getThongTinCaNhanTieuBieuList,
  updateThongTinCaNhanTieuBieu,
  updateThongTinCaNhanTieuBieuStatus,
} from '../services/thong-tin-ca-nhan-tieu-bieu-service';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import {
  importCaNhanTieuBieuRows,
  type CaNhanTieuBieuImportContext,
} from '../services/thong-tin-ca-nhan-tieu-bieu-import';

const listKey = queryKeys.danTocCaNhanTieuBieu.all;

export function useThongTinCaNhanTieuBieuList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThongTinCaNhanTieuBieuList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThongTinCaNhanTieuBieuDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocCaNhanTieuBieu.detail(id?.trim() ?? '__'),
    queryFn: () => getThongTinCaNhanTieuBieuById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateThongTinCaNhanTieuBieu(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThongTinCaNhanTieuBieuFormValues; idNguoiTao: string }) =>
      createThongTinCaNhanTieuBieu(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(created.id), created);
      toast.success(txt('danTocCaNhanTieuBieu.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateThongTinCaNhanTieuBieu(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThongTinCaNhanTieuBieuFormValues }) =>
      updateThongTinCaNhanTieuBieu(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(updated.id), updated);
      toast.success(txt('danTocCaNhanTieuBieu.toast.update'));
      onSuccess?.();
    },
  });
}

export function useUpdateThongTinCaNhanTieuBieuStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrangThaiHoatDong }) =>
      updateThongTinCaNhanTieuBieuStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(updated.id), updated);
      toast.success(txt('danTocCaNhanTieuBieu.toast.update'));
    },
  });
}

export function useDeleteThongTinCaNhanTieuBieuMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThongTinCaNhanTieuBieuMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocCaNhanTieuBieu.detail(id) });
      }
      toast.success(txt('danTocCaNhanTieuBieu.toast.delete', { count: ids.length }));
    },
  });
}

/**
 * Không tự đóng hộp thoại khi xong: bước kết quả của `ImportDialog` cần ở lại để
 * người dùng xem dòng lỗi / tải file lỗi.
 */
export function useImportThongTinCaNhanTieuBieu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      options,
      ctx,
    }: {
      rows: Record<string, unknown>[];
      options: ImportRunOptions;
      ctx: CaNhanTieuBieuImportContext;
    }) => importCaNhanTieuBieuRows(rows, options, ctx),
    onSuccess: (result) => {
      // Tiền tố `all` phủ cả danh sách lẫn chi tiết.
      void queryClient.invalidateQueries({ queryKey: listKey });
      if ((result.created ?? 0) + (result.updated ?? 0) > 0) {
        toast.success(
          txt('danTocCaNhanTieuBieu.import.toastDone', {
            created: String(result.created ?? 0),
            updated: String(result.updated ?? 0),
          }),
        );
      }
    },
  });
}
