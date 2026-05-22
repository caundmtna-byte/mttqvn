import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { KhoDanhSachHangHoaFormValues } from '../core/schema';
import type { KhoDanhSachHangHoaListRow } from '../core/types';
import {
  createKhoDanhSachHangHoa,
  deleteKhoDanhSachHangHoaMany,
  getKhoDanhSachHangHoaById,
  getKhoDanhSachHangHoaList,
  updateKhoDanhSachHangHoa,
} from '../services/kho-danh-sach-hang-hoa-service';

const listKey = queryKeys.khoDanhSachHangHoa.all;

export function useKhoDanhSachHangHoaList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getKhoDanhSachHangHoaList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useKhoDanhSachHangHoaDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.khoDanhSachHangHoa.detail(id?.trim() ?? '__'),
    queryFn: () => getKhoDanhSachHangHoaById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateKhoDanhSachHangHoa(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KhoDanhSachHangHoaFormValues) => createKhoDanhSachHangHoa(data),
    onSuccess: (created) => {
      queryClient.setQueryData<KhoDanhSachHangHoaListRow[]>(listKey, (old) => {
        if (!old) return [created];
        const rest = old.filter((r) => r.id !== created.id);
        return [created, ...rest];
      });
      queryClient.setQueryData(queryKeys.khoDanhSachHangHoa.detail(created.id), created);
      toast.success(txt('matTranHangHoa.toast.createHang'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateKhoDanhSachHangHoa(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KhoDanhSachHangHoaFormValues }) => updateKhoDanhSachHangHoa(id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<KhoDanhSachHangHoaListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDanhSachHangHoaListRow[]>(
          listKey,
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData(queryKeys.khoDanhSachHangHoa.detail(updated.id), updated);
      toast.success(txt('matTranHangHoa.toast.updateHang'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteKhoDanhSachHangHoaMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteKhoDanhSachHangHoaMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<KhoDanhSachHangHoaListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDanhSachHangHoaListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khoDanhSachHangHoa.detail(id) });
      }
      toast.success(txt('matTranHangHoa.toast.deleteHang', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
