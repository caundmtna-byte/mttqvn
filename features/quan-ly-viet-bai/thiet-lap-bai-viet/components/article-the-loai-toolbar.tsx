import React, { useMemo } from 'react';
import { Plus, Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { txt } from '@/lib/text';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import { BTN_ADD } from '@/lib/button-labels';
import { useArticleTheLoaiStore } from '../store/useArticleTheLoaiStore';
import { countTheLoaiColumnSearchActive } from '../utils/column-search-the-loai';

interface Props {
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
}

const ArticleTheLoaiToolbar: React.FC<Props> = ({ onAdd, onExport, onDeleteMany, onPageBack, tabsSlot }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('articleSettings');

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
  } = useArticleTheLoaiStore();

  const activeFilterCount = useMemo(() => {
    const colN = countTheLoaiColumnSearchActive(filters.columnSearch);
    return (searchTerm ? 1 : 0) + colN;
  }, [searchTerm, filters.columnSearch]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
  };

  const mobileActions = useMemo(
    () =>
      canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : [],
    [canExport, onExport],
  );

  const renderActions = (
    <>
      {canExport && (
        <div className="hidden sm:flex items-center gap-2">
          <Tooltip content={txt('common.export')} placement="bottom">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
            >
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip>
        </div>
      )}
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{BTN_ADD()}</span>
        </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('common.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      desktopStartSlot={tabsSlot}
    />
  );
};

export default ArticleTheLoaiToolbar;
