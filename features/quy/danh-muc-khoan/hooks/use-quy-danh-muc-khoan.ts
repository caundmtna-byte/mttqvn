import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import {
  masterDataQueryOptions,
  transactionalCrudListQueryOptions,
} from '@/lib/supabase/query-config';
import type { QuyKey } from '../../core/constants';
import type { QuyDanhMucKhoanFormValues } from '../core/schema';
import type { QuyDanhMucKhoanListRow } from '../core/types';
import {
  createQuyDanhMucKhoan,
  deleteQuyDanhMucKhoanMany,
  getQuyDanhMucKhoanById,
  getQuyDanhMucKhoanList,
  getQuyKhoanOptions,
  updateQuyDanhMucKhoan,
} from '../services/quy-danh-muc-khoan-service';

function sortRows(rows: QuyDanhMucKhoanListRow[]): QuyDanhMucKhoanListRow[] {
  return [...rows].sort((a, b) => {
    if (a.loai !== b.loai) return a.loai < b.loai ? -1 : 1;
    if (a.thu_tu !== b.thu_tu) return a.thu_tu - b.thu_tu;
    return Number(a.id) - Number(b.id);
  });
}

export function useQuyDanhMucKhoanList(quy: QuyKey, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.quyDanhMucKhoan.all(quy),
    queryFn: () => getQuyDanhMucKhoanList(quy),
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useQuyDanhMucKhoanDetail(
  quy: QuyKey,
  id: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.quyDanhMucKhoan.detail(quy, id?.trim() ?? '__'),
    queryFn: () => getQuyDanhMucKhoanById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/** Ô chọn khoản mục khi lập phiếu. */
export function useQuyKhoanOptions(quy: QuyKey, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.quyDanhMucKhoan.all(quy), 'options'],
    queryFn: () => getQuyKhoanOptions(quy),
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });
}

export function useCreateQuyDanhMucKhoan(quy: QuyKey, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.quyDanhMucKhoan.all(quy);
  return useMutation({
    mutationFn: (data: QuyDanhMucKhoanFormValues) => createQuyDanhMucKhoan(quy, data),
    onSuccess: (created) => {
      queryClient.setQueryData<QuyDanhMucKhoanListRow[]>(listKey, (old) =>
        sortRows([...(old ?? []).filter((r) => r.id !== created.id), created]),
      );
      queryClient.setQueryData(queryKeys.quyDanhMucKhoan.detail(quy, created.id), created);
      void queryClient.invalidateQueries({ queryKey: [...listKey, 'options'] });
      toast.success(txt('quy.danhMucKhoan.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateQuyDanhMucKhoan(quy: QuyKey, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.quyDanhMucKhoan.all(quy);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuyDanhMucKhoanFormValues }) =>
      updateQuyDanhMucKhoan(quy, id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<QuyDanhMucKhoanListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<QuyDanhMucKhoanListRow[]>(
          listKey,
          sortRows(prev.map((r) => (r.id === updated.id ? updated : r))),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData(queryKeys.quyDanhMucKhoan.detail(quy, updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: [...listKey, 'options'] });
      // Tên khoản mục hiện trong sổ ⇒ trang sổ phải tải lại để khỏi hiện tên cũ.
      void queryClient.invalidateQueries({ queryKey: queryKeys.quySoThuChi.all(quy) });
      toast.success(txt('quy.danhMucKhoan.toast.update'));
      onSuccess?.();
    },
  });
}

export function useDeleteQuyDanhMucKhoanMany(quy: QuyKey) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.quyDanhMucKhoan.all(quy);
  return useMutation({
    mutationFn: (ids: string[]) => deleteQuyDanhMucKhoanMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<QuyDanhMucKhoanListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<QuyDanhMucKhoanListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.quyDanhMucKhoan.detail(quy, id) });
      }
      void queryClient.invalidateQueries({ queryKey: [...listKey, 'options'] });
      toast.success(txt('quy.danhMucKhoan.toast.delete', { count: ids.length }));
    },
  });
}
