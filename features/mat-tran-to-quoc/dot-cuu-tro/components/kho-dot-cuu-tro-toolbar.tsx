import React, { useMemo } from 'react';
import { Plus, Download, Tag, Activity } from 'lucide-react';
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
import { DOT_LOAI_VALUES, DOT_TRANG_THAI_VALUES, type DotLoai, type DotTrangThai } from '../core/constants';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: KhoDotCuuTroListRow[] | null;
}

const KhoDotCuuTroToolbar: React.FC<Props> = ({ onPageBack, onAdd, onExport, onDeleteMany, items }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranReliefCampaign');
  const itemRows = useMemo(() => (Array.isArray(items) ? items : []), [items]);

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

  const chipOptions = useMemo(() => {
    const dem = (key: 'loai' | 'trang_thai', v: string) => itemRows.filter((r) => r[key] === v).length;
    return {
      loai: DOT_LOAI_VALUES.map((v) => ({ label: v, value: v, count: dem('loai', v) })),
      trangThai: DOT_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v, count: dem('trang_thai', v) })),
    };
  }, [itemRows]);

  const activeFilterCount = useMemo(
    () =>
      (searchTerm ? 1 : 0) +
      countKhoDotCuuTroColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai ? 1 : 0) +
      (filters.trang_thai ? 1 : 0),
    [searchTerm, filters],
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useKhoDotCuuTroStore.getState().setFilter('columnSearch', {});
    setFilter('loai', '');
    setFilter('trang_thai', '');
    setSort(null, null);
  };

  const setLoai = (v: string | null | undefined) =>
    setFilter('loai', (DOT_LOAI_VALUES as readonly string[]).includes(v ?? '') ? (v as DotLoai) : '');
  const setTrangThai = (v: string | null | undefined) =>
    setFilter(
      'trang_thai',
      (DOT_TRANG_THAI_VALUES as readonly string[]).includes(v ?? '') ? (v as DotTrangThai) : '',
    );

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <FilterChipSingleSelect
        options={chipOptions.loai}
        value={filters.loai || null}
        onChange={setLoai}
        placeholder={txt('matTranDotCuuTro.filterLoaiPlaceholder')}
        icon={Tag}
        className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
      />
      <FilterChipSingleSelect
        options={chipOptions.trangThai}
        value={filters.trang_thai || null}
        onChange={setTrangThai}
        placeholder={txt('matTranDotCuuTro.filterTrangThaiPlaceholder')}
        icon={Activity}
        className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
      />
    </div>
  );

  const filterGroups = [
    {
      key: 'loai',
      label: txt('matTranDotCuuTro.store.loaiCol'),
      icon: Tag,
      options: chipOptions.loai,
      value: filters.loai ? [filters.loai] : [],
      onChange: (vals: string[]) => setLoai(vals[vals.length - 1]),
    },
    {
      key: 'trang_thai',
      label: txt('matTranDotCuuTro.store.trangThaiCol'),
      icon: Activity,
      options: chipOptions.trangThai,
      value: filters.trang_thai ? [filters.trang_thai] : [],
      onChange: (vals: string[]) => setTrangThai(vals[vals.length - 1]),
    },
  ];

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
