import React, { useMemo } from 'react';
import { Plus, Download, CircleDot, Landmark } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { QUY_TRANG_THAI_KEYS } from '../../core/constants';
import { useQuyDanhMucTaiKhoanStore } from '../store/useQuyDanhMucTaiKhoanStore';
import {
  countQuyTaiKhoanColumnSearchActive,
  hinhThucLabel,
  hinhThucTaiKhoan,
} from '../utils/column-search';
import type { QuyDanhMucTaiKhoanListRow } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: QuyDanhMucTaiKhoanListRow[] | null;
}

const QuyDanhMucTaiKhoanToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('quyDanhMucTaiKhoan');
  const rows = Array.isArray(items) ? items : [];

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
  } = useQuyDanhMucTaiKhoanStore();

  const trangThaiOptions = useMemo(
    () =>
      QUY_TRANG_THAI_KEYS.map((tt) => ({
        value: tt,
        label: tt,
        count: rows.filter((r) => r.trang_thai === tt).length,
      })),
    [rows],
  );

  const hinhThucOptions = useMemo(
    () =>
      (['tien_mat', 'ngan_hang'] as const).map((v) => ({
        value: v,
        label: hinhThucLabel(v),
        count: rows.filter((r) => hinhThucTaiKhoan(r) === v).length,
      })),
    [rows],
  );

  const activeFilterCount = useMemo(
    () =>
      (searchTerm ? 1 : 0) +
      countQuyTaiKhoanColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.trang_thai.length > 0 ? 1 : 0) +
      (filters.hinh_thuc.length > 0 ? 1 : 0),
    [searchTerm, filters],
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('trang_thai', []);
    setFilter('hinh_thuc', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai}
          onChange={(val) => setFilter('trang_thai', val)}
          placeholder={txt('quy.danhMucTaiKhoan.filter.trangThaiPlaceholder')}
          icon={CircleDot}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
        <FilterChipMultiSelect
          options={hinhThucOptions}
          value={filters.hinh_thuc}
          onChange={(val) => setFilter('hinh_thuc', val)}
          placeholder={txt('quy.danhMucTaiKhoan.filter.loaiNguonPlaceholder')}
          icon={Landmark}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
      </div>
    ),
    [trangThaiOptions, hinhThucOptions, filters.trang_thai, filters.hinh_thuc, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai',
        label: txt('quy.danhMucTaiKhoan.filter.trangThaiPlaceholder'),
        icon: CircleDot,
        options: trangThaiOptions,
        value: filters.trang_thai,
        onChange: (val: string[]) => setFilter('trang_thai', val),
      },
      {
        key: 'hinh_thuc',
        label: txt('quy.danhMucTaiKhoan.filter.loaiNguonPlaceholder'),
        icon: Landmark,
        options: hinhThucOptions,
        value: filters.hinh_thuc,
        onChange: (val: string[]) => setFilter('hinh_thuc', val),
      },
    ],
    [trangThaiOptions, hinhThucOptions, filters.trang_thai, filters.hinh_thuc, setFilter],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () =>
      canExport
        ? [
            {
              key: 'export',
              label: txt('common.export'),
              icon: Download,
              onClick: onExport,
              description: '',
            },
          ]
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
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('quy.danhMucTaiKhoan.searchPlaceholder')}
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

export default QuyDanhMucTaiKhoanToolbar;
