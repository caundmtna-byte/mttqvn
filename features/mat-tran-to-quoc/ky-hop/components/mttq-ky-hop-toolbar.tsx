import React, { useMemo } from 'react';
import { Plus, Download, Upload, CalendarDays, MapPin, Hash } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqKyHopStore } from '../store/useMttqKyHopStore';
import { countKyHopColumnSearchActive } from '../utils/column-search';
import type { MttqKyHopHeaderOption } from './mttq-ky-hop-table';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
  nhiemKyOptions: MttqKyHopHeaderOption[];
  donViOptions: MttqKyHopHeaderOption[];
  namOptions: MttqKyHopHeaderOption[];
}

const MttqKyHopToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  nhiemKyOptions,
  donViOptions,
  namOptions,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('matTranSession');

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
  } = useMttqKyHopStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countKyHopColumnSearchActive(filters.columnSearch);
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.nhiem_ky_filter.length > 0 ? 1 : 0) +
      (filters.don_vi_filter.length > 0 ? 1 : 0) +
      (filters.nam_filter.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('nhiem_ky_filter', []);
    setFilter('don_vi_filter', []);
    setFilter('nam_filter', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={nhiemKyOptions}
          value={filters.nhiem_ky_filter}
          onChange={(val) => setFilter('nhiem_ky_filter', val)}
          placeholder={txt('matTranKyHop.store.tenNhiemKyCol')}
          icon={Hash}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={donViOptions}
          value={filters.don_vi_filter}
          onChange={(val) => setFilter('don_vi_filter', val)}
          placeholder={txt('matTranKyHop.store.donViCol')}
          icon={MapPin}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={namOptions}
          value={filters.nam_filter}
          onChange={(val) => setFilter('nam_filter', val)}
          placeholder={txt('matTranKyHop.store.ngayHopCol')}
          icon={CalendarDays}
          className="shrink-0 w-full min-w-0 sm:w-[min(140px,22vw)] sm:max-w-[180px]"
        />
      </div>
    ),
    [nhiemKyOptions, donViOptions, namOptions, filters.nhiem_ky_filter, filters.don_vi_filter, filters.nam_filter, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'nhiem_ky_filter',
        label: txt('matTranKyHop.store.tenNhiemKyCol'),
        icon: Hash,
        options: nhiemKyOptions,
        value: filters.nhiem_ky_filter,
        onChange: (val: string[]) => setFilter('nhiem_ky_filter', val),
      },
      {
        key: 'don_vi_filter',
        label: txt('matTranKyHop.store.donViCol'),
        icon: MapPin,
        options: donViOptions,
        value: filters.don_vi_filter,
        onChange: (val: string[]) => setFilter('don_vi_filter', val),
      },
      {
        key: 'nam_filter',
        label: txt('matTranKyHop.store.ngayHopCol'),
        icon: CalendarDays,
        options: namOptions,
        value: filters.nam_filter,
        onChange: (val: string[]) => setFilter('nam_filter', val),
      },
    ],
    [nhiemKyOptions, donViOptions, namOptions, filters.nhiem_ky_filter, filters.don_vi_filter, filters.nam_filter, setFilter],
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

  const desktopStartSlot = (
    <div className="hidden sm:flex shrink-0 items-center gap-2 border-r border-border pr-3 mr-1 min-w-0">
      <CalendarDays className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
      <span className="text-sm font-semibold text-foreground truncate max-w-[10rem] md:max-w-[14rem]">
        {txt('matTranKyHop.toolbar.title')}
      </span>
    </div>
  );

  return (
    <GenericToolbar
      desktopStartSlot={desktopStartSlot}
      selectedCount={selectedCount}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranKyHop.searchPlaceholder')}
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

export default MttqKyHopToolbar;
