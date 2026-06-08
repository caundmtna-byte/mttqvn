import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions, masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { NhapXuatKhoFormValues } from '../core/schema';
import type { NhapXuatKhoCtFlatRow, NhapXuatKhoDetail, NhapXuatKhoListRow } from '../core/types';
import {
  createNhapXuatKho,
  deleteNhapXuatKhoMany,
  getKhoTonKhoByKho,
  getLastDonGiaMap,
  getNhapXuatKhoById,
  getNhapXuatKhoCtFlatList,
  getNhapXuatKhoList,
  updateNhapXuatKho,
} from '../services/kho-nhap-xuat-kho-service';

const listKey = queryKeys.khoNhapXuatKho.all;
const ctFlatKey = queryKeys.khoNhapXuatKho.chiTietFlatList;
const lastDonGiaKey = queryKeys.khoNhapXuatKho.lastDonGia;

export function useNhapXuatKhoList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getNhapXuatKhoList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useNhapXuatKhoDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.khoNhapXuatKho.detail(id?.trim() ?? '__'),
    queryFn: () => getNhapXuatKhoById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useNhapXuatKhoCtFlatList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ctFlatKey,
    queryFn: getNhapXuatKhoCtFlatList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useTonKhoByKho(khoId: string | null, options?: { enabled?: boolean }) {
  const id = (khoId ?? '').trim();
  const enabled = Boolean(id) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.khoNhapXuatKho.tonKhoByKho(id || '__'),
    queryFn: () => getKhoTonKhoByKho(id),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useLastDonGiaMap(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: lastDonGiaKey,
    queryFn: getLastDonGiaMap,
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });
}

function listRowFromDetail(d: NhapXuatKhoDetail): NhapXuatKhoListRow {
  return {
    id: d.id,
    tt: d.tt,
    so_phieu: d.so_phieu,
    loai_phieu: d.loai_phieu,
    ngay_phieu: d.ngay_phieu,
    kho_xuat_id: d.kho_xuat_id,
    ten_kho_xuat: d.ten_kho_xuat,
    kho_nhap_id: d.kho_nhap_id,
    ten_kho_nhap: d.ten_kho_nhap,
    don_vi_cuu_tro_id: d.don_vi_cuu_tro_id,
    ten_don_vi_cuu_tro: d.ten_don_vi_cuu_tro,
    dot_cuu_tro_id: d.dot_cuu_tro_id,
    ten_dot_cuu_tro: d.ten_dot_cuu_tro,
    so_dong: d.so_dong,
    tg_tao: d.tg_tao,
    tg_cap_nhat: d.tg_cap_nhat,
  };
}

function patchListAfterMutation(
  queryClient: ReturnType<typeof useQueryClient>,
  full: NhapXuatKhoDetail,
  mode: 'create' | 'update',
) {
  const listRow = listRowFromDetail(full);
  queryClient.setQueryData<NhapXuatKhoListRow[]>(listKey, (old) => {
    if (!old) return [listRow];
    if (mode === 'create') return [listRow, ...old];
    return old.map((r) => (r.id === listRow.id ? listRow : r));
  });
  queryClient.setQueryData<NhapXuatKhoDetail>(queryKeys.khoNhapXuatKho.detail(full.id), full);
  void queryClient.invalidateQueries({ queryKey: ctFlatKey, refetchType: 'none' });
  void queryClient.invalidateQueries({ queryKey: lastDonGiaKey, refetchType: 'none' });
  void queryClient.invalidateQueries({
    queryKey: ['kho-nhap-xuat-kho', 'ton-kho-by-kho'],
    refetchType: 'active',
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.khoTonKho.all, refetchType: 'active' });
  void queryClient.invalidateQueries({ queryKey: queryKeys.khoBaoCaoHoTro.all, refetchType: 'none' });
}

export function useCreateNhapXuatKho(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NhapXuatKhoFormValues) => createNhapXuatKho(data),
    onSuccess: (created) => {
      patchListAfterMutation(queryClient, created, 'create');
      toast.success(txt('matTranNhapXuatKho.toast.create'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateNhapXuatKho(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NhapXuatKhoFormValues }) => updateNhapXuatKho(id, data),
    onSuccess: (updated) => {
      patchListAfterMutation(queryClient, updated, 'update');
      toast.success(txt('matTranNhapXuatKho.toast.update'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteNhapXuatKhoMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteNhapXuatKhoMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<NhapXuatKhoListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<NhapXuatKhoListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khoNhapXuatKho.detail(id) });
      }
      const prevCt = queryClient.getQueryData<NhapXuatKhoCtFlatRow[]>(ctFlatKey);
      if (prevCt) {
        const set = new Set(ids);
        queryClient.setQueryData<NhapXuatKhoCtFlatRow[]>(
          ctFlatKey,
          prevCt.filter((l) => !set.has(l.phieu_id)),
        );
      }
      void queryClient.invalidateQueries({
        queryKey: ['kho-nhap-xuat-kho', 'ton-kho-by-kho'],
        refetchType: 'active',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoTonKho.all, refetchType: 'active' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoBaoCaoHoTro.all, refetchType: 'none' });
      toast.success(txt('matTranNhapXuatKho.toast.delete', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
