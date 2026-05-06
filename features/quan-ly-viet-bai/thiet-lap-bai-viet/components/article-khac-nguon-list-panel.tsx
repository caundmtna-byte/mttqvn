import React from 'react';
import { txt } from '@/lib/text';
import type { BaiVietThietLapKhac } from '../core/types';
import { useKhacNguonStore } from '../store/useKhacNguonStore';
import { ArticleKhacListPanelInner } from './article-khac-list-panel';

export function ArticleKhacNguonListPanel({
  items,
  isLoading,
}: {
  items: BaiVietThietLapKhac[];
  isLoading: boolean;
}) {
  const store = useKhacNguonStore();
  return (
    <ArticleKhacListPanelInner
      titleKey="page.articleSettings.sectionNguonDang"
      sectionLabel={txt('page.articleSettings.sectionNguonDang')}
      loai="nguon_dang"
      items={items}
      isLoading={isLoading}
      store={store}
      exportFileName="Thiet_Lap_Nguon_Dang"
    />
  );
}
