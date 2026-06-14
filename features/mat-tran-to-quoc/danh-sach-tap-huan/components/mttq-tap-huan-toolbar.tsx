import React, { useMemo } from 'react';
import { Plus, Download, Tag, CalendarDays, MapPin, Building2 } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqLopTapHuanStore } from '../store/useMttqLopTapHuanStore';
import { countTapHuanColumnSearchActive } from '../utils/column-search';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

export interface TapHuanToolbarFilterGroup {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  options: ChipOption[];
  value: string[];
  onChange: (val: string[]) => void;
}

interface Props {
  onPageBack: () => void;
  capOptions: ChipOption[];
  namOptions: ChipOption[];
  toChucOptions: ChipOption[];
  donViOptions: ChipOption[];
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  /** Sau nút Back: TabGroup hoặc nội dung tương tự. */
  tabSlot?: React.ReactNode;
  /** Tab Thống kê: ẩn tìm kiếm, export, thêm, xóa nhiều, cột — vẫn giữ chip lọc. */
  hideListControls?: boolean;
  /** Khi `hideListControls`: vẫn hiện nút xuất nếu user có quyền export (đồng bộ tab Lớp). */
  showExportWhenListHidden?: boolean;
  /** Chip lọc bổ sung (vd. Thuộc diện / đơn vị lớp trên tab Thống kê). */
  extraFiltersSlot?: React.ReactNode;
  /** Cộng vào badge “đang lọc” (chip thống kê bổ sung). */
  extraActiveFilterCount?: number;
  /** Gọi khi “Xóa bộ lọc” — xóa thêm chip tab Thống kê. */
  onClearExtraFilters?: () => void;
  /** Nhóm lọc mobile bổ sung (tab Thống kê: thuộc diện / đơn vị lớp). */
  extraFilterGroups?: TapHuanToolbarFilterGroup[];
}

const noopSearch = () => {};

const MttqLopTapHuanToolbar: React.FC<Props> = ({
  onPageBack,
  capOptions,
  namOptions,
  toChucOptions,
  donViOptions,
  onAdd,
  onExport,
  onDeleteMany,
  tabSlot,
  hideListControls,
  showExportWhenListHidden,
  extraFiltersSlot,
  extraActiveFilterCount = 0,
  onClearExtraFilters,
  extraFilterGroups = [],
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranTrainingList');

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
  } = useMttqLopTapHuanStore();

  const selectedCount = selectedIds.size;
  const toChucFilter = filters.to_chuc_id ?? [];

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countTapHuanColumnSearchActive(filters.columnSearch);
    const chipAndCol =
      columnSearchN +
      (filters.cap_tap_huan.length > 0 ? 1 : 0) +
      (filters.nam_tap_huan.length > 0 ? 1 : 0) +
      (toChucFilter.length > 0 ? 1 : 0) +
      (filters.don_vi_id.length > 0 ? 1 : 0) +
      extraActiveFilterCount;
    if (hideListControls) return chipAndCol;
    return (searchTerm ? 1 : 0) + chipAndCol;
  }, [hideListControls, searchTerm, filters, toChucFilter, extraActiveFilterCount]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('cap_tap_huan', []);
    setFilter('nam_tap_huan', []);
    setFilter('to_chuc_id', []);
    setFilter('don_vi_id', []);
    setSort(null, null);
    onClearExtraFilters?.();
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
          options={toChucOptions}
          value={toChucFilter}
          onChange={(val) => setFilter('to_chuc_id', val)}
          placeholder={txt('matTranTapHuan.store.toChucCol')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={donViOptions}
          value={filters.don_vi_id}
          onChange={(val) => setFilter('don_vi_id', val)}
          placeholder={txt('matTranTapHuan.store.donViCol')}
          icon={MapPin}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        {extraFiltersSlot}
      </div>
    ),
    [capOptions, namOptions, toChucOptions, donViOptions, filters.cap_tap_huan, filters.nam_tap_huan, toChucFilter, filters.don_vi_id, setFilter, extraFiltersSlot],
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
        key: 'to_chuc_id',
        label: txt('matTranTapHuan.store.toChucCol'),
        icon: Building2,
        options: toChucOptions,
        value: toChucFilter,
        onChange: (val: string[]) => setFilter('to_chuc_id', val),
      },
      {
        key: 'don_vi_id',
        label: txt('matTranTapHuan.store.donViCol'),
        icon: MapPin,
        options: donViOptions,
        value: filters.don_vi_id,
        onChange: (val: string[]) => setFilter('don_vi_id', val),
      },
      ...extraFilterGroups,
    ],
    [
      capOptions,
      namOptions,
      toChucOptions,
      donViOptions,
      extraFilterGroups,
      filters.cap_tap_huan,
      filters.nam_tap_huan,
      toChucFilter,
      filters.don_vi_id,
      setFilter,
    ],
  );

  const exportAllowed = canExport && (!hideListControls || showExportWhenListHidden);

  const mobileActions = useMemo<ActionItem[]>(
    () =>
      exportAllowed
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
    [exportAllowed, onExport],
  );

  const renderActions = (
    <>
      {exportAllowed ? (
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
      {canCreate && !hideListControls && (
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
      tabSlot={tabSlot}
      selectedCount={selectedCount}
      searchTerm={hideListControls ? '' : searchTerm}
      onSearchChange={hideListControls ? noopSearch : setSearchTerm}
      onClearSelection={clearSelection}
      hideSearch={hideListControls}
      actions={hideListControls && !showExportWhenListHidden ? undefined : renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={hideListControls && !showExportWhenListHidden ? undefined : mobileActions}
      onAdd={hideListControls ? undefined : canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranTapHuan.searchPlaceholder')}
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

export default MttqLopTapHuanToolbar;
