import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { txt } from '@/lib/text';
import TabGroup from '@/components/ui/TabGroup';
import ArticleTheLoaiTabPanel from './components/article-the-loai-tab-panel';
import ArticleSettingsPageNav from './components/article-settings-page-nav';
import { ArticleKhacTrangListPanel } from './components/article-khac-trang-list-panel';
import { ArticleKhacNguonListPanel } from './components/article-khac-nguon-list-panel';
import { useThietLapKhacAll } from './hooks/use-thiet-lap-khac';

const TAB_THE_LOAI = 'the_loai';
const TAB_KHAC = 'thiet_lap_khac';

const ThietLapBaiVietPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TAB_THE_LOAI);
  const { data: khacRows = [], isLoading: khacLoading } = useThietLapKhacAll();

  const trangDang = useMemo(() => khacRows.filter((r) => r.loai === 'trang_dang'), [khacRows]);
  const nguonDang = useMemo(() => khacRows.filter((r) => r.loai === 'nguon_dang'), [khacRows]);

  const tabs = [
    { id: TAB_THE_LOAI, label: txt('page.articleSettings.tabTheLoai') },
    { id: TAB_KHAC, label: txt('page.articleSettings.tabThietLapKhac') },
  ];

  const goBackModule = () => navigate('/quan-ly-viet-bai');

  const tabsSlot = (
    <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />
  );

  return (
    <div className="flex flex-col h-page relative pb-6">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {activeTab === TAB_THE_LOAI ? (
          <ArticleTheLoaiTabPanel onPageBack={goBackModule} tabsSlot={tabsSlot} />
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
