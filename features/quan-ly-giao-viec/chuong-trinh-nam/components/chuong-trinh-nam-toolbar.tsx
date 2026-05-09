import React, { useMemo } from 'react';
import { Plus, Download, Tag, Building2, CalendarRange } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useChuongTrinhNamStore } from '../store/useChuongTrinhNamStore';
import { countChuongTrinhNamColumnSearchActive } from '../utils/column-search-count';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  /** Tab Danh sách / Thống kê — sau nút Back trên GenericToolbar */
  tabsSlot?: React.ReactNode;
  trangThaiOptions: ChipOption[];
  phongBanOptions: ChipOption[];
  namBatDauOptions: ChipOption[];
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const ChuongTrinhNamToolbar: React.FC<Props> = ({
  onPageBack,
  tabsSlot,
  trangThaiOptions,
  phongBanOptions,
  namBatDauOptions,
  onAdd,
  onExport,
  onDeleteMany,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('annualPrograms');

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
  } = useChuongTrinhNamStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countChuongTrinhNamColumnSearchActive(filters.columnSearch, {
        id_phong_ban: filters.id_phong_ban,
        nam_bat_dau: filters.nam_bat_dau,
      }) +
      (filters.trang_thai.length > 0 ? 1 : 0) +
      (filters.id_phong_ban.length > 0 ? 1 : 0) +
      (filters.nam_bat_dau.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    const st = useChuongTrinhNamStore.getState();
    st.setFilter('columnSearch', {});
    st.setFilter('trang_thai', []);
    st.setFilter('id_phong_ban', []);
    st.setFilter('nam_bat_dau', []);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai}
          onChange={(val) => setFilter('trang_thai', val)}
          placeholder={txt('chuongTrinhNam.store.trangThaiCol')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={phongBanOptions}
          value={filters.id_phong_ban}
          onChange={(val) => setFilter('id_phong_ban', val)}
          placeholder={txt('chuongTrinhNam.store.phongBanCol')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={namBatDauOptions}
          value={filters.nam_bat_dau}
          onChange={(val) => setFilter('nam_bat_dau', val)}
          placeholder={txt('chuongTrinhNam.filter.namBatDauChip')}
          icon={CalendarRange}
          className="shrink-0 w-full min-w-0 sm:w-[min(160px,22vw)] sm:max-w-[200px]"
        />
      </div>
    ),
    [
      trangThaiOptions,
      phongBanOptions,
      namBatDauOptions,
      filters.trang_thai,
      filters.id_phong_ban,
      filters.nam_bat_dau,
      setFilter,
    ],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai',
        label: txt('chuongTrinhNam.store.trangThaiCol'),
        icon: Tag,
        options: trangThaiOptions,
        value: filters.trang_thai,
        onChange: (val: string[]) => setFilter('trang_thai', val),
      },
      {
        key: 'id_phong_ban',
        label: txt('chuongTrinhNam.store.phongBanCol'),
        icon: Building2,
        options: phongBanOptions,
        value: filters.id_phong_ban,
        onChange: (val: string[]) => setFilter('id_phong_ban', val),
      },
      {
        key: 'nam_bat_dau',
        label: txt('chuongTrinhNam.filter.namBatDauChip'),
        icon: CalendarRange,
        options: namBatDauOptions,
        value: filters.nam_bat_dau,
        onChange: (val: string[]) => setFilter('nam_bat_dau', val),
      },
    ],
    [
      trangThaiOptions,
      phongBanOptions,
      namBatDauOptions,
      filters.trang_thai,
      filters.id_phong_ban,
      filters.nam_bat_dau,
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
      searchPlaceholder={txt('chuongTrinhNam.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      desktopStartSlot={tabsSlot}
    />
  );
};

export default ChuongTrinhNamToolbar;
