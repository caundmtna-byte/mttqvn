import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { KhoDanhMucHangHoaFormValues } from '../core/schema';
import type { KhoDanhMucHangHoaListRow } from '../core/types';
import {
  createKhoDanhMucHangHoa,
  deleteKhoDanhMucHangHoaMany,
  getKhoDanhMucHangHoaById,
  getKhoDanhMucHangHoaList,
  updateKhoDanhMucHangHoa,
} from '../services/kho-danh-muc-hang-hoa-service';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import { importKhoDanhMucHangHoaRows } from '../services/kho-hang-hoa-import';

const listKey = queryKeys.khoDanhMucHangHoa.all;
const hangListPrefix = queryKeys.khoDanhSachHangHoa.all;

export function useKhoDanhMucHangHoaList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getKhoDanhMucHangHoaList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useKhoDanhMucHangHoaDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.khoDanhMucHangHoa.detail(id?.trim() ?? '__'),
    queryFn: () => getKhoDanhMucHangHoaById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateKhoDanhMucHangHoa(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KhoDanhMucHangHoaFormValues) => createKhoDanhMucHangHoa(data),
    onSuccess: (created) => {
      queryClient.setQueryData<KhoDanhMucHangHoaListRow[]>(listKey, (old) => {
        if (!old) return [created];
        const rest = old.filter((r) => r.id !== created.id);
        return [...rest, created].sort((a, b) => a.thu_tu - b.thu_tu || a.ten_danh_muc.localeCompare(b.ten_danh_muc, 'vi'));
      });
      queryClient.setQueryData(queryKeys.khoDanhMucHangHoa.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: hangListPrefix, refetchType: 'none' });
      toast.success(txt('matTranHangHoa.toast.createDanhMuc'));
      onSuccess?.();
    },
  });
}

export function useUpdateKhoDanhMucHangHoa(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KhoDanhMucHangHoaFormValues }) => updateKhoDanhMucHangHoa(id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<KhoDanhMucHangHoaListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDanhMucHangHoaListRow[]>(
          listKey,
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData(queryKeys.khoDanhMucHangHoa.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: hangListPrefix, refetchType: 'none' });
      toast.success(txt('matTranHangHoa.toast.updateDanhMuc'));
      onSuccess?.();
    },
  });
}

export function useDeleteKhoDanhMucHangHoaMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteKhoDanhMucHangHoaMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<KhoDanhMucHangHoaListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDanhMucHangHoaListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khoDanhMucHangHoa.detail(id) });
      }
      void queryClient.invalidateQueries({ queryKey: hangListPrefix, refetchType: 'none' });
      toast.success(txt('matTranHangHoa.toast.deleteDanhMuc', { count: ids.length }));
    },
  });
}

export function useImportKhoDanhMucHangHoa(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, options }: { rows: Record<string, unknown>[]; options: ImportRunOptions }) =>
      importKhoDanhMucHangHoaRows(rows, options),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: hangListPrefix, refetchType: 'none' });
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      if (created + updated > 0) {
        toast.success(txt('matTranHangHoa.import.toastSuccessDanhMuc', { created, updated }));
      }
      onSuccess?.();
    },
  });
}
