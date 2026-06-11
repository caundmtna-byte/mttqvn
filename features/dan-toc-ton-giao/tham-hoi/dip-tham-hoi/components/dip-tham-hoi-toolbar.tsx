import React, { useMemo } from 'react';
import { Plus, Download, ListChecks } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useDipThamHoiStore } from '../store/useDipThamHoiStore';
import { countDipThamHoiColumnSearchActive } from '../utils/column-search';
import { TRANG_THAI_VALUES } from '../core/constants';
import type { DipThamHoi } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: DipThamHoi[] | null;
}

const DipThamHoiToolbar: React.FC<Props> = ({ onPageBack, onAdd, onExport, onDeleteMany, items }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('danTocDipThamHoi');
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
  } = useDipThamHoiStore();

  const selectedCount = selectedIds.size;

  const trangThaiOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.trang_thai?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const v of TRANG_THAI_VALUES) {
      if (!map.has(v)) map.set(v, 0);
    }
    return [...map.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const activeFilterCount = useMemo(
    () =>
      (searchTerm ? 1 : 0) +
      countDipThamHoiColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.trang_thai_filter.length > 0 ? 1 : 0),
    [searchTerm, filters],
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useDipThamHoiStore.getState().setFilter('columnSearch', {});
    setFilter('trang_thai_filter', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai_filter}
          onChange={(val) => setFilter('trang_thai_filter', val)}
          placeholder={txt('danTocDipThamHoi.store.trangThaiCol')}
          icon={ListChecks}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
      </div>
    ),
    [trangThaiOptions, filters.trang_thai_filter, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai_filter',
        label: txt('danTocDipThamHoi.store.trangThaiCol'),
        icon: ListChecks,
        options: trangThaiOptions,
        value: filters.trang_thai_filter,
        onChange: (val: string[]) => setFilter('trang_thai_filter', val),
      },
    ],
    [trangThaiOptions, filters.trang_thai_filter, setFilter],
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
      <div className="hidden sm:flex items-center gap-2">
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
      {canCreate ? (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{txt('common.addNew')}</span>
        </Button>
      ) : null}
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
      searchPlaceholder={txt('danTocDipThamHoi.searchPlaceholder')}
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

export default DipThamHoiToolbar;
