import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import TabGroup from '@/components/ui/TabGroup';
import { MttqThietLapListPanel } from './components/mttq-thiet-lap-list-panel';
import { useMttqThietLapAll } from './hooks/use-mttq-thiet-lap';
import { MTTQ_THIET_LAP_LOAI, MTTQ_LOAI_TAB_LABEL_KEY, type MttqThietLapLoai } from './core/types';
import { useMttqThietLapListStore } from './store/useMttqThietLapListStore';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';

const ThietLapCaiDatPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranThietLapCaiDat');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('page.matTranThietLap.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [activeLoai, setActiveLoai] = useState<MttqThietLapLoai>('cap_quan_ly');
  const { data: allRowsRaw, isLoading } = useMttqThietLapAll({ enabled: canView });
  const store = useMttqThietLapListStore();

  const allRows = Array.isArray(allRowsRaw) ? allRowsRaw : [];
  const items = useMemo(() => allRows.filter((r) => r.loai === activeLoai), [allRows, activeLoai]);

  const { resetState } = store;

  useEffect(() => {
    resetState();
  }, [activeLoai, resetState]);

  const tabs = useMemo(
    () =>
      MTTQ_THIET_LAP_LOAI.map((id) => ({
        id,
        label: txt(MTTQ_LOAI_TAB_LABEL_KEY[id]),
      })),
    [],
  );

  const goBack = () => navigate('/mat-tran-to-quoc');

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
      onChange={(id) => setActiveLoai(id as MttqThietLapLoai)}
      className="shrink-0"
    />
  );

  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqThietLapListPanel
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

export default ThietLapCaiDatPage;
