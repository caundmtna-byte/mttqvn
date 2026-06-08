import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import TabGroup from '@/components/ui/TabGroup';
import { PbxhThietLapListPanel } from './components/pbxh-thiet-lap-list-panel';
import { usePbxhThietLapAll } from './hooks/use-pbxh-thiet-lap';
import { PBXH_THIET_LAP_LOAI, PBXH_LOAI_TAB_LABEL_KEY, type PbxhThietLapLoai } from './core/types';
import { usePbxhThietLapStore } from './store/usePbxhThietLapStore';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';

const ThietLapDanhMucPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'phanBienThietLapDanhMuc');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('pbxhThietLap.noViewPermission'));
    navigate('/phan-bien-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const [activeLoai, setActiveLoai] = useTabSearchParam(PBXH_THIET_LAP_LOAI, 'doi_tuong');
  const { data: allRowsRaw, isLoading } = usePbxhThietLapAll({ enabled: canView });
  const store = usePbxhThietLapStore();

  const allRows = Array.isArray(allRowsRaw) ? allRowsRaw : [];
  const items = useMemo(() => allRows.filter((r) => r.loai === activeLoai), [allRows, activeLoai]);

  const { resetState } = store;

  useEffect(() => {
    resetState();
  }, [activeLoai, resetState]);

  const tabs = useMemo(
    () =>
      PBXH_THIET_LAP_LOAI.map((id) => ({
        id,
        label: txt(PBXH_LOAI_TAB_LABEL_KEY[id]),
      })),
    [],
  );

  const goBack = () => navigate('/phan-bien-xa-hoi');

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

  const tabsSlot = (
    <TabGroup
      tabs={tabs}
      activeTab={activeLoai}
      onChange={(id) => setActiveLoai(id as PbxhThietLapLoai)}
      className="shrink-0"
    />
  );

  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <PbxhThietLapListPanel
          loai={activeLoai}
          items={items}
          isLoading={isLoading}
          store={store}
          tabGroup={tabsSlot}
          onPageBack={goBack}
        />
      </div>
    </div>
  );
};

export default ThietLapDanhMucPage;
