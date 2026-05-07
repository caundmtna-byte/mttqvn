import React, { useMemo } from 'react';
import { Plus, Download, FolderOpen } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useBaiVietDanhSachStore } from '../store/useBaiVietDanhSachStore';
import { countBaiVietColumnSearchActive } from '../utils/column-search-count';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  theLoaiOptions: ChipOption[];
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const BaiVietToolbar: React.FC<Props> = ({ onPageBack, tabsSlot, theLoaiOptions, onAdd, onExport, onDeleteMany }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('articles');

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
  } = useBaiVietDanhSachStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countBaiVietColumnSearchActive(filters.columnSearch, filters.id_the_loai) +
      (filters.id_the_loai.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    const st = useBaiVietDanhSachStore.getState();
    st.setFilter('columnSearch', {});
    st.setFilter('id_the_loai', []);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={theLoaiOptions}
          value={filters.id_the_loai}
          onChange={(val) => setFilter('id_the_loai', val)}
          placeholder={txt('articleList.store.theLoaiCol')}
          icon={FolderOpen}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,30vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [theLoaiOptions, filters.id_the_loai, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'id_the_loai',
        label: txt('articleList.store.theLoaiCol'),
        icon: FolderOpen,
        options: theLoaiOptions,
        value: filters.id_the_loai,
        onChange: (val: string[]) => setFilter('id_the_loai', val),
      },
    ],
    [theLoaiOptions, filters.id_the_loai, setFilter],
  );

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
      filters={filtersSlot}
      filterGroups={filterGroups}
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
