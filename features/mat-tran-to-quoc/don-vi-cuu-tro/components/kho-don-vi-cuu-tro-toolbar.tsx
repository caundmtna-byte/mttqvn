import React, { useMemo } from 'react';
import { Plus, Download, Upload, Tag } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useKhoDonViCuuTroStore } from '../store/useKhoDonViCuuTroStore';
import { countKhoDonViCuuTroColumnSearchActive } from '../utils/column-search';
import {
  KHO_DON_VI_CUU_TRO_LOAI,
  khoDonViCuuTroLoaiLabel,
  KhoDonViCuuTroLoai,
} from '../core/loai';
import type { KhoDonViCuuTroListRow } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: KhoDonViCuuTroListRow[] | null;
}

const KhoDonViCuuTroToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('matTranReliefSupportUnits');
  const itemRows = Array.isArray(items) ? items : [];

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
  } = useKhoDonViCuuTroStore();

  const selectedCount = selectedIds.size;

  const loaiOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of itemRows) counts[r.loai] = (counts[r.loai] ?? 0) + 1;
    return KHO_DON_VI_CUU_TRO_LOAI.map((value) => ({
      value,
      label: khoDonViCuuTroLoaiLabel(value),
      count: counts[value] ?? 0,
    }));
  }, [itemRows]);

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countKhoDonViCuuTroColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai_filter.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useKhoDonViCuuTroStore.getState().setFilter('columnSearch', {});
    setFilter('loai_filter', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={loaiOptions}
          value={filters.loai_filter}
          onChange={(val) => setFilter('loai_filter', val)}
          placeholder={txt('matTranDonViCuuTro.store.loaiCol')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [filters.loai_filter, loaiOptions, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'loai_filter',
        label: txt('matTranDonViCuuTro.store.loaiCol'),
        icon: Tag,
        options: loaiOptions,
        value: filters.loai_filter,
        onChange: (val: string[]) => setFilter('loai_filter', val),
      },
    ],
    [loaiOptions, filters.loai_filter, setFilter],
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
      searchPlaceholder={txt('matTranDonViCuuTro.searchPlaceholder')}
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

export default KhoDonViCuuTroToolbar;
