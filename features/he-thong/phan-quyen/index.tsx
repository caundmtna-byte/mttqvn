import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '../../../lib/text';
import { useAuthStore } from '../../../store/useStore';
import { useCan } from '@/hooks/use-can';

import PermissionMatrix from './components/permission-matrix';
import { useRoles } from './hooks/use-phan-quyen';

const SecurityPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'permissions');
  const navigate = useNavigate();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('permission.noViewPermission'));
    navigate('/he-thong', { replace: true });
  }, [user, canView, navigate]);

  const { data: roles = [], isLoading: isLoadingRoles } = useRoles({ enabled: canView });

  if (!canView) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy="true"
        aria-label={txt('common.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.75rem)] md:h-[calc(100dvh-4.5rem)]">
      <div className="flex-1 min-h-0 mt-1.5">
        <PermissionMatrix roles={roles} isLoading={isLoadingRoles} />
      </div>
    </div>
  );
};

export default SecurityPage;
