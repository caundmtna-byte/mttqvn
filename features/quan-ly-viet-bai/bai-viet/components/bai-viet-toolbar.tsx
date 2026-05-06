import React, { useMemo } from 'react';
import { Plus, Download } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import { useBaiVietDanhSachStore } from '../store/useBaiVietDanhSachStore';
import { countBaiVietColumnSearchActive } from '../utils/column-search-count';

interface Props {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const BaiVietToolbar: React.FC<Props> = ({ onPageBack, tabsSlot, onAdd, onExport, onDeleteMany }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('articles');

  const {
    searchTerm,
    setSearchTerm,
    filters,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
  } = useBaiVietDanhSachStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    return (searchTerm ? 1 : 0) + countBaiVietColumnSearchActive(filters.columnSearch);
  }, [searchTerm, filters.columnSearch]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useBaiVietDanhSachStore.getState().setFilter('columnSearch', {});
  };

  const renderActions = (
    <>
      <div className="hidden sm:flex items-center gap-2">
        {canExport && (
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
        )}
      </div>
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{txt('common.addNew')}</span>
        </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
      selectedCount={selectedCount}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
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

export default BaiVietToolbar;
