import React, { useMemo } from 'react';
import { Layers, Plus, Download, Upload } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useTinhThanhStore } from '../store/useTinhThanhStore';
import { countColumnSearchActive } from '../utils/column-search';

interface Props {
  tabSlot?: React.ReactNode;
  /** Đếm theo danh sách tỉnh đầy đủ (trước lọc chip) — đồng bộ số trong dropdown. */
  soXaCounts: { has: number; none: number };
  onAdd: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const TinhThanhToolbar: React.FC<Props> = ({
  tabSlot,
  soXaCounts,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
}) => {
  const { canCreate, canDelete, canExport, canImport } = useResourcePermissions('provinces');
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
  } = useTinhThanhStore();

  const selectedCount = selectedIds.size;

  const soXaChipOptions = useMemo(
    () => [
      { label: txt('diaBan.filterSoXaHas'), value: 'has', count: soXaCounts.has },
      { label: txt('diaBan.filterSoXaNone'), value: 'none', count: soXaCounts.none },
    ],
    [soXaCounts.has, soXaCounts.none],
  );

  const activeFilterCount = useMemo(() => {
    const colN = countColumnSearchActive(filters.columnSearch);
    const soXaOn = filters.so_xa_bucket ? 1 : 0;
    return (searchTerm ? 1 : 0) + colN + soXaOn;
  }, [searchTerm, filters.columnSearch, filters.so_xa_bucket]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('so_xa_bucket', '');
  };

  const filterGroups = useMemo(
    () => [
      {
        key: 'so_xa_bucket',
        label: txt('diaBan.filterSoXaGroup'),
        icon: Layers,
        options: soXaChipOptions,
        value: filters.so_xa_bucket ? [filters.so_xa_bucket] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('so_xa_bucket', pick === 'has' || pick === 'none' ? pick : '');
        },
      },
    ],
    [filters.so_xa_bucket, soXaChipOptions, setFilter],
  );

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipSingleSelect
          options={soXaChipOptions}
          value={filters.so_xa_bucket || null}
          onChange={(v) => setFilter('so_xa_bucket', v === 'has' || v === 'none' ? v : '')}
          placeholder={txt('diaBan.filterSoXaChipPlaceholder')}
          icon={Layers}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [soXaChipOptions, filters.so_xa_bucket, setFilter],
  );

  const mobileActions = useMemo(
    () => [
      ...(canImport && onImport
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport && onExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [canImport, canExport, onImport, onExport],
  );

  const renderActions = (
    <>
      <div className="hidden sm:flex items-center gap-2">
        {canImport && onImport && (
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
        )}
        {canExport && onExport && (
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
        )}
      </div>
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:mr-2" />
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
      searchPlaceholder={txt('common.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      tabSlot={tabSlot}
    />
  );
};

export default TinhThanhToolbar;
