import React, { useMemo, type ReactNode } from 'react';
import { Plus, Download, AlignLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { txt } from '@/lib/text';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { BTN_ADD } from '@/lib/button-labels';
import type { GenericState } from '@/store/createGenericStore';
import type { MttqThietLap, MttqThietLapFilters } from '../core/types';
import { countMttqColumnSearchActive } from '../utils/column-search';

interface Props {
  store: GenericState<MttqThietLapFilters>;
  /** Danh sách theo tab loại — luôn chuẩn hóa mảng trong component (tránh lỗi khi `undefined`/null). */
  items?: MttqThietLap[] | null;
  /** Sau nút Back — TabGroup (chuẩn Tỉnh thành – xã phường). */
  desktopStartSlot: ReactNode;
  onPageBack?: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const MttqThietLapToolbar: React.FC<Props> = ({
  store,
  items,
  desktopStartSlot,
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
}) => {
  const itemRows = Array.isArray(items) ? items : [];

  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranThietLapCaiDat');

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
  } = store;

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
      { label: txt('page.matTranThietLap.filterMoTaHas'), value: 'has', count: moTaCounts.has },
      { label: txt('page.matTranThietLap.filterMoTaEmpty'), value: 'empty', count: moTaCounts.empty },
    ],
    [moTaCounts.has, moTaCounts.empty],
  );

  const activeFilterCount = useMemo(() => {
    const colN = countMttqColumnSearchActive(filters.columnSearch, filters.mo_ta_bucket);
    const bucketOn = filters.mo_ta_bucket === 'has' || filters.mo_ta_bucket === 'empty' ? 1 : 0;
    return (searchTerm ? 1 : 0) + colN + bucketOn;
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('mo_ta_bucket', '');
  };

  const filterGroups = useMemo(
    () => [
      {
        key: 'mo_ta_bucket',
        label: txt('page.articleSettings.colMoTa'),
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

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipSingleSelect
          options={moTaChipOptions}
          value={filters.mo_ta_bucket || null}
          onChange={(v) => setFilter('mo_ta_bucket', v === 'has' || v === 'empty' ? v : '')}
          placeholder={txt('page.matTranThietLap.filterMoTaChipPlaceholder')}
          icon={AlignLeft}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [moTaChipOptions, filters.mo_ta_bucket, setFilter],
  );

  const mobileActions = useMemo(
    () =>
      canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : [],
    [canExport, onExport],
  );

  const renderActions = (
    <>
      {canExport && (
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
      )}
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{BTN_ADD()}</span>
        </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      desktopStartSlot={desktopStartSlot}
      filters={filtersSlot}
      filterGroups={filterGroups}
      searchPlaceholder={txt('common.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack={Boolean(onPageBack)}
      onBack={onPageBack}
    />
  );
};

export default MttqThietLapToolbar;
