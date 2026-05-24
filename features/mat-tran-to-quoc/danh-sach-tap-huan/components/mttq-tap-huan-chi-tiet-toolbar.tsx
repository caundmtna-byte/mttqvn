import React, { useMemo } from 'react';
import { Tag, CalendarDays, ListFilter } from 'lucide-react';
import { txt } from '@/lib/text';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqTapHuanChiTietListStore } from '../store/useMttqTapHuanChiTietListStore';
import { countTapHuanColumnSearchActive } from '../utils/column-search';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  capOptions: ChipOption[];
  namOptions: ChipOption[];
  thuocDienOptions: ChipOption[];
  desktopStartSlot?: React.ReactNode;
}

const MttqTapHuanChiTietToolbar: React.FC<Props> = ({
  onPageBack,
  capOptions,
  namOptions,
  thuocDienOptions,
  desktopStartSlot,
}) => {
  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    setSort,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
  } = useMttqTapHuanChiTietListStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countTapHuanColumnSearchActive(filters.columnSearch);
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.cap_tap_huan.length > 0 ? 1 : 0) +
      (filters.nam_tap_huan.length > 0 ? 1 : 0) +
      (filters.thuoc_dien.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('cap_tap_huan', []);
    setFilter('nam_tap_huan', []);
    setFilter('thuoc_dien', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={capOptions}
          value={filters.cap_tap_huan}
          onChange={(val) => setFilter('cap_tap_huan', val)}
          placeholder={txt('matTranTapHuan.store.capCol')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,26vw)] sm:max-w-[220px]"
        />
        <FilterChipMultiSelect
          options={namOptions}
          value={filters.nam_tap_huan}
          onChange={(val) => setFilter('nam_tap_huan', val)}
          placeholder={txt('matTranTapHuan.store.namCol')}
          icon={CalendarDays}
          className="shrink-0 w-full min-w-0 sm:w-[min(160px,22vw)] sm:max-w-[200px]"
        />
        <FilterChipMultiSelect
          options={thuocDienOptions}
          value={filters.thuoc_dien}
          onChange={(val) => setFilter('thuoc_dien', val)}
          placeholder={txt('matTranTapHuan.stats.thuocDienChip')}
          icon={ListFilter}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
      </div>
    ),
    [capOptions, namOptions, thuocDienOptions, filters.cap_tap_huan, filters.nam_tap_huan, filters.thuoc_dien, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'cap_tap_huan',
        label: txt('matTranTapHuan.store.capCol'),
        icon: Tag,
        options: capOptions,
        value: filters.cap_tap_huan,
        onChange: (val: string[]) => setFilter('cap_tap_huan', val),
      },
      {
        key: 'nam_tap_huan',
        label: txt('matTranTapHuan.store.namCol'),
        icon: CalendarDays,
        options: namOptions,
        value: filters.nam_tap_huan,
        onChange: (val: string[]) => setFilter('nam_tap_huan', val),
      },
      {
        key: 'thuoc_dien',
        label: txt('matTranTapHuan.stats.thuocDienChip'),
        icon: ListFilter,
        options: thuocDienOptions,
        value: filters.thuoc_dien,
        onChange: (val: string[]) => setFilter('thuoc_dien', val),
      },
    ],
    [capOptions, namOptions, thuocDienOptions, filters.cap_tap_huan, filters.nam_tap_huan, filters.thuoc_dien, setFilter],
  );

  return (
    <GenericToolbar
      desktopStartSlot={desktopStartSlot}
      selectedCount={selectedCount}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      filters={filtersSlot}
      filterGroups={filterGroups}
      searchPlaceholder={txt('matTranTapHuan.chiTietList.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
    />
  );
};

export default MttqTapHuanChiTietToolbar;
