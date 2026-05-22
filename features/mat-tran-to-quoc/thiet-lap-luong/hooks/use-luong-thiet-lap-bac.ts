import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { LuongThietLapBacFormValues } from '../core/schema';
import type { LuongThietLapBacRow } from '../core/types';
import {
  createLuongThietLapBac,
  deleteLuongThietLapBac,
  getLuongThietLapBacByNgach,
  updateLuongThietLapBac,
} from '../services/luong-thiet-lap-bac-service';

export function useLuongThietLapBacByNgach(ngachId: string | null, options?: { enabled?: boolean }) {
  const id = ngachId?.trim() ?? '';
  const enabled = Boolean(id) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.luongThietLapBac.byNgach(id || '__'),
    queryFn: () => getLuongThietLapBacByNgach(id),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

function sortBacRows(rows: LuongThietLapBacRow[]): LuongThietLapBacRow[] {
  return [...rows].sort((a, b) => (a.thu_tu !== b.thu_tu ? a.thu_tu - b.thu_tu : a.ma_bac.localeCompare(b.ma_bac)));
}

export function useCreateLuongThietLapBac(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { ngachId: string; data: LuongThietLapBacFormValues }) =>
      createLuongThietLapBac({
        ngach_id: input.ngachId,
        ma_bac: input.data.ma_bac,
        he_so: input.data.he_so,
        thu_tu: input.data.thu_tu,
      }),
    onSuccess: (created, { ngachId }) => {
      const key = queryKeys.luongThietLapBac.byNgach(ngachId.trim());
      queryClient.setQueryData<LuongThietLapBacRow[]>(key, (old) => {
        const base = old ?? [];
        return sortBacRows([...base.filter((r) => r.id !== created.id), created]);
      });
      toast.success(txt('matTranThietLapLuong.toast.bacCreate'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateLuongThietLapBac(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ngachId,
      data,
    }: {
      id: string;
      ngachId: string;
      data: Pick<LuongThietLapBacFormValues, 'he_so' | 'thu_tu'>;
    }) => updateLuongThietLapBac(id, { he_so: data.he_so, thu_tu: data.thu_tu }),
    onSuccess: (updated, { ngachId }) => {
      const key = queryKeys.luongThietLapBac.byNgach(ngachId.trim());
      queryClient.setQueryData<LuongThietLapBacRow[]>(key, (old) => {
        if (!old) return [updated];
        return sortBacRows(old.map((r) => (r.id === updated.id ? updated : r)));
      });
      toast.success(txt('matTranThietLapLuong.toast.bacUpdate'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteLuongThietLapBac() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ngachId }: { id: string; ngachId: string }) => {
      await deleteLuongThietLapBac(id);
      return { id, ngachId };
    },
    onSuccess: ({ id, ngachId }) => {
      const key = queryKeys.luongThietLapBac.byNgach(ngachId.trim());
      queryClient.setQueryData<LuongThietLapBacRow[]>(key, (old) => (old ?? []).filter((r) => r.id !== id));
      toast.success(txt('matTranThietLapLuong.toast.bacDelete'));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
