import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import {
  getPbxhThietLapAll,
  createPbxhThietLap,
  updatePbxhThietLap,
  deletePbxhThietLap,
} from '../services/pbxh-thiet-lap-service';
import type { PbxhThietLapFormValues } from '../core/schema';

const qk = queryKeys.pbxhThietLap.all;

export const usePbxhThietLapAll = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: qk,
    queryFn: getPbxhThietLapAll,
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });

export const useCreatePbxhThietLap = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPbxhThietLap,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('page.pbxhThietLap.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdatePbxhThietLap = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PbxhThietLapFormValues }) => updatePbxhThietLap(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('page.pbxhThietLap.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeletePbxhThietLap = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePbxhThietLap,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('page.pbxhThietLap.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
