import React from 'react';
import GenericToolbar from '@/components/shared/GenericToolbar';

/**
 * Hàng Back + TabGroup cho trang có nhiều tab nhưng nội dung tab không dùng GenericToolbar list (vd. tab Khác).
 * Đồng bộ với tab Thể loại: cùng component GenericToolbar, hideSearch.
 */
interface Props {
  onBack: () => void;
  tabsSlot: React.ReactNode;
}

const ArticleSettingsPageNav: React.FC<Props> = ({ onBack, tabsSlot }) => (
  <GenericToolbar
    selectedCount={0}
    searchTerm=""
    onSearchChange={() => {}}
    onClearSelection={() => {}}
    showBack
    onBack={onBack}
    hideSearch
    desktopStartSlot={tabsSlot}
  />
);

export default ArticleSettingsPageNav;
