import React, { useMemo } from 'react';
import { Plus, Download, Tag, CalendarDays } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqLopTapHuanStore } from '../store/useMttqLopTapHuanStore';
import { countTapHuanColumnSearchActive } from '../utils/column-search';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  capOptions: ChipOption[];
  namOptions: ChipOption[];
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const MttqLopTapHuanToolbar: React.FC<Props> = ({
  onPageBack,
  capOptions,
  namOptions,
  onAdd,
  onExport,
  onDeleteMany,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranTrainingList');

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    setSort,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
  } = useMttqLopTapHuanStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countTapHuanColumnSearchActive(filters.columnSearch);
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.cap_tap_huan.length > 0 ? 1 : 0) +
      (filters.nam_tap_huan.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('cap_tap_huan', []);
    setFilter('nam_tap_huan', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={capOptions}
          value={filters.cap_tap_huan}
          onChange={(val) => setFilter('cap_tap_huan', val)}
          placeholder={txt('matTranTapHuan.store.capCol')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,26vw)] sm:max-w-[220px]"
        />
        <FilterChipMultiSelect
          options={namOptions}
          value={filters.nam_tap_huan}
          onChange={(val) => setFilter('nam_tap_huan', val)}
          placeholder={txt('matTranTapHuan.store.namCol')}
          icon={CalendarDays}
          className="shrink-0 w-full min-w-0 sm:w-[min(160px,22vw)] sm:max-w-[200px]"
        />
      </div>
    ),
    [capOptions, namOptions, filters.cap_tap_huan, filters.nam_tap_huan, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'cap_tap_huan',
        label: txt('matTranTapHuan.store.capCol'),
        icon: Tag,
        options: capOptions,
        value: filters.cap_tap_huan,
        onChange: (val: string[]) => setFilter('cap_tap_huan', val),
      },
      {
        key: 'nam_tap_huan',
        label: txt('matTranTapHuan.store.namCol'),
        icon: CalendarDays,
        options: namOptions,
        value: filters.nam_tap_huan,
        onChange: (val: string[]) => setFilter('nam_tap_huan', val),
      },
    ],
    [capOptions, namOptions, filters.cap_tap_huan, filters.nam_tap_huan, setFilter],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () =>
      canExport
        ? [
            {
              key: 'export',
              label: txt('common.export'),
              icon: Download,
              onClick: onExport,
              description: '',
            },
          ]
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
      searchPlaceholder={txt('matTranTapHuan.searchPlaceholder')}
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

export default MttqLopTapHuanToolbar;
