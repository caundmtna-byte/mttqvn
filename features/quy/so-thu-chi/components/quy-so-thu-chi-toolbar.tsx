import React, { useMemo } from 'react';
import { Plus, Download, ArrowUpDown, Tag, Wallet } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import { buildStandardDateRangePresets } from '@/lib/date-range-presets';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { QUY_LOAI_KEYS, QUY_LOAI_PHIEU_LABEL } from '../../core/constants';
import type { QuyKhoanOption } from '../../danh-muc-khoan/core/types';
import type { QuyTaiKhoanOption } from '../../danh-muc-tai-khoan/core/types';
import { useQuySoThuChiStore } from '../store/useQuySoThuChiStore';
import { countQuySoThuChiColumnSearchActive } from '../utils/column-search';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  /** Tùy chọn chip lấy từ BẢNG DANH MỤC, không suy từ các dòng đang tải —
   *  dòng đang tải chỉ là một trang, suy ra sẽ thiếu lựa chọn. */
  khoanOptions: QuyKhoanOption[];
  taiKhoanOptions: QuyTaiKhoanOption[];
}

const QuySoThuChiToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
  khoanOptions,
  taiKhoanOptions,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('quySoThuChi');

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
  } = useQuySoThuChiStore();

  const presets = useMemo(() => buildStandardDateRangePresets(), []);

  const loaiOptions = useMemo(
    () => QUY_LOAI_KEYS.map((l) => ({ value: l, label: QUY_LOAI_PHIEU_LABEL[l] })),
    [],
  );

  const khoanChipOptions = useMemo(
    () =>
      khoanOptions.map((k) => ({
        value: k.id,
        label: k.ten,
        subLabel: QUY_LOAI_PHIEU_LABEL[k.loai],
      })),
    [khoanOptions],
  );

  const taiKhoanChipOptions = useMemo(
    () => taiKhoanOptions.map((t) => ({ value: t.id, label: t.ten })),
    [taiKhoanOptions],
  );

  const activeFilterCount = useMemo(
    () =>
      (searchTerm ? 1 : 0) +
      countQuySoThuChiColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai.length > 0 ? 1 : 0) +
      (filters.khoan_ids.length > 0 ? 1 : 0) +
      (filters.tai_khoan_ids.length > 0 ? 1 : 0) +
      (filters.dateRange.preset !== 'all' ? 1 : 0),
    [searchTerm, filters],
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('loai', []);
    setFilter('khoan_ids', []);
    setFilter('tai_khoan_ids', []);
    setFilter('dateRange', { preset: 'all', customStart: '', customEnd: '' });
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <DateRangePicker
          value={filters.dateRange}
          onChange={(v: DateRangeValue) => setFilter('dateRange', v)}
          presets={presets}
          className="shrink-0 w-full min-w-0 sm:w-auto"
        />
        <FilterChipMultiSelect
          options={loaiOptions}
          value={filters.loai}
          onChange={(val) => setFilter('loai', val)}
          placeholder={txt('quy.soThuChi.filter.loaiPlaceholder')}
          icon={ArrowUpDown}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,24vw)] sm:max-w-[220px]"
        />
        <FilterChipMultiSelect
          options={khoanChipOptions}
          value={filters.khoan_ids}
          onChange={(val) => setFilter('khoan_ids', val)}
          placeholder={txt('quy.soThuChi.filter.khoanPlaceholder')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,26vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={taiKhoanChipOptions}
          value={filters.tai_khoan_ids}
          onChange={(val) => setFilter('tai_khoan_ids', val)}
          placeholder={txt('quy.soThuChi.filter.taiKhoanPlaceholder')}
          icon={Wallet}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,24vw)] sm:max-w-[240px]"
        />
      </div>
    ),
    [
      presets,
      loaiOptions,
      khoanChipOptions,
      taiKhoanChipOptions,
      filters.dateRange,
      filters.loai,
      filters.khoan_ids,
      filters.tai_khoan_ids,
      setFilter,
    ],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'loai',
        label: txt('quy.soThuChi.filter.loaiPlaceholder'),
        icon: ArrowUpDown,
        options: loaiOptions,
        value: filters.loai,
        onChange: (val: string[]) => setFilter('loai', val),
      },
      {
        key: 'khoan_ids',
        label: txt('quy.soThuChi.filter.khoanPlaceholder'),
        icon: Tag,
        options: khoanChipOptions,
        value: filters.khoan_ids,
        onChange: (val: string[]) => setFilter('khoan_ids', val),
      },
      {
        key: 'tai_khoan_ids',
        label: txt('quy.soThuChi.filter.taiKhoanPlaceholder'),
        icon: Wallet,
        options: taiKhoanChipOptions,
        value: filters.tai_khoan_ids,
        onChange: (val: string[]) => setFilter('tai_khoan_ids', val),
      },
    ],
    [
      loaiOptions,
      khoanChipOptions,
      taiKhoanChipOptions,
      filters.loai,
      filters.khoan_ids,
      filters.tai_khoan_ids,
      setFilter,
    ],
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
      searchPlaceholder={txt('quy.soThuChi.searchPlaceholder')}
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

export default QuySoThuChiToolbar;
