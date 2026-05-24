import React, { useMemo } from 'react';
import { Tag, CalendarRange, Landmark, Layers, Medal, Building2 } from 'lucide-react';
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
  hinhThucOptions: ChipOption[];
  danhHieuOptions: ChipOption[];
  phongBanNguoiTaoOptions: ChipOption[];
  desktopStartSlot?: React.ReactNode;
}

const MttqKhenThuongChiTietToolbar: React.FC<Props> = ({
  onPageBack,
  trangThaiOptions,
  namKhenThuongOptions,
  donViDeXuatOptions,
  hinhThucOptions,
  danhHieuOptions,
  phongBanNguoiTaoOptions,
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
      hinh_thuc_khen: filters.hinh_thuc_khen,
      danh_hieu: filters.danh_hieu,
    });
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.trang_thai.length > 0 ? 1 : 0) +
      (filters.nam_khen_thuong.length > 0 ? 1 : 0) +
      (filters.don_vi_de_xuat.length > 0 ? 1 : 0) +
      (filters.hinh_thuc_khen.length > 0 ? 1 : 0) +
      (filters.danh_hieu.length > 0 ? 1 : 0) +
      (filters.id_phong_ban_nguoi_tao.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('trang_thai', []);
    setFilter('nam_khen_thuong', []);
    setFilter('don_vi_de_xuat', []);
    setFilter('hinh_thuc_khen', []);
    setFilter('danh_hieu', []);
    setFilter('id_phong_ban_nguoi_tao', []);
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
        <FilterChipMultiSelect
          options={hinhThucOptions}
          value={filters.hinh_thuc_khen}
          onChange={(val) => setFilter('hinh_thuc_khen', val)}
          placeholder={txt('matTranKhenThuong.form.hinhThuc')}
          icon={Layers}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,24vw)] sm:max-w-[220px]"
        />
        <FilterChipMultiSelect
          options={danhHieuOptions}
          value={filters.danh_hieu}
          onChange={(val) => setFilter('danh_hieu', val)}
          placeholder={txt('matTranKhenThuong.form.danhHieu')}
          icon={Medal}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,24vw)] sm:max-w-[220px]"
        />
        <FilterChipMultiSelect
          options={phongBanNguoiTaoOptions}
          value={filters.id_phong_ban_nguoi_tao}
          onChange={(val) => setFilter('id_phong_ban_nguoi_tao', val)}
          placeholder={txt('matTranKhenThuong.filter.phongBanNguoiTaoChip')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [
      trangThaiOptions,
      namKhenThuongOptions,
      donViDeXuatOptions,
      hinhThucOptions,
      danhHieuOptions,
      phongBanNguoiTaoOptions,
      filters.trang_thai,
      filters.nam_khen_thuong,
      filters.don_vi_de_xuat,
      filters.hinh_thuc_khen,
      filters.danh_hieu,
      filters.id_phong_ban_nguoi_tao,
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
      {
        key: 'hinh_thuc_khen',
        label: txt('matTranKhenThuong.form.hinhThuc'),
        icon: Layers,
        options: hinhThucOptions,
        value: filters.hinh_thuc_khen,
        onChange: (val: string[]) => setFilter('hinh_thuc_khen', val),
      },
      {
        key: 'danh_hieu',
        label: txt('matTranKhenThuong.form.danhHieu'),
        icon: Medal,
        options: danhHieuOptions,
        value: filters.danh_hieu,
        onChange: (val: string[]) => setFilter('danh_hieu', val),
      },
      {
        key: 'id_phong_ban_nguoi_tao',
        label: txt('matTranKhenThuong.filter.phongBanNguoiTaoChip'),
        icon: Building2,
        options: phongBanNguoiTaoOptions,
        value: filters.id_phong_ban_nguoi_tao,
        onChange: (val: string[]) => setFilter('id_phong_ban_nguoi_tao', val),
      },
    ],
    [
      trangThaiOptions,
      namKhenThuongOptions,
      donViDeXuatOptions,
      hinhThucOptions,
      danhHieuOptions,
      phongBanNguoiTaoOptions,
      filters.trang_thai,
      filters.nam_khen_thuong,
      filters.don_vi_de_xuat,
      filters.hinh_thuc_khen,
      filters.danh_hieu,
      filters.id_phong_ban_nguoi_tao,
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
      maxVisibleFilterChips={2}
    />
  );
};

export default MttqKhenThuongChiTietToolbar;
