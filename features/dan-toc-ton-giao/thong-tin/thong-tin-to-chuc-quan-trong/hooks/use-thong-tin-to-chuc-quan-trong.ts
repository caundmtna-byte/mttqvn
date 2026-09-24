import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import type { ThongTinToChucQuanTrongFormValues } from '../core/schema';
import type { ThongTinToChucQuanTrong } from '../core/types';
import {
  createThongTinToChucQuanTrong,
  deleteThongTinToChucQuanTrongMany,
  getThongTinToChucQuanTrongById,
  getThongTinToChucQuanTrongList,
  updateThongTinToChucQuanTrong,
  updateThongTinToChucQuanTrongStatus,
} from '../services/thong-tin-to-chuc-quan-trong-service';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import {
  importToChucQuanTrongRows,
  type ToChucQuanTrongImportContext,
} from '../services/thong-tin-to-chuc-quan-trong-import';

const listKey = queryKeys.danTocToChucQuanTrong.all;

export function useThongTinToChucQuanTrongList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThongTinToChucQuanTrongList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThongTinToChucQuanTrongDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocToChucQuanTrong.detail(id?.trim() ?? '__'),
    queryFn: () => getThongTinToChucQuanTrongById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateThongTinToChucQuanTrong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThongTinToChucQuanTrongFormValues; idNguoiTao: string }) =>
      createThongTinToChucQuanTrong(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(created.id), created);
      toast.success(txt('danTocToChucQuanTrong.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateThongTinToChucQuanTrong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThongTinToChucQuanTrongFormValues }) =>
      updateThongTinToChucQuanTrong(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(updated.id), updated);
      toast.success(txt('danTocToChucQuanTrong.toast.update'));
      onSuccess?.();
    },
  });
}

export function useUpdateThongTinToChucQuanTrongStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrangThaiHoatDong }) =>
      updateThongTinToChucQuanTrongStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(updated.id), updated);
      toast.success(txt('danTocToChucQuanTrong.toast.update'));
    },
  });
}

export function useDeleteThongTinToChucQuanTrongMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThongTinToChucQuanTrongMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocToChucQuanTrong.detail(id) });
      }
      toast.success(txt('danTocToChucQuanTrong.toast.delete', { count: ids.length }));
    },
  });
}

/**
 * Không tự đóng hộp thoại khi xong: bước kết quả của `ImportDialog` cần ở lại để
 * người dùng xem dòng lỗi / tải file lỗi.
 */
export function useImportThongTinToChucQuanTrong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      options,
      ctx,
    }: {
      rows: Record<string, unknown>[];
      options: ImportRunOptions;
      ctx: ToChucQuanTrongImportContext;
    }) => importToChucQuanTrongRows(rows, options, ctx),
    onSuccess: (result) => {
      // Tiền tố `all` phủ cả danh sách lẫn chi tiết.
      void queryClient.invalidateQueries({ queryKey: listKey });
      if ((result.created ?? 0) + (result.updated ?? 0) > 0) {
        toast.success(
          txt('danTocToChucQuanTrong.import.toastDone', {
            created: String(result.created ?? 0),
            updated: String(result.updated ?? 0),
          }),
        );
      }
    },
  });
}
