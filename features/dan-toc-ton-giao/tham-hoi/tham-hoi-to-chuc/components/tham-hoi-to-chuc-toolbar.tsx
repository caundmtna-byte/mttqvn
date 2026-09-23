import React, { useMemo } from 'react';
import { Plus, Download, Upload, Building2, ListChecks, CalendarRange, Users } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useDipThamHoiOptions } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/hooks/use-dip-tham-hoi';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { useThongTinToChucQuanTrongList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong/hooks/use-thong-tin-to-chuc-quan-trong';
import { useThamHoiToChucStore } from '../store/useThamHoiToChucStore';
import { countThamHoiToChucColumnSearchActive } from '../utils/column-search';
import { TIEN_DO_VALUES, DON_VI_THAM_HOI_TINH_VALUE, DON_VI_THAM_HOI_TINH_LABEL } from '../core/constants';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const ThamHoiToChucToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('danTocThamHoiToChuc');

  // Tuỳ chọn lọc lấy từ HẰNG SỐ nghiệp vụ và BẢNG DANH MỤC, không phải từ các
  // dòng đang tải: danh sách nay phân trang phía máy chủ nên suy từ dòng chỉ ra
  // được giá trị có mặt trên đúng trang đang xem. Bỏ luôn con số đếm kèm mỗi
  // lựa chọn vì dưới phân trang server nó chỉ đếm được một trang — số sai còn
  // tệ hơn không có số.
  const { data: dipList = [] } = useDipThamHoiOptions();
  const { data: toChucList = [] } = useThongTinToChucQuanTrongList();
  const { data: phongBanList = [] } = useDepartments();
  const { data: xaPhuongList = [] } = useXaPhuongForTab(true, '');

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
    setSort,
  } = useThamHoiToChucStore();

  const selectedCount = selectedIds.size;

  const tienDoOptions = useMemo(
    () => TIEN_DO_VALUES.map((value) => ({ value, label: value })),
    [],
  );

  const toChucOptions = useMemo(
    () =>
      toChucList
        .map((t) => ({ value: t.id, label: t.ten_co_so?.trim() || t.id }))
        .sort((a, b) => a.label.localeCompare(b.label, getLanguage())),
    [toChucList],
  );

  const dipOptions = useMemo(
    () =>
      dipList
        .map((d) => ({ value: d.id, label: d.ten_dip }))
        .sort((a, b) => a.label.localeCompare(b.label, getLanguage())),
    [dipList],
  );

  const phongBanOptions = useMemo(
    () =>
      phongBanList
        .map((p) => ({ value: p.id, label: p.ten_phong_ban?.trim() || p.id }))
        .sort((a, b) => a.label.localeCompare(b.label, getLanguage())),
    [phongBanList],
  );

  // Đơn vị thăm hỏi = xã/phường, cộng chip "MTTQ Tỉnh" cho dòng để trống.
  const donViThamHoiOptions = useMemo(
    () => [
      { value: DON_VI_THAM_HOI_TINH_VALUE, label: DON_VI_THAM_HOI_TINH_LABEL },
      ...xaPhuongList
        .map((x) => ({ value: x.id, label: x.ten?.trim() || x.id }))
        .sort((a, b) => a.label.localeCompare(b.label, getLanguage())),
    ],
    [xaPhuongList],
  );

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countThamHoiToChucColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.tien_do_filter.length > 0 ? 1 : 0) +
      (filters.to_chuc_filter.length > 0 ? 1 : 0) +
      (filters.dip_tham_hoi_filter.length > 0 ? 1 : 0) +
      (filters.don_vi_tham_hoi_filter.length > 0 ? 1 : 0) +
      (filters.phong_ban_filter.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useThamHoiToChucStore.getState().setFilter('columnSearch', {});
    setFilter('tien_do_filter', []);
    setFilter('to_chuc_filter', []);
    setFilter('dip_tham_hoi_filter', []);
    setFilter('don_vi_tham_hoi_filter', []);
    setFilter('phong_ban_filter', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={tienDoOptions}
          value={filters.tien_do_filter}
          onChange={(val) => setFilter('tien_do_filter', val)}
          placeholder={txt('danTocThamHoiToChuc.store.tienDoCol')}
          icon={ListChecks}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
        <FilterChipMultiSelect
          options={toChucOptions}
          value={filters.to_chuc_filter}
          onChange={(val) => setFilter('to_chuc_filter', val)}
          placeholder={txt('danTocThamHoiToChuc.store.tenCoSoCol')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={dipOptions}
          value={filters.dip_tham_hoi_filter}
          onChange={(val) => setFilter('dip_tham_hoi_filter', val)}
          placeholder={txt('danTocThamHoiToChuc.store.dipThamHoiCol')}
          icon={CalendarRange}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={donViThamHoiOptions}
          value={filters.don_vi_tham_hoi_filter}
          onChange={(val) => setFilter('don_vi_tham_hoi_filter', val)}
          placeholder={txt('danTocThamHoiToChuc.store.donViThamHoiCol')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={phongBanOptions}
          value={filters.phong_ban_filter}
          onChange={(val) => setFilter('phong_ban_filter', val)}
          placeholder={txt('danTocThamHoiCaNhan.store.phongBanThamMuuCol')}
          icon={Users}
          className="shrink-0 w-full min-w-0 sm:w-[min(240px,30vw)] sm:max-w-[300px]"
        />
      </div>
    ),
    [tienDoOptions, toChucOptions, dipOptions, donViThamHoiOptions, phongBanOptions, filters, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'tien_do_filter',
        label: txt('danTocThamHoiToChuc.store.tienDoCol'),
        icon: ListChecks,
        options: tienDoOptions,
        value: filters.tien_do_filter,
        onChange: (val: string[]) => setFilter('tien_do_filter', val),
      },
      {
        key: 'to_chuc_filter',
        label: txt('danTocThamHoiToChuc.store.tenCoSoCol'),
        icon: Building2,
        options: toChucOptions,
        value: filters.to_chuc_filter,
        onChange: (val: string[]) => setFilter('to_chuc_filter', val),
      },
      {
        key: 'dip_tham_hoi_filter',
        label: txt('danTocThamHoiToChuc.store.dipThamHoiCol'),
        icon: CalendarRange,
        options: dipOptions,
        value: filters.dip_tham_hoi_filter,
        onChange: (val: string[]) => setFilter('dip_tham_hoi_filter', val),
      },
      {
        key: 'don_vi_tham_hoi_filter',
        label: txt('danTocThamHoiToChuc.store.donViThamHoiCol'),
        icon: Building2,
        options: donViThamHoiOptions,
        value: filters.don_vi_tham_hoi_filter,
        onChange: (val: string[]) => setFilter('don_vi_tham_hoi_filter', val),
      },
      {
        key: 'phong_ban_filter',
        label: txt('danTocThamHoiCaNhan.store.phongBanThamMuuCol'),
        icon: Users,
        options: phongBanOptions,
        value: filters.phong_ban_filter,
        onChange: (val: string[]) => setFilter('phong_ban_filter', val),
      },
    ],
    [tienDoOptions, toChucOptions, dipOptions, donViThamHoiOptions, phongBanOptions, filters, setFilter],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () => [
      ...(canImport
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [canImport, canExport, onImport, onExport],
  );

  const renderActions = (
    <>
      <div className="hidden sm:flex items-center gap-2">
        {canImport ? (
          <Tooltip content={txt('common.import')} placement="bottom">
            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </Tooltip>
        ) : null}
        {canExport ? (
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
        ) : null}
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
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
    />
  );
};

export default ThamHoiToChucToolbar;
