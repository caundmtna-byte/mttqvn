import React, { useMemo, type ReactNode } from 'react';
import { Plus, Download, Upload, Filter, Warehouse, Building2, CalendarDays } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import type { Option } from '@/components/ui/MultiSelect';
import { useKhoDanhSachKhoList } from '@/features/mat-tran-to-quoc/danh-sach-kho/hooks/use-kho-danh-sach-kho';
import { useKhoDonViCuuTroList } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { useKhoDotCuuTroList } from '@/features/mat-tran-to-quoc/dot-cuu-tro/hooks/use-kho-dot-cuu-tro';
import { useNhapXuatKhoStore } from '../store/useNhapXuatKhoStore';
import { countColumnSearchActive } from '../utils/column-search';
import { NHAP_XUAT_KHO_LOAI_PHIEU, type NhapXuatKhoLoaiPhieu } from '../core/constants';

interface Props {
  tabSlot: ReactNode;
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport?: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const NhapXuatKhoToolbar: React.FC<Props> = ({
  tabSlot,
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
}) => {
  const { canCreate, canExport, canDelete, canImport } = useResourcePermissions('matTranReliefStockTransactions');
  // Nhập = lập phiếu hàng loạt ⇒ phải có quyền `them`. Không dựa mình `canImport`
  // vì `can()` cho token `view` đi qua cả export lẫn import.
  const showImportButton = canCreate && canImport && Boolean(onImport);

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
  } = useNhapXuatKhoStore();

  // Tuỳ chọn lọc lấy từ BẢNG DANH MỤC, không phải từ các dòng đang tải: danh
  // sách phiếu nay phân trang phía máy chủ, nên suy từ dòng chỉ ra được những
  // giá trị có mặt trên đúng trang đang xem.
  const { data: khoList = [] } = useKhoDanhSachKhoList();
  const { data: donViList = [] } = useKhoDonViCuuTroList();
  const { data: dotList = [] } = useKhoDotCuuTroList();

  const loaiOptions = useMemo<Option[]>(
    () =>
      NHAP_XUAT_KHO_LOAI_PHIEU.map((v) => ({
        label: txt(`matTranNhapXuatKho.loaiPhieu.${v}`),
        value: v,
      })),
    [],
  );

  const khoOptions = useMemo<Option[]>(
    () =>
      khoList
        .map((k) => ({ label: k.ten_kho, value: String(k.id) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    [khoList],
  );

  const donViOptions = useMemo<Option[]>(
    () =>
      donViList
        .map((d) => ({ label: d.ten, value: String(d.id) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    [donViList],
  );

  const dotOptions = useMemo<Option[]>(
    () =>
      dotList
        .map((d) => ({ label: d.ten, value: String(d.id) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    [dotList],
  );

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai_phieu ? 1 : 0) +
      (filters.kho_id ? 1 : 0) +
      (filters.don_vi_cuu_tro_id ? 1 : 0) +
      (filters.dot_cuu_tro_id ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('loai_phieu', null);
    setFilter('kho_id', null);
    setFilter('don_vi_cuu_tro_id', null);
    setFilter('dot_cuu_tro_id', null);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipSingleSelect
          options={loaiOptions}
          value={filters.loai_phieu}
          onChange={(v) =>
            setFilter('loai_phieu', NHAP_XUAT_KHO_LOAI_PHIEU.includes(v as NhapXuatKhoLoaiPhieu) ? v : null)
          }
          placeholder={txt('matTranNhapXuatKho.loaiPhieu.all')}
          icon={Filter}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipSingleSelect
          options={khoOptions}
          value={filters.kho_id}
          onChange={(v) => setFilter('kho_id', v && v.length > 0 ? v : null)}
          placeholder={txt('matTranNhapXuatKho.toolbar.filterKho')}
          icon={Warehouse}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipSingleSelect
          options={donViOptions}
          value={filters.don_vi_cuu_tro_id}
          onChange={(v) => setFilter('don_vi_cuu_tro_id', v && v.length > 0 ? v : null)}
          placeholder={txt('matTranNhapXuatKho.toolbar.filterDonViCuuTro')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipSingleSelect
          options={dotOptions}
          value={filters.dot_cuu_tro_id}
          onChange={(v) => setFilter('dot_cuu_tro_id', v && v.length > 0 ? v : null)}
          placeholder={txt('matTranNhapXuatKho.toolbar.filterDotCuuTro')}
          icon={CalendarDays}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
        />
      </div>
    ),
    [
      filters.loai_phieu,
      filters.kho_id,
      filters.don_vi_cuu_tro_id,
      filters.dot_cuu_tro_id,
      loaiOptions,
      khoOptions,
      donViOptions,
      dotOptions,
      setFilter,
    ],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'loai_phieu',
        label: txt('matTranNhapXuatKho.loaiPhieu.all'),
        icon: Filter,
        options: loaiOptions,
        value: filters.loai_phieu ? [filters.loai_phieu] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter(
            'loai_phieu',
            NHAP_XUAT_KHO_LOAI_PHIEU.includes(pick as NhapXuatKhoLoaiPhieu) ? pick : null,
          );
        },
      },
      {
        key: 'kho_id',
        label: txt('matTranNhapXuatKho.toolbar.filterKho'),
        icon: Warehouse,
        options: khoOptions,
        value: filters.kho_id ? [filters.kho_id] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('kho_id', pick && pick.length > 0 ? pick : null);
        },
      },
      {
        key: 'don_vi_cuu_tro_id',
        label: txt('matTranNhapXuatKho.toolbar.filterDonViCuuTro'),
        icon: Building2,
        options: donViOptions,
        value: filters.don_vi_cuu_tro_id ? [filters.don_vi_cuu_tro_id] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('don_vi_cuu_tro_id', pick && pick.length > 0 ? pick : null);
        },
      },
      {
        key: 'dot_cuu_tro_id',
        label: txt('matTranNhapXuatKho.toolbar.filterDotCuuTro'),
        icon: CalendarDays,
        options: dotOptions,
        value: filters.dot_cuu_tro_id ? [filters.dot_cuu_tro_id] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('dot_cuu_tro_id', pick && pick.length > 0 ? pick : null);
        },
      },
    ],
    [
      loaiOptions,
      khoOptions,
      donViOptions,
      dotOptions,
      filters.loai_phieu,
      filters.kho_id,
      filters.don_vi_cuu_tro_id,
      filters.dot_cuu_tro_id,
      setFilter,
    ],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () => [
      ...(showImportButton && onImport
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [showImportButton, onImport, canExport, onExport],
  );

  const renderActions = (
    <>
      {showImportButton || canExport ? (
        <div className="hidden sm:flex items-center gap-2">
          {showImportButton && onImport ? (
            <Tooltip content={txt('common.import')} placement="bottom">
              <Button
                variant="outline"
                size="sm"
                onClick={onImport}
            aria-label={txt('common.import')}
                className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
              >
                <Upload className="w-4 h-4" aria-hidden />
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
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filterGroups={filterGroups}
      filters={filtersSlot}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranNhapXuatKho.searchPlaceholderList')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      tabSlot={tabSlot}
    />
  );
};

export default NhapXuatKhoToolbar;
