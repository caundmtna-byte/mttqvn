import React, { useMemo } from 'react';
import { Plus, Download, Tag, CalendarRange, Landmark, Layers, Medal, Building2 } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqKhenThuongStore } from '../store/useMttqKhenThuongStore';
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
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  /** Tab Danh sách / Thống kê — đặt sau nút Back. */
  desktopStartSlot?: React.ReactNode;
  /** Tab Thống kê: ẩn tìm kiếm, export, thêm, xóa nhiều, cột — vẫn giữ chip lọc. */
  hideListControls?: boolean;
}

const noopSearch = () => {};

const MttqKhenThuongToolbar: React.FC<Props> = ({
  onPageBack,
  trangThaiOptions,
  namKhenThuongOptions,
  donViDeXuatOptions,
  hinhThucOptions,
  danhHieuOptions,
  phongBanNguoiTaoOptions,
  onAdd,
  onExport,
  onDeleteMany,
  desktopStartSlot,
  hideListControls,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranRewardList');

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
  } = useMttqKhenThuongStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countKhenThuongColumnSearchActive(filters.columnSearch, {
      don_vi_de_xuat: filters.don_vi_de_xuat,
      nam_khen_thuong: filters.nam_khen_thuong,
      hinh_thuc_khen: filters.hinh_thuc_khen,
      danh_hieu: filters.danh_hieu,
    });
    const chipAndCol =
      columnSearchN +
      (filters.trang_thai.length > 0 ? 1 : 0) +
      (filters.nam_khen_thuong.length > 0 ? 1 : 0) +
      (filters.don_vi_de_xuat.length > 0 ? 1 : 0) +
      (filters.hinh_thuc_khen.length > 0 ? 1 : 0) +
      (filters.danh_hieu.length > 0 ? 1 : 0) +
      (filters.id_phong_ban_nguoi_tao.length > 0 ? 1 : 0);
    if (hideListControls) return chipAndCol;
    return (searchTerm ? 1 : 0) + chipAndCol;
  }, [hideListControls, searchTerm, filters]);

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
      desktopStartSlot={desktopStartSlot}
      selectedCount={selectedCount}
      searchTerm={hideListControls ? '' : searchTerm}
      onSearchChange={hideListControls ? noopSearch : setSearchTerm}
      onClearSelection={clearSelection}
      hideSearch={hideListControls}
      actions={hideListControls ? undefined : renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={hideListControls ? undefined : mobileActions}
      onAdd={hideListControls ? undefined : canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranKhenThuong.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={hideListControls ? undefined : canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={hideListControls ? undefined : columns}
      onToggleColumn={hideListControls ? undefined : toggleColumn}
      onReorderColumns={hideListControls ? undefined : reorderColumns}
      onResetColumns={hideListControls ? undefined : resetColumns}
      showBack
      onBack={onPageBack}
    />
  );
};

export default MttqKhenThuongToolbar;
