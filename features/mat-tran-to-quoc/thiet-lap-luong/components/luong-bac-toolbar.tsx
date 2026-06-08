import React, { useMemo } from 'react';
import { Layers, Plus } from 'lucide-react';
import type { Option } from '@/components/ui/MultiSelect';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { BTN_ADD } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useLuongBacTableStore } from '../store/useLuongBacTableStore';
import { countLuongBacColumnSearchActive } from '../utils/bac-column-search';

interface Props {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  ngachOptions: Option[];
  selectedNgachId: string | null;
  onNgachChange: (id: string | null) => void;
  /** Cùng hàng với chip ngạch: ô mức lương cơ sở (+ nút lưu) — đứng bên phải chip. */
  mlcsToolbarSlot: React.ReactNode;
  onAdd?: () => void;
  addDisabled?: boolean;
}

const LuongBacToolbar: React.FC<Props> = ({
  onPageBack,
  tabsSlot,
  ngachOptions,
  selectedNgachId,
  onNgachChange,
  mlcsToolbarSlot,
  onAdd,
  addDisabled = false,
}) => {
  const { canCreate } = useResourcePermissions('matTranSalarySetup');
  const {
    searchTerm,
    setSearchTerm,
    filters,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
    setSort,
  } = useLuongBacTableStore();

  const activeFilterCount = useMemo(() => {
    return (searchTerm ? 1 : 0) + countLuongBacColumnSearchActive(filters.columnSearch ?? {});
  }, [searchTerm, filters.columnSearch]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useLuongBacTableStore.getState().setFilter('columnSearch', {});
    setSort(null, null);
  };

  const filterGroups = useMemo(
    () =>
      ngachOptions.length === 0
        ? []
        : [
            {
              key: 'ngach',
              label: txt('matTranThietLapLuong.bac.filterNgachSheetGroup'),
              icon: Layers,
              options: ngachOptions.map((o) => ({
                label: o.label,
                value: o.value,
                count: o.count,
              })),
              value: selectedNgachId ? [selectedNgachId] : [],
              onChange: (vals: string[]) => {
                const last = vals.length ? vals[vals.length - 1] : '';
                onNgachChange(last || null);
              },
            },
          ],
    [ngachOptions, onNgachChange, selectedNgachId],
  );

  const filtersSlot = useMemo(
    () => (
      <div className="flex w-max min-w-0 max-w-full flex-nowrap items-center gap-2 sm:gap-3">
        {ngachOptions.length > 0 ? (
          <FilterChipSingleSelect
            options={ngachOptions}
            value={selectedNgachId}
            onChange={onNgachChange}
            placeholder={txt('matTranThietLapLuong.bac.filterNgachChipPlaceholder')}
            icon={Layers}
            className="shrink-0 w-[min(240px,52vw)] sm:w-[min(240px,28vw)] sm:max-w-[280px]"
          />
        ) : null}
        {ngachOptions.length > 0 ? (
          <div className="hidden h-6 w-px shrink-0 bg-border/80 sm:block" aria-hidden />
        ) : null}
        {mlcsToolbarSlot}
      </div>
    ),
    [mlcsToolbarSlot, ngachOptions, onNgachChange, selectedNgachId],
  );

  const renderActions = useMemo(
    () =>
      canCreate && onAdd ? (
        <Button
          type="button"
          onClick={onAdd}
          size="sm"
          disabled={addDisabled}
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{BTN_ADD()}</span>
        </Button>
      ) : null,
    [addDisabled, canCreate, onAdd],
  );

  return (
    <GenericToolbar
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={[]}
      searchPlaceholder={txt('matTranThietLapLuong.bac.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      tabSlot={tabsSlot}
      onAdd={canCreate && onAdd ? onAdd : undefined}
    />
  );
};

export default LuongBacToolbar;
