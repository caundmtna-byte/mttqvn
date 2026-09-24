import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { isConstraintFieldError } from '@/lib/supabase/constraint-field-error';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions, masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqUyVienUyBan } from '../core/types';
import type { MttqUyVienUyBanFormValues } from '../core/schema';
import {
  createMttqUyVienUyBan,
  deleteMttqUyVienUyBanMany,
  getMttqUyVienUyBanById,
  getMttqUyVienUyBanList,
  getMttqUyVienUyBanListForNhiemKyId,
  getMttqUyVienUyBanStatsList,
  updateMttqUyVienUyBan,
  UyVienUyBanConflictError,
} from '../services/mttq-uy-vien-uy-ban-service';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import { importUyVienRows, type UyVienImportContext } from '../services/uy-vien-import';

function uyVienMutationErrorMessage(e: unknown): string {
  if (e instanceof UyVienUyBanConflictError) return e.message;
  return getErrorMessage(e);
}

const listKey = queryKeys.mttqUyVienUyBan.all;
const statsListKey = queryKeys.mttqUyVienUyBan.stats;

export const useMttqUyVienUyBanList = (options?: { enabled?: boolean; donViId?: string | null }) =>
  useQuery({
    queryKey: [...listKey, options?.donViId ?? 'all'] as const,
    queryFn: () => getMttqUyVienUyBanList(options?.donViId),
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqUyVienUyBanStatsList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: statsListKey,
    queryFn: getMttqUyVienUyBanStatsList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqUyVienUyBanDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqUyVienUyBan.detail(id ?? ''),
    queryFn: () => (id ? getMttqUyVienUyBanById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

/** Ủy viên theo nhiệm kỳ — drawer chi tiết nhiệm kỳ. */
export const useMttqUyVienUyBanListForNhiemKy = (nhiemKyId: string | null, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.mttqUyVienUyBan.byNhiemKy(nhiemKyId ?? ''),
    queryFn: () => getMttqUyVienUyBanListForNhiemKyId(nhiemKyId ?? ''),
    enabled: Boolean(nhiemKyId?.trim()) && options?.enabled !== false,
    // Danh sách ủy viên theo nhiệm kỳ thay đổi ít — 30 phút stale.
    ...masterDataQueryOptions,
  });

export const useCreateMttqUyVienUyBan = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqUyVienUyBanFormValues; idNguoiTao: string }) =>
      createMttqUyVienUyBan(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: statsListKey });
      toast.success(txt('matTranUyVienUyBan.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => {
      // Lỗi trùng có ô nhập tương ứng ⇒ form gắn chữ đỏ dưới ô, không toast
      // (cùng cách với `use-bai-viet-danh-sach.ts`).
      if (isConstraintFieldError(e)) return;
      toast.error(uyVienMutationErrorMessage(e));
    },
  });
};

export const useUpdateMttqUyVienUyBan = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqUyVienUyBanFormValues }) =>
      updateMttqUyVienUyBan(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<MttqUyVienUyBan[]>(listKey, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      queryClient.setQueryData<MttqUyVienUyBan[]>(statsListKey, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      queryClient.setQueryData<MttqUyVienUyBan | null>(queryKeys.mttqUyVienUyBan.detail(id), updated);
      toast.success(txt('matTranUyVienUyBan.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => {
      // Lỗi trùng có ô nhập tương ứng ⇒ form gắn chữ đỏ dưới ô, không toast
      // (cùng cách với `use-bai-viet-danh-sach.ts`).
      if (isConstraintFieldError(e)) return;
      toast.error(uyVienMutationErrorMessage(e));
    },
  });
};

export const useDeleteMttqUyVienUyBanMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqUyVienUyBanMany,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: statsListKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqUyVienUyBan.detail(id) });
      }
      toast.success(txt('matTranUyVienUyBan.toast.delete', { count: ids.length }));
    },
  });
};

export const useImportMttqUyVienUyBan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      options,
      ctx,
    }: {
      rows: Record<string, unknown>[];
      options: ImportRunOptions;
      ctx: UyVienImportContext;
    }) => importUyVienRows(rows, options, ctx),
    onSuccess: (result) => {
      // `all` là tiền tố của cả danh sách, thống kê, chi tiết và theo-nhiệm-kỳ.
      void queryClient.invalidateQueries({ queryKey: listKey });
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      if (created + updated > 0) {
        toast.success(txt('matTranUyVienUyBan.toast.importSuccess', { created, updated }));
      }
    },
  });
};
