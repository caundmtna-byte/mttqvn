import React, { useMemo } from 'react';
import { Plus, Download, Upload, MapPin, Users, Activity } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useThongTinCaNhanTieuBieuStore } from '../store/useThongTinCaNhanTieuBieuStore';
import { countThongTinCaNhanTieuBieuColumnSearchActive } from '../utils/column-search';
import { DOI_TUONG_VALUES } from '../core/constants';
import type { ThongTinCaNhanTieuBieu } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: ThongTinCaNhanTieuBieu[] | null;
}

const ThongTinCaNhanTieuBieuToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('danTocCaNhanTieuBieu');
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
  } = useThongTinCaNhanTieuBieuStore();

  const selectedCount = selectedIds.size;

  const doiTuongOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.doi_tuong?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const v of DOI_TUONG_VALUES) {
      if (!map.has(v)) map.set(v, 0);
    }
    return [...map.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const trangThaiOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.trang_thai?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

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

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countThongTinCaNhanTieuBieuColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.doi_tuong_filter.length > 0 ? 1 : 0) +
      (filters.trang_thai_filter.length > 0 ? 1 : 0) +
      (filters.don_vi_filter.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useThongTinCaNhanTieuBieuStore.getState().setFilter('columnSearch', {});
    setFilter('doi_tuong_filter', []);
    setFilter('trang_thai_filter', []);
    setFilter('don_vi_filter', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={doiTuongOptions}
          value={filters.doi_tuong_filter}
          onChange={(val) => setFilter('doi_tuong_filter', val)}
          placeholder={txt('danTocCaNhanTieuBieu.store.doiTuongCol')}
          icon={Users}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai_filter}
          onChange={(val) => setFilter('trang_thai_filter', val)}
          placeholder={txt('danTocCaNhanTieuBieu.store.trangThaiCol')}
          icon={Activity}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,24vw)] sm:max-w-[220px]"
        />
        <FilterChipMultiSelect
          options={donViOptions}
          value={filters.don_vi_filter}
          onChange={(val) => setFilter('don_vi_filter', val)}
          placeholder={txt('danTocCaNhanTieuBieu.store.donViCol')}
          icon={MapPin}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [doiTuongOptions, trangThaiOptions, donViOptions, filters, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'doi_tuong_filter',
        label: txt('danTocCaNhanTieuBieu.store.doiTuongCol'),
        icon: Users,
        options: doiTuongOptions,
        value: filters.doi_tuong_filter,
        onChange: (val: string[]) => setFilter('doi_tuong_filter', val),
      },
      {
        key: 'trang_thai_filter',
        label: txt('danTocCaNhanTieuBieu.store.trangThaiCol'),
        icon: Activity,
        options: trangThaiOptions,
        value: filters.trang_thai_filter,
        onChange: (val: string[]) => setFilter('trang_thai_filter', val),
      },
      {
        key: 'don_vi_filter',
        label: txt('danTocCaNhanTieuBieu.store.donViCol'),
        icon: MapPin,
        options: donViOptions,
        value: filters.don_vi_filter,
        onChange: (val: string[]) => setFilter('don_vi_filter', val),
      },
    ],
    [doiTuongOptions, trangThaiOptions, donViOptions, filters, setFilter],
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
      searchPlaceholder={txt('danTocCaNhanTieuBieu.searchPlaceholder')}
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

export default ThongTinCaNhanTieuBieuToolbar;
