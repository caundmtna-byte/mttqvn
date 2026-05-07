import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { txt } from '@/lib/text';
import { getErrorMessage } from '@/lib/utils';
import type { TinhThanh } from '../core/types';
import type { TinhThanhFormValues, XaPhuongFormValues } from '../core/schema';
import {
  getTinhThanhList,
  getXaPhuongByTinhThanh,
  getXaPhuongAll,
  createTinhThanh,
  updateTinhThanh,
  deleteTinhThanhMany,
  createXaPhuong,
  updateXaPhuong,
  deleteXaPhuongMany,
  importTinhThanhRows,
  importXaPhuongRows,
} from '../services/dia-ban-service';

const tinhKey = queryKeys.tinhThanh.all;

export function useTinhThanhList() {
  return useQuery({
    queryKey: tinhKey,
    queryFn: getTinhThanhList,
    ...masterDataQueryOptions,
  });
}

export function useXaPhuongByTinhThanh(idTinhThanh: string | null) {
  const id = idTinhThanh?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.xaPhuong.byTinh(id),
    queryFn: () => getXaPhuongByTinhThanh(id),
    enabled: id.length > 0,
    ...masterDataQueryOptions,
  });
}

/** Tab xã: `tinhFilterId` rỗng = tải toàn bộ; có id = theo tỉnh. */
export function useXaPhuongForTab(tabIsXa: boolean, tinhFilterId: string) {
  const tid = tinhFilterId.trim();
  const allMode = tabIsXa && tid.length === 0;
  const oneMode = tabIsXa && tid.length > 0;
  return useQuery({
    queryKey: allMode ? queryKeys.xaPhuong.listAll : queryKeys.xaPhuong.byTinh(tid),
    queryFn: () => (allMode ? getXaPhuongAll() : getXaPhuongByTinhThanh(tid)),
    enabled: allMode || oneMode,
    ...masterDataQueryOptions,
  });
}

function invalidateTinh(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: tinhKey });
}

function invalidateXaAllQueries(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: queryKeys.xaPhuong.all });
}

export function useCreateTinhThanh(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTinhThanh,
    onSuccess: () => {
      invalidateTinh(queryClient);
      toast.success(txt('diaBan.toast.createTinhSuccess'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateTinhThanh(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TinhThanhFormValues }) => updateTinhThanh(id, data),
    onSuccess: () => {
      invalidateTinh(queryClient);
      toast.success(txt('diaBan.toast.updateTinhSuccess'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteTinhThanh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteTinhThanhMany(ids),
    onSuccess: (_, ids) => {
      invalidateTinh(queryClient);
      invalidateXaAllQueries(queryClient);
      for (const id of ids) {
        void queryClient.removeQueries({ queryKey: queryKeys.xaPhuong.byTinh(id) });
      }
      toast.success(txt('diaBan.toast.deleteTinhSuccess', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useCreateXaPhuong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createXaPhuong,
    onSuccess: () => {
      invalidateXaAllQueries(queryClient);
      invalidateTinh(queryClient);
      toast.success(txt('diaBan.toast.createXaSuccess'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateXaPhuong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: XaPhuongFormValues }) => updateXaPhuong(id, data),
    onSuccess: () => {
      invalidateXaAllQueries(queryClient);
      invalidateTinh(queryClient);
      toast.success(txt('diaBan.toast.updateXaSuccess'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteXaPhuong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }: { ids: string[] }) => deleteXaPhuongMany(ids),
    onSuccess: (_, { ids }) => {
      invalidateXaAllQueries(queryClient);
      invalidateTinh(queryClient);
      toast.success(txt('diaBan.toast.deleteXaSuccess', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useImportTinhThanhRows(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importTinhThanhRows,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: tinhKey });
      if (result.created > 0) {
        toast.success(txt('diaBan.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 5).join('; '));
      }
      onDone?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useImportXaPhuongRows(onDone?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { rows: Record<string, unknown>[]; tinhList: TinhThanh[] }) =>
      importXaPhuongRows(args.rows, args.tinhList),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: tinhKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.xaPhuong.all });
      if (result.created > 0) {
        toast.success(txt('diaBan.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 5).join('; '));
      }
      onDone?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
