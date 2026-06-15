import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Package, BarChart3 } from 'lucide-react';
import TabGroup from '@/components/ui/TabGroup';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import { txt } from '@/lib/text';
import { TON_KHO_TABS } from './core/constants';
import TonSanPhamTab from './components/ton-san-pham-tab';
import BaoCaoNxtKySection from './components/bao-cao-nxt-ky-section';

const TonKhoPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefInventory');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(
    user &&
      (user.role === 'admin' || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    user != null &&
    user.role !== 'admin' &&
    chucVuKey.trim() !== '' &&
    !matrixActive;

  const [activeTab, setActiveTab] = useTabSearchParam(TON_KHO_TABS, 'byProduct');

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranTonKho.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const handleBack = () => navigate('/mat-tran-to-quoc');

  const tabs = useMemo(
    () => [
      { id: 'byProduct', label: txt('matTranTonKho.tabs.byProduct'), icon: Package },
      { id: 'baoCaoNXT', label: txt('matTranTonKho.tabs.baoCaoNXT'), icon: BarChart3 },
    ],
    []
  );

  if (!canView) return null;

  return (
    <div className="flex flex-col h-[calc(100dvh-3.75rem)] md:h-[calc(100dvh-4.5rem)] relative">
      <div className="shrink-0 relative z-0 px-1">
        <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col px-1 pb-1">
        {activeTab === 'byProduct' && (
          <TonSanPhamTab
            onBack={handleBack}
            listQueryEnabled={listQueryEnabled}
            waitingMatrixHydrate={waitingMatrixHydrate}
          />
        )}
        {activeTab === 'baoCaoNXT' && (
          <BaoCaoNxtKySection
            onBack={handleBack}
            listQueryEnabled={listQueryEnabled}
          />
        )}
      </div>
    </div>
  );
};

export default TonKhoPage;
