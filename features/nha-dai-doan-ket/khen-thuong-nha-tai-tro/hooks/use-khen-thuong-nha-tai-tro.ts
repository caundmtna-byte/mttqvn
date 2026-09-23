import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type {
  KhenThuongNhaTaiTroFormValues,
  KhenThuongNhaTaiTroStatusChangeValues,
} from '../core/schema';
import type { KhenThuongNhaTaiTro } from '../core/types';
import {
  createKhenThuongNhaTaiTro,
  deleteKhenThuongNhaTaiTroMany,
  getKhenThuongNhaTaiTroAll,
  getKhenThuongNhaTaiTroById,
  updateKhenThuongNhaTaiTro,
  updateKhenThuongNhaTaiTroTrangThai,
} from '../services/khen-thuong-nha-tai-tro-service';

const allKey = queryKeys.khenThuongNhaTaiTro.all;

/**
 * Toàn bộ quyết định trong phạm vi xem — tab Thống kê. Đi qua RPC (không đọc
 * thẳng bảng) để có sẵn cột thành tích và để phạm vi xem được áp ở máy chủ.
 */
export function useKhenThuongNhaTaiTroAllRows(
  scope: { viewAll: boolean; viewerXaPhuongId: string | null },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.khenThuongNhaTaiTro.allRows(scope),
    queryFn: () =>
      getKhenThuongNhaTaiTroAll({
        search: '',
        sort: null,
        ...scope,
        nam: [],
        capKhen: [],
        trangThai: [],
        xaPhuongIds: [],
        nhaTaiTroIds: [],
        loaiNhaTaiTro: [],
        columnSearch: null,
      }),
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useKhenThuongNhaTaiTroDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.khenThuongNhaTaiTro.detail(id?.trim() ?? '__'),
    queryFn: () => getKhenThuongNhaTaiTroById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/**
 * Mọi thay đổi làm mới cả trang danh sách, tab thống kê lẫn chi tiết: cột thành
 * tích tính ở RPC nên dữ liệu trả về từ lệnh ghi (đọc thẳng bảng) không có nó.
 */
function invalidateAll(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: allKey });
}

function useKtntMutation<TVars>(
  mutationFn: (v: TVars) => Promise<unknown>,
  toastKey: string,
  onSuccess?: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidateAll(queryClient);
      toast.success(txt(toastKey));
      onSuccess?.();
    },
  });
}

export function useCreateKhenThuongNhaTaiTro(onSuccess?: () => void) {
  return useKtntMutation(
    ({ data, idNguoiTao }: { data: KhenThuongNhaTaiTroFormValues; idNguoiTao: string }) =>
      createKhenThuongNhaTaiTro(data, idNguoiTao),
    'khenThuongNhaTaiTro.toast.create',
    onSuccess,
  );
}

export function useUpdateKhenThuongNhaTaiTro(onSuccess?: () => void) {
  return useKtntMutation(
    ({ id, data }: { id: string; data: KhenThuongNhaTaiTroFormValues }) =>
      updateKhenThuongNhaTaiTro(id, data),
    'khenThuongNhaTaiTro.toast.update',
    onSuccess,
  );
}

export function useUpdateKhenThuongNhaTaiTroTrangThai(onSuccess?: () => void) {
  return useKtntMutation(
    ({ id, data }: { id: string; data: KhenThuongNhaTaiTroStatusChangeValues }) =>
      updateKhenThuongNhaTaiTroTrangThai(id, data),
    'khenThuongNhaTaiTro.toast.statusChange',
    onSuccess,
  );
}

export function useDeleteKhenThuongNhaTaiTroMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteKhenThuongNhaTaiTroMany(ids),
    onSuccess: (_, ids) => {
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khenThuongNhaTaiTro.detail(id) });
      }
      invalidateAll(queryClient);
      toast.success(txt('khenThuongNhaTaiTro.toast.delete', { count: ids.length }));
    },
  });
}

export type { KhenThuongNhaTaiTro };
