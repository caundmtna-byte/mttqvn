import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import {
  getMttqThietLapAll,
  createMttqThietLap,
  updateMttqThietLap,
  deleteMttqThietLap,
} from '../services/mttq-thiet-lap-service';
import type { MttqThietLapFormValues } from '../core/schema';
import type { MttqThietLap } from '../core/types';

const qk = queryKeys.mttqThietLap.all;

export const useMttqThietLapAll = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: qk,
    queryFn: getMttqThietLapAll,
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });

export const useCreateMttqThietLap = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMttqThietLap,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('page.matTranThietLap.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateMttqThietLap = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqThietLapFormValues }) => updateMttqThietLap(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<MttqThietLap[]>(qk, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      void queryClient.invalidateQueries({ queryKey: qk, refetchType: 'none' });
      toast.success(txt('page.matTranThietLap.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteMttqThietLap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqThietLap,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('page.matTranThietLap.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
