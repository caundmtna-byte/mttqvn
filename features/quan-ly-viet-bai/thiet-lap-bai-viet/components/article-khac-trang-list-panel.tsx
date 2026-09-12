import React from 'react';
import { txt } from '@/lib/text';
import type { BaiVietThietLapKhac } from '../core/types';
import { useKhacTrangStore } from '../store/useKhacTrangStore';
import { ArticleKhacListPanelInner } from './article-khac-list-panel';

export function ArticleKhacTrangListPanel({
  items,
  isLoading,
  isError,
  onRetry,
}: {
  items: BaiVietThietLapKhac[];
  isLoading: boolean;
  /** Query danh sách lỗi — bảng hiện thông báo lỗi + nút Thử lại. */
  isError?: boolean;
  onRetry?: () => void;
}) {
  const store = useKhacTrangStore();
  return (
    <ArticleKhacListPanelInner
      titleKey="page.articleSettings.sectionTrangDang"
      sectionLabel={txt('page.articleSettings.sectionTrangDang')}
      loai="trang_dang"
      items={items}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      store={store}
      exportFileName="Thiet_Lap_Trang_Dang"
    />
  );
}
