import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { txt } from '@/lib/text';
import TabGroup from '@/components/ui/TabGroup';
import { MttqThietLapListPanel } from './components/mttq-thiet-lap-list-panel';
import { useMttqThietLapAll } from './hooks/use-mttq-thiet-lap';
import { MTTQ_THIET_LAP_LOAI, MTTQ_LOAI_TAB_LABEL_KEY, type MttqThietLapLoai } from './core/types';
import { useMttqThietLapListStore } from './store/useMttqThietLapListStore';

const ThietLapCaiDatPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeLoai, setActiveLoai] = useState<MttqThietLapLoai>('cap_quan_ly');
  const { data: allRowsRaw, isLoading } = useMttqThietLapAll();
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
