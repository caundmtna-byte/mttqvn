import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import {
  getPositions,
  createPosition,
  updatePosition,
  deletePositions,
  updatePositionStatus,
  importPositions,
} from "../services/chuc-vu-service";
import { PositionFormValues } from "../core/schema";
import type { Position } from '../core/types';
import { toast } from "sonner";
import { txt } from '../../../../lib/text';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';

const positionsQueryKey = queryKeys.positions.all;

export const usePositions = () => {
  return useQuery({
    queryKey: positionsQueryKey,
    queryFn: getPositions,
    ...masterDataQueryOptions,
  });
};

export const useCreatePosition = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPosition,
    onSuccess: (created) => {
      queryClient.setQueryData<Position[]>(positionsQueryKey, (old) =>
        old ? [...old, created].sort((a, b) => a.thu_tu - b.thu_tu) : [created],
      );
      toast.success(txt('position.toast.createSuccess'));
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => toast.error(`Lỗi: ${getErrorMessage(err)}`)
  });
};

export const useUpdatePosition = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: PositionFormValues }) => updatePosition(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Position[]>(positionsQueryKey, (old) =>
        old?.map((p) => (p.id === updated.id ? updated : p)),
      );
      toast.success(txt('position.toast.updateSuccess'));
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => toast.error(`Lỗi: ${getErrorMessage(err)}`)
  });
};

export const useUpdateStatusPosition = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ ids, status }: { ids: string[], status: TrangThaiHoatDong }) => updatePositionStatus(ids, status),
      onSuccess: (_, variables) => {
        queryClient.setQueryData<Position[]>(positionsQueryKey, (old) =>
          old?.map((p) =>
            variables.ids.includes(p.id) ? { ...p, trang_thai: variables.status } : p,
          ),
        );
        toast.success(txt('position.toast.statusUpdate', { count: variables.ids.length }));
      },
      onError: (err: unknown) => toast.error(`Lỗi: ${getErrorMessage(err)}`)
    });
};

export const useDeletePosition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deletePositions(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<Position[]>(positionsQueryKey, (old) =>
        old?.filter((p) => !ids.includes(p.id)),
      );
      toast.success(txt('position.toast.deleteSuccess', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err))
  });
};

export const useImportPositions = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importPositions,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: positionsQueryKey });
      if (result.created > 0) {
        toast.success(txt('position.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
};
