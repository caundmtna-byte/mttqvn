import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoles, createRole, deleteRoles, updateModulePermissions } from '../services/phan-quyen-service';
import { RoleFormValues } from '../core/schema';
import { ModulePermission, PositionPermission, type ActionType } from '../core/types';
import { toast } from 'sonner';
import { txt } from '../../../../lib/text';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';

const rolesQueryKey = queryKeys.roles.all;

export const useRoles = () => {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: getRoles,
    ...masterDataQueryOptions,
  });
};

export const useCreateRole = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      permissions,
    }: {
      data: RoleFormValues;
      permissions: ModulePermission[];
    }) => createRole(data, permissions),
    onSuccess: (created) => {
      queryClient.setQueryData<PositionPermission[]>(rolesQueryKey, (old) =>
        old ? [...old, created] : [created],
      );
      toast.success(txt('permission.toast.createSuccess'));
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
};

export const useDeleteRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteRoles(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<PositionPermission[]>(rolesQueryKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      toast.success(txt('permission.toast.deleteSuccess'));
    },
  });
};

export const useUpdateModulePermissions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleId,
      updates,
    }: {
      moduleId: string;
      updates: { roleId: string; actions: ActionType[] }[];
    }) => updateModulePermissions(moduleId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey });
      toast.success(txt('permission.toast.updateSuccess'));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
};
