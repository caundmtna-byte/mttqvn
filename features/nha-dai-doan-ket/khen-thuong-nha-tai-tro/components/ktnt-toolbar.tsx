import React, { useMemo } from 'react';
import {
  Plus,
  Download,
  Award,
  CalendarRange,
  Landmark,
  Layers,
  ListChecks,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useKhenThuongNhaTaiTroStore } from '../store/useKhenThuongNhaTaiTroStore';
import type { KhenThuongNhaTaiTroFilters } from '../core/types';
import { countNddkColumnSearchActive } from '../../danh-sach/utils/column-search';
import { buildNddkNamOptions } from '../../danh-sach/utils/nam-options';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';
import { useKhoDonViCuuTroList } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { khoDonViCuuTroLoaiComboboxOptions } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/core/loai';
import { KTNT_CAP_KHEN_VALUES, KTNT_TRANG_THAI_VALUES } from '../core/constants';

type ChipKey = Exclude<keyof KhenThuongNhaTaiTroFilters, 'columnSearch'>;

interface Props {
  tabSlot?: React.ReactNode;
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const L = (k: string) => txt(`khenThuongNhaTaiTro.store.${k}`);
const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

/** Chip hiện sẵn trên thanh công cụ; phần còn lại nằm trong bảng lọc. */
const INLINE_CHIPS: readonly ChipKey[] = [
  'nam_filter',
  'trang_thai_filter',
  'cap_khen_filter',
  'loai_nha_tai_tro_filter',
];

const KtntToolbar: React.FC<Props> = ({ tabSlot, onPageBack, onAdd, onExport, onDeleteMany }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('khenThuongNhaTaiTroList');

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
  } = useKhenThuongNhaTaiTroStore();

  const xaPhuongOptions = useNddkXaPhuongOptions();
  const { data: nhaTaiTroRows = [] } = useKhoDonViCuuTroList();

  // Tuỳ chọn lọc lấy từ HẰNG SỐ nghiệp vụ và danh mục, không suy từ dòng đang
  // tải: danh sách phân trang server nên dòng đang có chỉ là một trang.
  const specs = useMemo(
    (): { key: ChipKey; label: string; icon: LucideIcon; options: { value: string; label: string }[] }[] => [
      { key: 'nam_filter', label: L('ngayKhenCol'), icon: CalendarRange, options: buildNddkNamOptions() },
      { key: 'trang_thai_filter', label: L('trangThaiCol'), icon: ListChecks, options: toOptions(KTNT_TRANG_THAI_VALUES) },
      { key: 'cap_khen_filter', label: L('capKhenCol'), icon: Landmark, options: toOptions(KTNT_CAP_KHEN_VALUES) },
      {
        key: 'loai_nha_tai_tro_filter',
        label: L('loaiNhaTaiTroCol'),
        icon: Layers,
        options: khoDonViCuuTroLoaiComboboxOptions().map((o) => ({ value: o.value, label: o.label })),
      },
      {
        key: 'nha_tai_tro_filter',
        label: L('nhaTaiTroCol'),
        icon: Award,
        options: nhaTaiTroRows.map((d) => ({ value: d.id, label: d.ten })),
      },
      {
        key: 'xa_phuong_filter',
        label: L('xaPhuongCol'),
        icon: MapPin,
        options: xaPhuongOptions.map((o) => ({ value: o.value, label: o.label })),
      },
    ],
    [xaPhuongOptions, nhaTaiTroRows],
  );

  const activeFilterCount = useMemo(() => {
    const chipN = specs.filter((s) => filters[s.key].length > 0).length;
    return (searchTerm ? 1 : 0) + countNddkColumnSearchActive(filters.columnSearch) + chipN;
  }, [searchTerm, filters, specs]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    for (const s of specs) setFilter(s.key, []);
  };

  const filterGroups = useMemo(
    () =>
      specs.map((s) => ({
        key: s.key,
        label: s.label,
        icon: s.icon,
        options: s.options,
        value: filters[s.key],
        onChange: (vals: string[]) => setFilter(s.key, vals),
      })),
    [specs, filters, setFilter],
  );

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {specs
        .filter((s) => INLINE_CHIPS.includes(s.key))
        .map((s) => (
          <FilterChipMultiSelect
            key={s.key}
            options={s.options}
            value={filters[s.key]}
            onChange={(vals) => setFilter(s.key, vals)}
            placeholder={s.label}
            icon={s.icon}
            className="shrink-0"
          />
        ))}
    </div>
  );

  const mobileActions: ActionItem[] = useMemo(
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
          <span className="hidden sm:inline">{txt('common.add')}</span>
        </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
      tabSlot={tabSlot}
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      filters={filtersSlot}
      filterGroups={filterGroups}
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

export default KtntToolbar;
