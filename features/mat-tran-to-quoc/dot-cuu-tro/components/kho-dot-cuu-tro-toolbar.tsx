import React, { useMemo } from 'react';
import { Plus, Download, Link2 } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { useKhoDotCuuTroStore } from '../store/useKhoDotCuuTroStore';
import { countKhoDotCuuTroColumnSearchActive } from '../utils/column-search';
import type { KhoDotCuuTroListRow } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: KhoDotCuuTroListRow[] | null;
}

const KhoDotCuuTroToolbar: React.FC<Props> = ({ onPageBack, onAdd, onExport, onDeleteMany, items }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranReliefCampaign');
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
  } = useKhoDotCuuTroStore();

  const selectedCount = selectedIds.size;

  const linkCounts = useMemo(() => {
    let has = 0;
    let empty = 0;
    for (const r of itemRows) {
      const link = (r.link ?? '').trim();
      if (link) has += 1;
      else empty += 1;
    }
    return { has, empty };
  }, [itemRows]);

  const linkChipOptions = useMemo(
    () => [
      { label: txt('matTranDotCuuTro.filterLinkHas'), value: 'has', count: linkCounts.has },
      { label: txt('matTranDotCuuTro.filterLinkEmpty'), value: 'empty', count: linkCounts.empty },
    ],
    [linkCounts.has, linkCounts.empty],
  );

  const activeFilterCount = useMemo(() => {
    const bucketOn = filters.link_bucket === 'has' || filters.link_bucket === 'empty' ? 1 : 0;
    return (searchTerm ? 1 : 0) + countKhoDotCuuTroColumnSearchActive(filters.columnSearch ?? {}) + bucketOn;
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useKhoDotCuuTroStore.getState().setFilter('columnSearch', {});
    setFilter('link_bucket', '');
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipSingleSelect
          options={linkChipOptions}
          value={filters.link_bucket || null}
          onChange={(v) => setFilter('link_bucket', v === 'has' || v === 'empty' ? v : '')}
          placeholder={txt('matTranDotCuuTro.filterLinkChipPlaceholder')}
          icon={Link2}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [filters.link_bucket, linkChipOptions, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'link_bucket',
        label: txt('matTranDotCuuTro.store.linkCol'),
        icon: Link2,
        options: linkChipOptions,
        value: filters.link_bucket ? [filters.link_bucket] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('link_bucket', pick === 'has' || pick === 'empty' ? pick : '');
        },
      },
    ],
    [linkChipOptions, filters.link_bucket, setFilter],
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
      searchPlaceholder={txt('matTranDotCuuTro.searchPlaceholder')}
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

export default KhoDotCuuTroToolbar;
