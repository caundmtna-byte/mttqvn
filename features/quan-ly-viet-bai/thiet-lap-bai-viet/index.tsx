import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import TabGroup from '@/components/ui/TabGroup';
import ArticleTheLoaiTabPanel from './components/article-the-loai-tab-panel';
import ArticleSettingsPageNav from './components/article-settings-page-nav';
import { ArticleKhacTrangListPanel } from './components/article-khac-trang-list-panel';
import { ArticleKhacNguonListPanel } from './components/article-khac-nguon-list-panel';
import { useThietLapKhacAll } from './hooks/use-thiet-lap-khac';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';

const TAB_THE_LOAI = 'the_loai';
const TAB_KHAC = 'thiet_lap_khac';

const ThietLapBaiVietPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'articleSettings');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('page.articleSettings.noViewPermission'));
    navigate('/quan-ly-viet-bai', { replace: true });
  }, [user, canView, navigate]);

  const [activeTab, setActiveTab] = useTabSearchParam(
    [TAB_THE_LOAI, TAB_KHAC] as const,
    TAB_THE_LOAI,
  );
  const { data: khacRows = [], isLoading: khacLoading } = useThietLapKhacAll({ enabled: canView });

  const trangDang = useMemo(() => khacRows.filter((r) => r.loai === 'trang_dang'), [khacRows]);
  const nguonDang = useMemo(() => khacRows.filter((r) => r.loai === 'nguon_dang'), [khacRows]);

  const tabs = [
    { id: TAB_THE_LOAI, label: txt('page.articleSettings.tabTheLoai') },
    { id: TAB_KHAC, label: txt('page.articleSettings.tabThietLapKhac') },
  ];

  const goBackModule = () => navigate('/quan-ly-viet-bai');

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
    <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />
  );

  return (
    <div className="flex flex-col h-page relative pb-6">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {activeTab === TAB_THE_LOAI ? (
          <ArticleTheLoaiTabPanel onPageBack={goBackModule} tabsSlot={tabsSlot} queriesEnabled={canView} />
        ) : (
          <>
            <ArticleSettingsPageNav onBack={goBackModule} tabsSlot={tabsSlot} />
            <div className="flex-1 min-h-0 overflow-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4 md:p-6 space-y-5 sm:space-y-8 md:space-y-10">
              <ArticleKhacTrangListPanel items={trangDang} isLoading={khacLoading} />
              <ArticleKhacNguonListPanel items={nguonDang} isLoading={khacLoading} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ThietLapBaiVietPage;
