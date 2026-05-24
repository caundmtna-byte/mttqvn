import React, { useMemo } from 'react';
import { Plus, Download, MapPin, Building2 } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useKhoDanhSachKhoStore } from '../store/useKhoDanhSachKhoStore';
import { countKhoDanhSachKhoColumnSearchActive } from '../utils/column-search';
import type { KhoDanhSachKhoListRow } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: KhoDanhSachKhoListRow[] | null;
}

const KhoDanhSachKhoToolbar: React.FC<Props> = ({ onPageBack, onAdd, onExport, onDeleteMany, items }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranReliefWarehouseList');
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
  } = useKhoDanhSachKhoStore();

  const selectedCount = selectedIds.size;

  const donViOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of itemRows) {
      if (!r.don_vi_id) continue;
      const label = r.ten_don_vi?.trim() || r.don_vi_id;
      const cur = map.get(r.don_vi_id);
      if (cur) cur.count += 1;
      else map.set(r.don_vi_id, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const tinhOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of itemRows) {
      const raw = (r.ten_tinh ?? '').trim();
      if (!raw) continue;
      const cur = map.get(raw);
      if (cur) cur.count += 1;
      else map.set(raw, { label: raw, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countKhoDanhSachKhoColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.don_vi_id.length > 0 ? 1 : 0) +
      (filters.ten_tinh.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useKhoDanhSachKhoStore.getState().setFilter('columnSearch', {});
    setFilter('don_vi_id', []);
    setFilter('ten_tinh', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={donViOptions}
          value={filters.don_vi_id}
          onChange={(val) => setFilter('don_vi_id', val)}
          placeholder={txt('matTranKhoDanhSach.store.donViCol')}
          icon={MapPin}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={tinhOptions}
          value={filters.ten_tinh}
          onChange={(val) => setFilter('ten_tinh', val)}
          placeholder={txt('matTranKhoDanhSach.store.tinhCol')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
      </div>
    ),
    [donViOptions, tinhOptions, filters.don_vi_id, filters.ten_tinh, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'don_vi_id',
        label: txt('matTranKhoDanhSach.store.donViCol'),
        icon: MapPin,
        options: donViOptions,
        value: filters.don_vi_id,
        onChange: (val: string[]) => setFilter('don_vi_id', val),
      },
      {
        key: 'ten_tinh',
        label: txt('matTranKhoDanhSach.store.tinhCol'),
        icon: Building2,
        options: tinhOptions,
        value: filters.ten_tinh,
        onChange: (val: string[]) => setFilter('ten_tinh', val),
      },
    ],
    [donViOptions, tinhOptions, filters.don_vi_id, filters.ten_tinh, setFilter],
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
      selectedCount={selectedCount}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranKhoDanhSach.searchPlaceholder')}
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

export default KhoDanhSachKhoToolbar;
