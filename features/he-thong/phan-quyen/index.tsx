import React from 'react';

import PermissionMatrix from './components/permission-matrix';
import { useRoles } from './hooks/use-phan-quyen';

const SecurityPage: React.FC = () => {
    const { data: roles = [], isLoading: isLoadingRoles } = useRoles();

    return (
        <div className="flex flex-col h-[calc(100dvh-3.75rem)] md:h-[calc(100dvh-4.5rem)]">
            <div className="flex-1 min-h-0 mt-1.5">
                <PermissionMatrix
                    roles={roles}
                    isLoading={isLoadingRoles}
                />
            </div>
        </div>
    );
};

export default SecurityPage;
