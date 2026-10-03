import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { isConstraintFieldError } from '@/lib/supabase/constraint-field-error';
import { getErrorMessage } from '@/lib/utils';
import type { KhoDonViCuuTroFormValues } from '../core/schema';
import type { KhoDonViCuuTroListRow } from '../core/types';
import {
  createKhoDonViCuuTro,
  deleteKhoDonViCuuTroMany,
  getKhoDonViCuuTroById,
  getKhoDonViCuuTroList,
  getKhoDonViCuuTroUngHoNhom,
  updateKhoDonViCuuTro,
} from '../services/kho-don-vi-cuu-tro-service';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import { importDonViCuuTroRows } from '../services/don-vi-cuu-tro-import';

const listKey = queryKeys.khoDonViCuuTro.all;

/** Trùng tên ⇒ form gắn chữ đỏ dưới ô (xem `applyConstraintErrorToForm`), không toast. */
function onGhiLoi(e: unknown) {
  if (isConstraintFieldError(e)) return;
  toast.error(getErrorMessage(e));
}

export function useKhoDonViCuuTroList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getKhoDonViCuuTroList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

/**
 * Số ủng hộ gom theo đơn vị × đợt / nội dung. `tuNgay` / `denNgay` rỗng = toàn
 * thời gian (tab Danh sách luôn dùng thế; tab Thống kê truyền kỳ đang chọn).
 */
export function useKhoDonViCuuTroUngHoNhom(
  tuNgay: string,
  denNgay: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.khoDonViCuuTro.ungHoNhom(tuNgay, denNgay),
    queryFn: () => getKhoDonViCuuTroUngHoNhom(tuNgay, denNgay),
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
    // Đổi kỳ: giữ số kỳ trước trong lúc tải, khỏi nháy khung xương cả trang.
    placeholderData: keepPreviousData,
  });
}

export function useKhoDonViCuuTroDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.khoDonViCuuTro.detail(id?.trim() ?? '__'),
    queryFn: () => getKhoDonViCuuTroById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateKhoDonViCuuTro(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KhoDonViCuuTroFormValues) => createKhoDonViCuuTro(data),
    onSuccess: (inserted) => {
      // Đơn vị mới chưa có khoản ủng hộ nào.
      const created: KhoDonViCuuTroListRow = { ...inserted };
      queryClient.setQueryData<KhoDonViCuuTroListRow[]>(listKey, (old) => {
        if (!old) return [created];
        const rest = old.filter((r) => r.id !== created.id);
        return [...rest, created].sort((a, b) =>
          a.tt !== b.tt ? a.tt - b.tt : Number(a.id) - Number(b.id),
        );
      });
      queryClient.setQueryData(queryKeys.khoDonViCuuTro.detail(created.id), created);
      toast.success(txt('matTranDonViCuuTro.toast.create'));
      onSuccess?.();
    },
    onError: onGhiLoi,
  });
}

export function useUpdateKhoDonViCuuTro(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KhoDonViCuuTroFormValues }) => updateKhoDonViCuuTro(id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<KhoDonViCuuTroListRow[]>(listKey);
      if (prev) {
        // RETURNING không có tổng ủng hộ — giữ số cũ, sửa hồ sơ không làm đổi tổng.
        queryClient.setQueryData<KhoDonViCuuTroListRow[]>(
          listKey,
          prev.map((r) => (r.id === updated.id ? { ...updated, ket_qua_ung_ho: r.ket_qua_ung_ho } : r)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData<KhoDonViCuuTroListRow | null>(
        queryKeys.khoDonViCuuTro.detail(updated.id),
        (old) => ({
          ...updated,
          ket_qua_ung_ho: old?.ket_qua_ung_ho ?? prev?.find((r) => r.id === updated.id)?.ket_qua_ung_ho ?? null,
        }),
      );
      toast.success(txt('matTranDonViCuuTro.toast.update'));
      onSuccess?.();
    },
    onError: onGhiLoi,
  });
}

export function useDeleteKhoDonViCuuTroMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteKhoDonViCuuTroMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<KhoDonViCuuTroListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDonViCuuTroListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khoDonViCuuTro.detail(id) });
      }
      toast.success(txt('matTranDonViCuuTro.toast.delete', { count: ids.length }));
    },
  });
}

export function useImportKhoDonViCuuTro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, options }: { rows: Record<string, unknown>[]; options: ImportRunOptions }) =>
      importDonViCuuTroRows(rows, options),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      if (created + updated > 0) {
        toast.success(txt('matTranDonViCuuTro.toast.importSuccess', { created, updated }));
      }
    },
  });
}
