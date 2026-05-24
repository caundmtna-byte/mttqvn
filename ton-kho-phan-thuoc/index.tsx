import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Package, BarChart3 } from 'lucide-react';
import TabGroup from '../../../components/ui/TabGroup';
import TonSanPhamPTTab from './components/TonSanPhamPTTab';
import BaoCaoNXTKyPTSection from './components/BaoCaoNXTKyPTSection';
import { useTonKhoPTStore } from './store/useTonKhoPTStore';

const VALID_TABS = ['byProduct', 'baoCaoNXT'] as const;
type TabId = (typeof VALID_TABS)[number];

function normalizeTabParam(raw: string | null): TabId | null {
  if (raw === 'tonSanPham' || raw === 'byProduct' || raw === 'list' || raw === 'tonKho') return 'byProduct';
  if (raw === 'baoCaoNXT' || raw === 'stats' || raw === 'chiTiet') return 'baoCaoNXT';
  if (VALID_TABS.includes(raw as TabId)) return raw as TabId;
  return null;
}

const TonKhoPhanThuocPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('byProduct');
  const setStoreTab = useTonKhoPTStore((s) => s.setActiveTab);

  const tabFromUrl = normalizeTabParam(searchParams.get('tab'));
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
      setStoreTab(tabFromUrl);
    }
  }, [tabFromUrl, setStoreTab]);

  const handleTabChange = (id: string) => {
    if (!VALID_TABS.includes(id as TabId)) return;
    setActiveTab(id as TabId);
    setStoreTab(id as TabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });
  };

  const tabs = useMemo(
    () => [
      { id: 'byProduct', label: t('tonKhoPhanThuoc.tabs.byProduct'), icon: Package },
      { id: 'baoCaoNXT', label: t('tonKhoPhanThuoc.tabs.baoCaoNXT'), icon: BarChart3 },
    ],
    [t]
  );

  return (
    <div className="flex flex-col h-[calc(100dvh-3.75rem)] md:h-[calc(100dvh-4.5rem)] relative">
      <div className="shrink-0 relative z-0">
        <TabGroup tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />
      </div>
      <div className="flex-1 min-h-0 flex flex-col mt-1.5">
        {activeTab === 'byProduct' && <TonSanPhamPTTab />}
        {activeTab === 'baoCaoNXT' && <BaoCaoNXTKyPTSection />}
      </div>
    </div>
  );
};

export default TonKhoPhanThuocPage;
