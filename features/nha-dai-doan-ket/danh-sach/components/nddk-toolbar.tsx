import React, { useMemo } from 'react';
import { Plus, Download, CalendarRange, Coins, Hammer, ListChecks, MapPin, Users } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useNhaDaiDoanKetStore } from '../store/useNhaDaiDoanKetStore';
import { countNddkColumnSearchActive } from '../utils/column-search';
import { buildNddkNamOptions } from '../utils/nam-options';
import { useNddkXaPhuongOptions } from '../hooks/use-nddk-xa-phuong-options';
import {
  NDDK_DOI_TUONG_VALUES,
  NDDK_LOAI_HINH_VALUES,
  NDDK_NGUON_HO_TRO_VALUES,
  NDDK_NGUON_VALUES,
  NDDK_TRANG_THAI_VALUES,
} from '../core/constants';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const NddkToolbar: React.FC<Props> = ({ onPageBack, onAdd, onExport, onDeleteMany }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('nhaDaiDoanKetList');

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
  } = useNhaDaiDoanKetStore();

  // Tuỳ chọn lọc lấy từ HẰNG SỐ nghiệp vụ và danh mục xã/phường, không suy từ
  // các dòng đang tải: danh sách phân trang phía máy chủ nên dòng đang có chỉ
  // là một trang. Cũng không kèm số đếm vì dưới phân trang server nó chỉ đếm
  // được một trang — số sai còn tệ hơn không có số.
  const namOptions = useMemo(() => buildNddkNamOptions(), []);
  const nguonOptions = useMemo(() => NDDK_NGUON_VALUES.map((v) => ({ value: v, label: v })), []);
  const nguonHoTroOptions = useMemo(
    () => NDDK_NGUON_HO_TRO_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );
  const doiTuongOptions = useMemo(
    () => NDDK_DOI_TUONG_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );
  const loaiHinhOptions = useMemo(
    () => NDDK_LOAI_HINH_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );
  const trangThaiOptions = useMemo(
    () => NDDK_TRANG_THAI_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );
  const xaPhuongOptions = useNddkXaPhuongOptions();

  const activeFilterCount = useMemo(() => {
    const colN = countNddkColumnSearchActive(filters.columnSearch);
    const chipN =
      (filters.nam_filter.length > 0 ? 1 : 0) +
      (filters.nguon_filter.length > 0 ? 1 : 0) +
      (filters.nguon_ho_tro_filter.length > 0 ? 1 : 0) +
      (filters.doi_tuong_filter.length > 0 ? 1 : 0) +
      (filters.loai_hinh_filter.length > 0 ? 1 : 0) +
      (filters.trang_thai_filter.length > 0 ? 1 : 0) +
      (filters.xa_phuong_filter.length > 0 ? 1 : 0);
    return (searchTerm ? 1 : 0) + colN + chipN;
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('nam_filter', []);
    setFilter('nguon_filter', []);
    setFilter('nguon_ho_tro_filter', []);
    setFilter('doi_tuong_filter', []);
    setFilter('loai_hinh_filter', []);
    setFilter('trang_thai_filter', []);
    setFilter('xa_phuong_filter', []);
  };

  const filterGroups = useMemo(
    () => [
      {
        key: 'nam_filter',
        label: txt('nhaDaiDoanKet.store.namCol'),
        icon: CalendarRange,
        options: namOptions,
        value: filters.nam_filter,
        onChange: (vals: string[]) => setFilter('nam_filter', vals),
      },
      {
        key: 'trang_thai_filter',
        label: txt('nhaDaiDoanKet.store.trangThaiCol'),
        icon: ListChecks,
        options: trangThaiOptions,
        value: filters.trang_thai_filter,
        onChange: (vals: string[]) => setFilter('trang_thai_filter', vals),
      },
      {
        key: 'loai_hinh_filter',
        label: txt('nhaDaiDoanKet.store.loaiHinhCol'),
        icon: Hammer,
        options: loaiHinhOptions,
        value: filters.loai_hinh_filter,
        onChange: (vals: string[]) => setFilter('loai_hinh_filter', vals),
      },
      {
        key: 'nguon_filter',
        label: txt('nhaDaiDoanKet.store.nguonCol'),
        icon: Coins,
        options: nguonOptions,
        value: filters.nguon_filter,
        onChange: (vals: string[]) => setFilter('nguon_filter', vals),
      },
      {
        key: 'nguon_ho_tro_filter',
        label: txt('nhaDaiDoanKet.store.nguonHoTroCol'),
        icon: Coins,
        options: nguonHoTroOptions,
        value: filters.nguon_ho_tro_filter,
        onChange: (vals: string[]) => setFilter('nguon_ho_tro_filter', vals),
      },
      {
        key: 'doi_tuong_filter',
        label: txt('nhaDaiDoanKet.store.doiTuongCol'),
        icon: Users,
        options: doiTuongOptions,
        value: filters.doi_tuong_filter,
        onChange: (vals: string[]) => setFilter('doi_tuong_filter', vals),
      },
      {
        key: 'xa_phuong_filter',
        label: txt('nhaDaiDoanKet.store.xaPhuongCol'),
        icon: MapPin,
        options: xaPhuongOptions.map((o) => ({ value: o.value, label: o.label })),
        value: filters.xa_phuong_filter,
        onChange: (vals: string[]) => setFilter('xa_phuong_filter', vals),
      },
    ],
    [
      namOptions,
      trangThaiOptions,
      loaiHinhOptions,
      nguonOptions,
      nguonHoTroOptions,
      doiTuongOptions,
      xaPhuongOptions,
      filters,
      setFilter,
    ],
  );

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={namOptions}
          value={filters.nam_filter}
          onChange={(vals) => setFilter('nam_filter', vals)}
          placeholder={txt('nhaDaiDoanKet.store.namCol')}
          icon={CalendarRange}
          className="shrink-0"
        />
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai_filter}
          onChange={(vals) => setFilter('trang_thai_filter', vals)}
          placeholder={txt('nhaDaiDoanKet.store.trangThaiCol')}
          icon={ListChecks}
          className="shrink-0"
        />
        <FilterChipMultiSelect
          options={loaiHinhOptions}
          value={filters.loai_hinh_filter}
          onChange={(vals) => setFilter('loai_hinh_filter', vals)}
          placeholder={txt('nhaDaiDoanKet.store.loaiHinhCol')}
          icon={Hammer}
          className="shrink-0"
        />
        <FilterChipMultiSelect
          options={nguonOptions}
          value={filters.nguon_filter}
          onChange={(vals) => setFilter('nguon_filter', vals)}
          placeholder={txt('nhaDaiDoanKet.store.nguonCol')}
          icon={Coins}
          className="shrink-0"
        />
      </div>
    ),
    [namOptions, trangThaiOptions, loaiHinhOptions, nguonOptions, filters, setFilter],
  );

  const mobileActions: ActionItem[] = useMemo(
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
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      filters={filtersSlot}
      filterGroups={filterGroups}
      searchPlaceholder={txt('nhaDaiDoanKet.searchPlaceholder')}
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

export default NddkToolbar;
