import React, { useMemo } from 'react';
import { Plus, Download, AlignLeft } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { useLuongThietLapNgachStore } from '../store/useLuongThietLapNgachStore';
import { countLuongThietLapNgachColumnSearchActive } from '../utils/column-search';
import type { LuongThietLapNgachListRow } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  tabsSlot: React.ReactNode;
  items?: LuongThietLapNgachListRow[] | null;
}

const LuongNgachToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
  tabsSlot,
  items,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranSalarySetup');
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
  } = useLuongThietLapNgachStore();

  const selectedCount = selectedIds.size;

  const moTaCounts = useMemo(() => {
    let has = 0;
    let empty = 0;
    for (const r of itemRows) {
      const mo = (r.mo_ta ?? '').trim();
      if (mo) has += 1;
      else empty += 1;
    }
    return { has, empty };
  }, [itemRows]);

  const moTaChipOptions = useMemo(
    () => [
      { label: txt('matTranThietLapLuong.filterMoTaHas'), value: 'has', count: moTaCounts.has },
      { label: txt('matTranThietLapLuong.filterMoTaEmpty'), value: 'empty', count: moTaCounts.empty },
    ],
    [moTaCounts.has, moTaCounts.empty],
  );

  const activeFilterCount = useMemo(() => {
    const bucketOn = filters.mo_ta_bucket === 'has' || filters.mo_ta_bucket === 'empty' ? 1 : 0;
    return (searchTerm ? 1 : 0) + countLuongThietLapNgachColumnSearchActive(filters.columnSearch ?? {}) + bucketOn;
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useLuongThietLapNgachStore.getState().setFilter('columnSearch', {});
    setFilter('mo_ta_bucket', '');
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipSingleSelect
          options={moTaChipOptions}
          value={filters.mo_ta_bucket || null}
          onChange={(v) => setFilter('mo_ta_bucket', v === 'has' || v === 'empty' ? v : '')}
          placeholder={txt('matTranThietLapLuong.filterMoTaChipPlaceholder')}
          icon={AlignLeft}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [filters.mo_ta_bucket, moTaChipOptions, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'mo_ta_bucket',
        label: txt('matTranThietLapLuong.store.moTaCol'),
        icon: AlignLeft,
        options: moTaChipOptions,
        value: filters.mo_ta_bucket ? [filters.mo_ta_bucket] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('mo_ta_bucket', pick === 'has' || pick === 'empty' ? pick : '');
        },
      },
    ],
    [moTaChipOptions, filters.mo_ta_bucket, setFilter],
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
      searchPlaceholder={txt('matTranThietLapLuong.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      tabSlot={tabsSlot}
    />
  );
};

export default LuongNgachToolbar;
