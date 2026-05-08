import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import {
  getThietLapKhacAll,
  createThietLapKhac,
  updateThietLapKhac,
  deleteThietLapKhac,
} from '../services/thiet-lap-khac-service';
import type { ThietLapKhacFormValues } from '../core/schema';

const qk = queryKeys.baiVietThietLapKhac.all;

export const useThietLapKhacAll = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: qk,
    queryFn: getThietLapKhacAll,
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });

export const useCreateThietLapKhac = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createThietLapKhac,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('articleSettings.toast.khacCreate'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateThietLapKhac = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThietLapKhacFormValues }) => updateThietLapKhac(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('articleSettings.toast.khacUpdate'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteThietLapKhac = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteThietLapKhac,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: qk });
      toast.success(txt('articleSettings.toast.khacDelete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
