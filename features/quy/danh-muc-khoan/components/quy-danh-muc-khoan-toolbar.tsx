import React, { useMemo } from 'react';
import { Plus, Download, CircleDot, ArrowUpDown } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { QUY_LOAI_KEYS, QUY_LOAI_KHOAN_LABEL, QUY_TRANG_THAI_KEYS } from '../../core/constants';
import { useQuyDanhMucKhoanStore } from '../store/useQuyDanhMucKhoanStore';
import { countQuyKhoanColumnSearchActive } from '../utils/column-search';
import type { QuyDanhMucKhoanListRow } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: QuyDanhMucKhoanListRow[] | null;
}

const QuyDanhMucKhoanToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('quyDanhMucKhoan');
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
  } = useQuyDanhMucKhoanStore();

  const loaiOptions = useMemo(
    () =>
      QUY_LOAI_KEYS.map((l) => ({
        value: l,
        label: QUY_LOAI_KHOAN_LABEL[l],
        count: rows.filter((r) => r.loai === l).length,
      })),
    [rows],
  );

  const trangThaiOptions = useMemo(
    () =>
      QUY_TRANG_THAI_KEYS.map((tt) => ({
        value: tt,
        label: tt,
        count: rows.filter((r) => r.trang_thai === tt).length,
      })),
    [rows],
  );

  const activeFilterCount = useMemo(
    () =>
      (searchTerm ? 1 : 0) +
      countQuyKhoanColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai.length > 0 ? 1 : 0) +
      (filters.trang_thai.length > 0 ? 1 : 0),
    [searchTerm, filters],
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('loai', []);
    setFilter('trang_thai', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={loaiOptions}
          value={filters.loai}
          onChange={(val) => setFilter('loai', val)}
          placeholder={txt('quy.danhMucKhoan.filter.loaiPlaceholder')}
          icon={ArrowUpDown}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai}
          onChange={(val) => setFilter('trang_thai', val)}
          placeholder={txt('quy.danhMucKhoan.filter.trangThaiPlaceholder')}
          icon={CircleDot}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
      </div>
    ),
    [loaiOptions, trangThaiOptions, filters.loai, filters.trang_thai, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'loai',
        label: txt('quy.danhMucKhoan.filter.loaiPlaceholder'),
        icon: ArrowUpDown,
        options: loaiOptions,
        value: filters.loai,
        onChange: (val: string[]) => setFilter('loai', val),
      },
      {
        key: 'trang_thai',
        label: txt('quy.danhMucKhoan.filter.trangThaiPlaceholder'),
        icon: CircleDot,
        options: trangThaiOptions,
        value: filters.trang_thai,
        onChange: (val: string[]) => setFilter('trang_thai', val),
      },
    ],
    [loaiOptions, trangThaiOptions, filters.loai, filters.trang_thai, setFilter],
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
      searchPlaceholder={txt('quy.danhMucKhoan.searchPlaceholder')}
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

export default QuyDanhMucKhoanToolbar;
