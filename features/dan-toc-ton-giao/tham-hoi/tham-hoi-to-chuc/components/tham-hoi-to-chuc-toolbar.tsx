import React, { useMemo } from 'react';
import { Plus, Download, Upload, Building2, ListChecks } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useThamHoiToChucStore } from '../store/useThamHoiToChucStore';
import { countThamHoiToChucColumnSearchActive } from '../utils/column-search';
import { TIEN_DO_VALUES } from '../core/constants';
import type { ThamHoiToChuc } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: ThamHoiToChuc[] | null;
}

const ThamHoiToChucToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('danTocThamHoiToChuc');
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
  } = useThamHoiToChucStore();

  const selectedCount = selectedIds.size;

  const tienDoOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.tien_do?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const v of TIEN_DO_VALUES) {
      if (!map.has(v)) map.set(v, 0);
    }
    return [...map.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const toChucOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of itemRows) {
      if (!r.to_chuc_id) continue;
      const label = r.ten_co_so?.trim() || r.to_chuc_id;
      const cur = map.get(r.to_chuc_id);
      if (cur) cur.count += 1;
      else map.set(r.to_chuc_id, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countThamHoiToChucColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.tien_do_filter.length > 0 ? 1 : 0) +
      (filters.to_chuc_filter.length > 0 ? 1 : 0) +
      (filters.dip_tham_hoi_filter.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useThamHoiToChucStore.getState().setFilter('columnSearch', {});
    setFilter('tien_do_filter', []);
    setFilter('to_chuc_filter', []);
    setFilter('dip_tham_hoi_filter', []);
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
      </div>
    ),
    [tienDoOptions, toChucOptions, filters, setFilter],
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
    ],
    [tienDoOptions, toChucOptions, filters, setFilter],
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
      searchPlaceholder={txt('danTocThamHoiToChuc.searchPlaceholder')}
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
