import type { AppResource } from '@/lib/permissions';
import { useCan } from '@/hooks/use-can';

/** Gom `useCan` theo resource — tái render khi hydrate matrix. */
export function useResourcePermissions(resource: AppResource) {
  const canView = useCan('view', resource);
  const canCreate = useCan('create', resource);
  const canEdit = useCan('edit', resource);
  const canDelete = useCan('delete', resource);
  const canExport = useCan('export', resource);
  const canImport = useCan('import', resource);
  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canImport,
  };
}
