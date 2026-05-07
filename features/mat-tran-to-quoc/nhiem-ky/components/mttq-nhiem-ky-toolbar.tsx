import React, { useMemo } from 'react';
import { Plus, Download, Upload, Hash } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqNhiemKyStore } from '../store/useMttqNhiemKyStore';
import { countNhiemKyColumnSearchActive } from '../utils/column-search';
import type { MttqNhiemKyHeaderOption } from './mttq-nhiem-ky-table';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
  tuNamOptions: MttqNhiemKyHeaderOption[];
  denNamOptions: MttqNhiemKyHeaderOption[];
}

const MttqNhiemKyToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  tuNamOptions,
  denNamOptions,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('matTranTerm');

  const {
    searchTerm,
    setSearchTerm,
    setFilter,
    setSort,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
    filters,
  } = useMttqNhiemKyStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countNhiemKyColumnSearchActive(filters.columnSearch);
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.tu_nam_filter.length > 0 ? 1 : 0) +
      (filters.den_nam_filter.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('tu_nam_filter', []);
    setFilter('den_nam_filter', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={tuNamOptions}
          value={filters.tu_nam_filter}
          onChange={(val) => setFilter('tu_nam_filter', val)}
          placeholder={txt('matTranNhiemKy.store.tuNamCol')}
          icon={Hash}
          className="shrink-0 w-full min-w-0 sm:w-[min(160px,22vw)] sm:max-w-[200px]"
        />
        <FilterChipMultiSelect
          options={denNamOptions}
          value={filters.den_nam_filter}
          onChange={(val) => setFilter('den_nam_filter', val)}
          placeholder={txt('matTranNhiemKy.store.denNamCol')}
          icon={Hash}
          className="shrink-0 w-full min-w-0 sm:w-[min(160px,22vw)] sm:max-w-[200px]"
        />
      </div>
    ),
    [tuNamOptions, denNamOptions, filters.tu_nam_filter, filters.den_nam_filter, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'tu_nam_filter',
        label: txt('matTranNhiemKy.store.tuNamCol'),
        icon: Hash,
        options: tuNamOptions,
        value: filters.tu_nam_filter,
        onChange: (val: string[]) => setFilter('tu_nam_filter', val),
      },
      {
        key: 'den_nam_filter',
        label: txt('matTranNhiemKy.store.denNamCol'),
        icon: Hash,
        options: denNamOptions,
        value: filters.den_nam_filter,
        onChange: (val: string[]) => setFilter('den_nam_filter', val),
      },
    ],
    [tuNamOptions, denNamOptions, filters.tu_nam_filter, filters.den_nam_filter, setFilter],
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
      searchPlaceholder={txt('matTranNhiemKy.searchPlaceholder')}
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

export default MttqNhiemKyToolbar;
