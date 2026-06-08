import React, { useMemo } from 'react';
import { Download, Tag, CalendarDays, ListFilter, GraduationCap, Plus } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqTapHuanChiTietListStore } from '../store/useMttqTapHuanChiTietListStore';
import { countTapHuanColumnSearchActive } from '../utils/column-search';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  onExport: () => void;
  onAdd?: () => void;
  capOptions: ChipOption[];
  namOptions: ChipOption[];
  lopOptions: ChipOption[];
  thuocDienOptions: ChipOption[];
  tabSlot?: React.ReactNode;
}

const MttqTapHuanChiTietToolbar: React.FC<Props> = ({
  onPageBack,
  onExport,
  onAdd,
  capOptions,
  namOptions,
  lopOptions,
  thuocDienOptions,
  tabSlot,
}) => {
  const { canExport, canEdit } = useResourcePermissions('matTranTrainingList');
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
  } = useMttqTapHuanChiTietListStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countTapHuanColumnSearchActive(filters.columnSearch);
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.cap_tap_huan.length > 0 ? 1 : 0) +
      (filters.nam_tap_huan.length > 0 ? 1 : 0) +
      (filters.id_lop_tap_huan.length > 0 ? 1 : 0) +
      (filters.thuoc_dien.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('cap_tap_huan', []);
    setFilter('nam_tap_huan', []);
    setFilter('id_lop_tap_huan', []);
    setFilter('thuoc_dien', []);
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
        <FilterChipMultiSelect
          options={lopOptions}
          value={filters.id_lop_tap_huan}
          onChange={(val) => setFilter('id_lop_tap_huan', val)}
          placeholder={txt('matTranTapHuan.chiTietList.lopChip')}
          icon={GraduationCap}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,30vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={thuocDienOptions}
          value={filters.thuoc_dien}
          onChange={(val) => setFilter('thuoc_dien', val)}
          placeholder={txt('matTranTapHuan.stats.thuocDienChip')}
          icon={ListFilter}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
      </div>
    ),
    [
      capOptions,
      namOptions,
      lopOptions,
      thuocDienOptions,
      filters.cap_tap_huan,
      filters.nam_tap_huan,
      filters.id_lop_tap_huan,
      filters.thuoc_dien,
      setFilter,
    ],
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
      {
        key: 'id_lop_tap_huan',
        label: txt('matTranTapHuan.chiTietList.lopChip'),
        icon: GraduationCap,
        options: lopOptions,
        value: filters.id_lop_tap_huan,
        onChange: (val: string[]) => setFilter('id_lop_tap_huan', val),
      },
      {
        key: 'thuoc_dien',
        label: txt('matTranTapHuan.stats.thuocDienChip'),
        icon: ListFilter,
        options: thuocDienOptions,
        value: filters.thuoc_dien,
        onChange: (val: string[]) => setFilter('thuoc_dien', val),
      },
    ],
    [
      capOptions,
      namOptions,
      lopOptions,
      thuocDienOptions,
      filters.cap_tap_huan,
      filters.nam_tap_huan,
      filters.id_lop_tap_huan,
      filters.thuoc_dien,
      setFilter,
    ],
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
      {canEdit && onAdd ? (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{txt('common.addNew')}</span>
        </Button>
      ) : null}
    </>
  );

  return (
    <GenericToolbar
      tabSlot={tabSlot}
      actions={renderActions}
      mobileActions={mobileActions}
      selectedCount={selectedCount}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      filters={filtersSlot}
      filterGroups={filterGroups}
      searchPlaceholder={txt('matTranTapHuan.chiTietList.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      onAdd={canEdit && onAdd ? onAdd : undefined}
      showBack
      onBack={onPageBack}
    />
  );
};

export default MttqTapHuanChiTietToolbar;
