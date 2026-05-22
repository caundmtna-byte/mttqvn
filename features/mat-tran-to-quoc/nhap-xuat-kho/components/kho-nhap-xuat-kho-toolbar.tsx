import React, { useMemo, type ReactNode } from 'react';
import { Plus, Download, Filter } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { useNhapXuatKhoStore } from '../store/useNhapXuatKhoStore';
import { countColumnSearchActive } from '../utils/column-search';
import type { NhapXuatKhoListRow } from '../core/types';
import { NHAP_XUAT_KHO_LOAI_PHIEU, type NhapXuatKhoLoaiPhieu } from '../core/constants';

interface Props {
  desktopStartSlot: ReactNode;
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: NhapXuatKhoListRow[] | null;
}

const NhapXuatKhoToolbar: React.FC<Props> = ({
  desktopStartSlot,
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranReliefStockTransactions');
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
  } = useNhapXuatKhoStore();

  const loaiCounts = useMemo(() => {
    const counts: Record<NhapXuatKhoLoaiPhieu, number> = {
      nhap_ngoai: 0,
      xuat_ngoai: 0,
      chuyen_kho: 0,
    };
    for (const r of itemRows) counts[r.loai_phieu] = (counts[r.loai_phieu] ?? 0) + 1;
    return counts;
  }, [itemRows]);

  const loaiOptions = useMemo(
    () =>
      NHAP_XUAT_KHO_LOAI_PHIEU.map((v) => ({
        label: txt(`matTranNhapXuatKho.loaiPhieu.${v}`),
        value: v,
        count: loaiCounts[v] ?? 0,
      })),
    [loaiCounts],
  );

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai_phieu ? 1 : 0)
    );
  }, [searchTerm, filters.columnSearch, filters.loai_phieu]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('loai_phieu', null);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipSingleSelect
          options={loaiOptions}
          value={filters.loai_phieu}
          onChange={(v) =>
            setFilter('loai_phieu', NHAP_XUAT_KHO_LOAI_PHIEU.includes(v as NhapXuatKhoLoaiPhieu) ? v : null)
          }
          placeholder={txt('matTranNhapXuatKho.loaiPhieu.all')}
          icon={Filter}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
        />
      </div>
    ),
    [filters.loai_phieu, loaiOptions, setFilter],
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
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filterGroups={[]}
      filters={filtersSlot}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranNhapXuatKho.searchPlaceholderList')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      desktopStartSlot={
        <div className="min-w-0 max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-px">
          {desktopStartSlot}
        </div>
      }
    />
  );
};

export default NhapXuatKhoToolbar;
