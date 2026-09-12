import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import {
  masterDataQueryOptions,
  transactionalCrudListQueryOptions,
} from '@/lib/supabase/query-config';
import type { QuyKey } from '../../core/constants';
import type { QuyDanhMucTaiKhoanFormValues } from '../core/schema';
import type { QuyDanhMucTaiKhoanListRow } from '../core/types';
import {
  createQuyDanhMucTaiKhoan,
  deleteQuyDanhMucTaiKhoanMany,
  getQuyDanhMucTaiKhoanById,
  getQuyDanhMucTaiKhoanList,
  getQuySoDuTheoTaiKhoan,
  getQuyTaiKhoanOptions,
  updateQuyDanhMucTaiKhoan,
} from '../services/quy-danh-muc-tai-khoan-service';

function sortRows(rows: QuyDanhMucTaiKhoanListRow[]): QuyDanhMucTaiKhoanListRow[] {
  return [...rows].sort((a, b) =>
    a.thu_tu !== b.thu_tu ? a.thu_tu - b.thu_tu : Number(a.id) - Number(b.id),
  );
}

export function useQuyDanhMucTaiKhoanList(quy: QuyKey, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.quyDanhMucTaiKhoan.all(quy),
    queryFn: () => getQuyDanhMucTaiKhoanList(quy),
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useQuyDanhMucTaiKhoanDetail(
  quy: QuyKey,
  id: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.quyDanhMucTaiKhoan.detail(quy, id?.trim() ?? '__'),
    queryFn: () => getQuyDanhMucTaiKhoanById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/** Ô chọn tài khoản khi lập phiếu — danh mục đổi ít nên cache dài hơn. */
export function useQuyTaiKhoanOptions(quy: QuyKey, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...queryKeys.quyDanhMucTaiKhoan.all(quy), 'options'],
    queryFn: () => getQuyTaiKhoanOptions(quy),
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });
}

/** Số dư từng tài khoản — hiện ở đầu trang Sổ thu chi và trong danh mục tài khoản. */
export function useQuySoDuTheoTaiKhoan(quy: QuyKey, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.quySoThuChi.soDu(quy),
    queryFn: () => getQuySoDuTheoTaiKhoan(quy),
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateQuyDanhMucTaiKhoan(quy: QuyKey, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.quyDanhMucTaiKhoan.all(quy);
  return useMutation({
    mutationFn: (data: QuyDanhMucTaiKhoanFormValues) => createQuyDanhMucTaiKhoan(quy, data),
    onSuccess: (created) => {
      queryClient.setQueryData<QuyDanhMucTaiKhoanListRow[]>(listKey, (old) =>
        sortRows([...(old ?? []).filter((r) => r.id !== created.id), created]),
      );
      queryClient.setQueryData(queryKeys.quyDanhMucTaiKhoan.detail(quy, created.id), created);
      void queryClient.invalidateQueries({ queryKey: [...listKey, 'options'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quySoThuChi.soDu(quy) });
      toast.success(txt('quy.danhMucTaiKhoan.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateQuyDanhMucTaiKhoan(quy: QuyKey, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.quyDanhMucTaiKhoan.all(quy);
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuyDanhMucTaiKhoanFormValues }) =>
      updateQuyDanhMucTaiKhoan(quy, id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<QuyDanhMucTaiKhoanListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<QuyDanhMucTaiKhoanListRow[]>(
          listKey,
          sortRows(prev.map((r) => (r.id === updated.id ? updated : r))),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData(queryKeys.quyDanhMucTaiKhoan.detail(quy, updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: [...listKey, 'options'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quySoThuChi.soDu(quy) });
      toast.success(txt('quy.danhMucTaiKhoan.toast.update'));
      onSuccess?.();
    },
  });
}

export function useDeleteQuyDanhMucTaiKhoanMany(quy: QuyKey) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.quyDanhMucTaiKhoan.all(quy);
  return useMutation({
    mutationFn: (ids: string[]) => deleteQuyDanhMucTaiKhoanMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<QuyDanhMucTaiKhoanListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<QuyDanhMucTaiKhoanListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.quyDanhMucTaiKhoan.detail(quy, id) });
      }
      void queryClient.invalidateQueries({ queryKey: [...listKey, 'options'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.quySoThuChi.soDu(quy) });
      toast.success(txt('quy.danhMucTaiKhoan.toast.delete', { count: ids.length }));
    },
  });
}
