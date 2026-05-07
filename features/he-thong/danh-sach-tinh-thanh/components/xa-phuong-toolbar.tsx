import React, { useMemo } from 'react';
import { Plus, Download, Upload, MapPin } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import type { Option } from '@/components/ui/Combobox';
import type { Option as ChipOption } from '@/components/ui/MultiSelect';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import GenericToolbar from '@/components/shared/GenericToolbar';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useXaPhuongStore } from '../store/useXaPhuongStore';
import { countColumnSearchActive } from '../utils/column-search';

interface Props {
  desktopStartSlot?: React.ReactNode;
  tinhOptions: Option[];
  selectedTinhId: string;
  onTinhChange: (id: string) => void;
  onAdd: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const XaPhuongToolbar: React.FC<Props> = ({
  desktopStartSlot,
  tinhOptions,
  selectedTinhId,
  onTinhChange,
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
  } = useXaPhuongStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const colN = countColumnSearchActive(filters.columnSearch);
    const tinhScope = selectedTinhId.trim() ? 1 : 0;
    return (searchTerm ? 1 : 0) + colN + tinhScope;
  }, [searchTerm, filters.columnSearch, selectedTinhId]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    onTinhChange('');
  };

  const mobileTinhOptions = useMemo(
    () => tinhOptions.map((o) => ({ label: o.label, value: String(o.value) })),
    [tinhOptions],
  );

  const chipTinhOptions: ChipOption[] = useMemo(
    () => tinhOptions.map((o) => ({ label: o.label, value: String(o.value) })),
    [tinhOptions],
  );

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        key: 'tinh',
        label: txt('diaBan.filterTinh'),
        icon: MapPin,
        options: mobileTinhOptions,
        value: selectedTinhId ? [selectedTinhId] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          onTinhChange(pick);
        },
      },
    ],
    [mobileTinhOptions, selectedTinhId, onTinhChange],
  );

  const mobileActions = useMemo(
    () => [
      ...(canImport && onImport && mobileTinhOptions.length > 0
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport && onExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [canImport, canExport, onImport, onExport, mobileTinhOptions.length],
  );

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <FilterChipSingleSelect
        options={chipTinhOptions}
        value={selectedTinhId ? selectedTinhId : null}
        onChange={(v) => onTinhChange(v ?? '')}
        placeholder={txt('diaBan.filterTinhChipPlaceholder')}
        icon={MapPin}
        className="shrink-0 w-full min-w-0 sm:w-[200px] sm:max-w-[280px]"
      />
    </div>
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
              disabled={mobileTinhOptions.length === 0}
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
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
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
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
          disabled={!selectedTinhId}
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4 disabled:opacity-50"
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
      onAdd={canCreate && selectedTinhId ? onAdd : undefined}
      searchPlaceholder={txt('common.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete && selectedCount > 0 ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      desktopStartSlot={desktopStartSlot}
    />
  );
};

export default XaPhuongToolbar;
