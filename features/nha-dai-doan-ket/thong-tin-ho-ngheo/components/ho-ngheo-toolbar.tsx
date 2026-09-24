import React, { useMemo } from 'react';
import { Plus, Download, Upload, ListChecks, MapPin, Users, Church, Globe2 } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useHoNgheoStore } from '../store/useHoNgheoStore';
import { countHnghColumnSearchActive } from '../utils/column-search';
import { useDanTocOptions } from '../hooks/use-dan-toc-options';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';
import {
  HNGH_DOI_TUONG_VALUES,
  HNGH_TON_GIAO_VALUES,
  HNGH_TRANG_THAI_VALUES,
} from '../core/constants';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport?: () => void;
  onDeleteMany: (ids: string[]) => void;
  /** Cán bộ cấp xã chỉ chọn được xã của mình. */
  scopedToXaPhuongId?: string | null;
}

const HoNgheoToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  scopedToXaPhuongId,
}) => {
  const { canCreate, canExport, canImport, canDelete } = useResourcePermissions('hoNgheoList');

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
  } = useHoNgheoStore();

  const xaPhuongOptions = useNddkXaPhuongOptions(scopedToXaPhuongId);
  const danTocOptions = useDanTocOptions();

  const doiTuongOptions = useMemo(
    () => HNGH_DOI_TUONG_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );
  const tonGiaoOptions = useMemo(
    () => HNGH_TON_GIAO_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );
  const trangThaiOptions = useMemo(
    () => HNGH_TRANG_THAI_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );

  const activeFilterCount = useMemo(
    () =>
      (searchTerm ? 1 : 0) +
      countHnghColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.doi_tuong_filter.length > 0 ? 1 : 0) +
      (filters.ton_giao_filter.length > 0 ? 1 : 0) +
      (filters.trang_thai_filter.length > 0 ? 1 : 0) +
      (filters.dan_toc_filter.length > 0 ? 1 : 0) +
      (filters.xa_phuong_filter.length > 0 ? 1 : 0),
    [searchTerm, filters],
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('doi_tuong_filter', []);
    setFilter('ton_giao_filter', []);
    setFilter('trang_thai_filter', []);
    setFilter('dan_toc_filter', []);
    setFilter('xa_phuong_filter', []);
    setSort(null, null);
  };

  const chipClass = 'shrink-0 w-full min-w-0 sm:w-[min(190px,22vw)] sm:max-w-[240px]';

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai_filter}
          onChange={(val) => setFilter('trang_thai_filter', val)}
          placeholder={txt('hoNgheo.store.trangThaiCol')}
          icon={ListChecks}
          className={chipClass}
        />
        <FilterChipMultiSelect
          options={doiTuongOptions}
          value={filters.doi_tuong_filter}
          onChange={(val) => setFilter('doi_tuong_filter', val)}
          placeholder={txt('hoNgheo.store.doiTuongCol')}
          icon={Users}
          className={chipClass}
        />
        <FilterChipMultiSelect
          options={xaPhuongOptions}
          value={filters.xa_phuong_filter}
          onChange={(val) => setFilter('xa_phuong_filter', val)}
          placeholder={txt('hoNgheo.store.xaPhuongCol')}
          icon={MapPin}
          className={chipClass}
        />
        <FilterChipMultiSelect
          options={danTocOptions}
          value={filters.dan_toc_filter}
          onChange={(val) => setFilter('dan_toc_filter', val)}
          placeholder={txt('hoNgheo.store.danTocCol')}
          icon={Globe2}
          className={chipClass}
        />
        <FilterChipMultiSelect
          options={tonGiaoOptions}
          value={filters.ton_giao_filter}
          onChange={(val) => setFilter('ton_giao_filter', val)}
          placeholder={txt('hoNgheo.store.tonGiaoCol')}
          icon={Church}
          className={chipClass}
        />
      </div>
    ),
    [
      filters.trang_thai_filter,
      filters.doi_tuong_filter,
      filters.xa_phuong_filter,
      filters.dan_toc_filter,
      filters.ton_giao_filter,
      trangThaiOptions,
      doiTuongOptions,
      xaPhuongOptions,
      danTocOptions,
      tonGiaoOptions,
      setFilter,
    ],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai_filter',
        label: txt('hoNgheo.store.trangThaiCol'),
        icon: ListChecks,
        options: trangThaiOptions,
        value: filters.trang_thai_filter,
        onChange: (val: string[]) => setFilter('trang_thai_filter', val),
      },
      {
        key: 'doi_tuong_filter',
        label: txt('hoNgheo.store.doiTuongCol'),
        icon: Users,
        options: doiTuongOptions,
        value: filters.doi_tuong_filter,
        onChange: (val: string[]) => setFilter('doi_tuong_filter', val),
      },
      {
        key: 'xa_phuong_filter',
        label: txt('hoNgheo.store.xaPhuongCol'),
        icon: MapPin,
        options: xaPhuongOptions,
        value: filters.xa_phuong_filter,
        onChange: (val: string[]) => setFilter('xa_phuong_filter', val),
      },
      {
        key: 'dan_toc_filter',
        label: txt('hoNgheo.store.danTocCol'),
        icon: Globe2,
        options: danTocOptions,
        value: filters.dan_toc_filter,
        onChange: (val: string[]) => setFilter('dan_toc_filter', val),
      },
      {
        key: 'ton_giao_filter',
        label: txt('hoNgheo.store.tonGiaoCol'),
        icon: Church,
        options: tonGiaoOptions,
        value: filters.ton_giao_filter,
        onChange: (val: string[]) => setFilter('ton_giao_filter', val),
      },
    ],
    [
      trangThaiOptions,
      doiTuongOptions,
      xaPhuongOptions,
      danTocOptions,
      tonGiaoOptions,
      filters.trang_thai_filter,
      filters.doi_tuong_filter,
      filters.xa_phuong_filter,
      filters.dan_toc_filter,
      filters.ton_giao_filter,
      setFilter,
    ],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () => [
      ...(canImport && onImport
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [canImport, onImport, canExport, onExport],
  );

  const renderActions = (
    <>
      {canImport && onImport && (
        <Tooltip content={txt('common.import')} placement="bottom">
          <Button
            variant="outline"
            size="sm"
            onClick={onImport}
            className="hidden sm:inline-flex h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
          >
            <Upload className="w-4 h-4" />
          </Button>
        </Tooltip>
      )}
      {canExport && (
        <Tooltip content={txt('common.export')} placement="bottom">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="hidden sm:inline-flex h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
          >
            <Download className="w-4 h-4" />
          </Button>
        </Tooltip>
      )}
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{txt('common.add')}</span>
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
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      filters={filtersSlot}
      filterGroups={filterGroups}
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

export default HoNgheoToolbar;
