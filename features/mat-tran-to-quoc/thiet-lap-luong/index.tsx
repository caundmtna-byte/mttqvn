import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import TabGroup from '@/components/ui/TabGroup';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';
import LuongNgachTabPanel from './components/luong-ngach-tab-panel';
import LuongBacTabPanel from './components/luong-bac-tab-panel';

const TAB_NGACH = 'ngach_luong';
const TAB_BAC = 'bac_luong';

const ThietLapLuongPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranSalarySetup');
  const matrixEnabled = isPermissionMatrixEnabled();
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    matrixEnabled && user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && !matrixActive;

  const listQueryEnabled = Boolean(
    user && (user.role === 'admin' || !matrixEnabled || (matrixActive && canView)),
  );

  useEffect(() => {
    if (!user || canView || didRedirect.current || waitingMatrixHydrate) return;
    didRedirect.current = true;
    toast.error(txt('matTranThietLapLuong.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate, waitingMatrixHydrate]);

  const [activeTab, setActiveTab] = useTabSearchParam([TAB_NGACH, TAB_BAC] as const, TAB_NGACH);

  const tabs = [
    { id: TAB_NGACH, label: txt('matTranThietLapLuong.tabNgach') },
    { id: TAB_BAC, label: txt('matTranThietLapLuong.tabBac') },
  ];

  const tabsSlot = <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />;

  const goBackModule = () => navigate('/mat-tran-to-quoc');

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
    <div className="flex flex-col h-page relative pb-6">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {activeTab === TAB_NGACH ? (
          <LuongNgachTabPanel
            onPageBack={goBackModule}
            tabsSlot={tabsSlot}
            listQueryEnabled={listQueryEnabled}
            waitingMatrixHydrate={waitingMatrixHydrate}
          />
        ) : (
          <LuongBacTabPanel onPageBack={goBackModule} tabsSlot={tabsSlot} listQueryEnabled={listQueryEnabled} />
        )}
      </div>
    </div>
  );
};

export default ThietLapLuongPage;
