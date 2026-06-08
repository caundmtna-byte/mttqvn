import React, { useMemo } from 'react';
import { Plus, Download, Tag, ListOrdered, Target } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useCongViecDanhSachStore } from '../store/useCongViecDanhSachStore';
import { countCongViecColumnSearchActive } from '../utils/column-search-count';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  trangThaiOptions: ChipOption[];
  mucDoOptions: ChipOption[];
  chuongTrinhOptions: ChipOption[];
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const CongViecToolbar: React.FC<Props> = ({
  onPageBack,
  tabsSlot,
  trangThaiOptions,
  mucDoOptions,
  chuongTrinhOptions,
  onAdd,
  onExport,
  onDeleteMany,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('tasks');

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
  } = useCongViecDanhSachStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countCongViecColumnSearchActive(filters.columnSearch) +
      (filters.trang_thai.length > 0 ? 1 : 0) +
      (filters.muc_do.length > 0 ? 1 : 0) +
      (filters.id_chuong_trinh.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    const st = useCongViecDanhSachStore.getState();
    st.setFilter('columnSearch', {});
    st.setFilter('trang_thai', []);
    st.setFilter('muc_do', []);
    st.setFilter('id_chuong_trinh', []);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai}
          onChange={(val) => setFilter('trang_thai', val)}
          placeholder={txt('taskList.store.trangThaiCol')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={mucDoOptions}
          value={filters.muc_do}
          onChange={(val) => setFilter('muc_do', val)}
          placeholder={txt('taskList.store.mucDoCol')}
          icon={ListOrdered}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,24vw)] sm:max-w-[220px]"
        />
        <FilterChipMultiSelect
          options={chuongTrinhOptions}
          value={filters.id_chuong_trinh}
          onChange={(val) => setFilter('id_chuong_trinh', val)}
          placeholder={txt('taskList.filterChuongTrinh')}
          icon={Target}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
      </div>
    ),
    [chuongTrinhOptions, trangThaiOptions, mucDoOptions, filters.id_chuong_trinh, filters.trang_thai, filters.muc_do, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai',
        label: txt('taskList.store.trangThaiCol'),
        icon: Tag,
        options: trangThaiOptions,
        value: filters.trang_thai,
        onChange: (val: string[]) => setFilter('trang_thai', val),
      },
      {
        key: 'muc_do',
        label: txt('taskList.store.mucDoCol'),
        icon: ListOrdered,
        options: mucDoOptions,
        value: filters.muc_do,
        onChange: (val: string[]) => setFilter('muc_do', val),
      },
      {
        key: 'id_chuong_trinh',
        label: txt('taskList.filterChuongTrinh'),
        icon: Target,
        options: chuongTrinhOptions,
        value: filters.id_chuong_trinh,
        onChange: (val: string[]) => setFilter('id_chuong_trinh', val),
      },
    ],
    [chuongTrinhOptions, trangThaiOptions, mucDoOptions, filters.id_chuong_trinh, filters.trang_thai, filters.muc_do, setFilter],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () =>
      canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : [],
    [canExport, onExport],
  );

  const renderActions = (
    <>
      {canExport ? (
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
      ) : null}
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
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('taskList.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      tabSlot={tabsSlot}
    />
  );
};

export default CongViecToolbar;
