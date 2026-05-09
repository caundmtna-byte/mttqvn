import React, { useMemo } from 'react';
import { Tag, CalendarRange, Landmark } from 'lucide-react';
import { txt } from '@/lib/text';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqKhenThuongChiTietListStore } from '../store/useMttqKhenThuongChiTietListStore';
import { countKhenThuongColumnSearchActive } from '../utils/column-search';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  trangThaiOptions: ChipOption[];
  namKhenThuongOptions: ChipOption[];
  donViDeXuatOptions: ChipOption[];
  desktopStartSlot?: React.ReactNode;
}

const MttqKhenThuongChiTietToolbar: React.FC<Props> = ({
  onPageBack,
  trangThaiOptions,
  namKhenThuongOptions,
  donViDeXuatOptions,
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
  } = useMttqKhenThuongChiTietListStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countKhenThuongColumnSearchActive(filters.columnSearch, {
      don_vi_de_xuat: filters.don_vi_de_xuat,
      nam_khen_thuong: filters.nam_khen_thuong,
    });
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.trang_thai.length > 0 ? 1 : 0) +
      (filters.nam_khen_thuong.length > 0 ? 1 : 0) +
      (filters.don_vi_de_xuat.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('trang_thai', []);
    setFilter('nam_khen_thuong', []);
    setFilter('don_vi_de_xuat', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai}
          onChange={(val) => setFilter('trang_thai', val)}
          placeholder={txt('matTranKhenThuong.store.trangThaiCol')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={namKhenThuongOptions}
          value={filters.nam_khen_thuong}
          onChange={(val) => setFilter('nam_khen_thuong', val)}
          placeholder={txt('matTranKhenThuong.filter.namChip')}
          icon={CalendarRange}
          className="shrink-0 w-full min-w-0 sm:w-[min(160px,22vw)] sm:max-w-[200px]"
        />
        <FilterChipMultiSelect
          options={donViDeXuatOptions}
          value={filters.don_vi_de_xuat}
          onChange={(val) => setFilter('don_vi_de_xuat', val)}
          placeholder={txt('matTranKhenThuong.store.donViCol')}
          icon={Landmark}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [
      trangThaiOptions,
      namKhenThuongOptions,
      donViDeXuatOptions,
      filters.trang_thai,
      filters.nam_khen_thuong,
      filters.don_vi_de_xuat,
      setFilter,
    ],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai',
        label: txt('matTranKhenThuong.store.trangThaiCol'),
        icon: Tag,
        options: trangThaiOptions,
        value: filters.trang_thai,
        onChange: (val: string[]) => setFilter('trang_thai', val),
      },
      {
        key: 'nam_khen_thuong',
        label: txt('matTranKhenThuong.filter.namChip'),
        icon: CalendarRange,
        options: namKhenThuongOptions,
        value: filters.nam_khen_thuong,
        onChange: (val: string[]) => setFilter('nam_khen_thuong', val),
      },
      {
        key: 'don_vi_de_xuat',
        label: txt('matTranKhenThuong.store.donViCol'),
        icon: Landmark,
        options: donViDeXuatOptions,
        value: filters.don_vi_de_xuat,
        onChange: (val: string[]) => setFilter('don_vi_de_xuat', val),
      },
    ],
    [
      trangThaiOptions,
      namKhenThuongOptions,
      donViDeXuatOptions,
      filters.trang_thai,
      filters.nam_khen_thuong,
      filters.don_vi_de_xuat,
      setFilter,
    ],
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
      searchPlaceholder={txt('matTranKhenThuong.chiTietList.searchPlaceholder')}
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

export default MttqKhenThuongChiTietToolbar;
