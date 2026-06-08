import React, { useMemo, type ReactNode } from 'react';
import { Plus, Download, AlignLeft, FolderTree, CircleDot } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import type { Option } from '@/components/ui/MultiSelect';
import { txt } from '@/lib/text';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { useKhoDanhSachHangHoaStore } from '../store/useKhoDanhSachHangHoaStore';
import { countHangHoaColumnSearchActive } from '../utils/column-search';
import type { KhoDanhMucHangHoaListRow, KhoDanhSachHangHoaListRow } from '../core/types';

interface Props {
  tabSlot: ReactNode;
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  danhMucList: KhoDanhMucHangHoaListRow[];
  items?: KhoDanhSachHangHoaListRow[] | null;
}

const KhoDanhSachHangHoaToolbar: React.FC<Props> = ({
  tabSlot,
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
  danhMucList,
  items,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranReliefGoods');
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
  } = useKhoDanhSachHangHoaStore();

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
      { label: txt('matTranHangHoa.filterMoTaHas'), value: 'has', count: moTaCounts.has },
      { label: txt('matTranHangHoa.filterMoTaEmpty'), value: 'empty', count: moTaCounts.empty },
    ],
    [moTaCounts.has, moTaCounts.empty],
  );

  const danhMucOptions: Option[] = useMemo(
    () =>
      [...danhMucList]
        .sort((a, b) => a.thu_tu - b.thu_tu || a.ten_danh_muc.localeCompare(b.ten_danh_muc, 'vi'))
        .map((d) => ({ label: d.ten_danh_muc, value: d.id })),
    [danhMucList],
  );

  const trangThaiOptions = useMemo(
    () =>
      TRANG_THAI_HOAT_DONG.map((value) => ({
        label: value,
        value,
        count: itemRows.filter((r) => r.trang_thai === value).length,
      })),
    [itemRows],
  );

  const activeFilterCount = useMemo(() => {
    const colN = countHangHoaColumnSearchActive(filters.columnSearch, filters.mo_ta_bucket);
    const bucketOn = filters.mo_ta_bucket === 'has' || filters.mo_ta_bucket === 'empty' ? 1 : 0;
    const dmOn = filters.id_danh_muc ? 1 : 0;
    const ttOn = filters.trang_thai ? 1 : 0;
    return (searchTerm ? 1 : 0) + colN + bucketOn + dmOn + ttOn;
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('mo_ta_bucket', '');
    setFilter('id_danh_muc', '');
    setFilter('trang_thai', '');
    setSort(null, null);
  };

  const filterGroups = useMemo(
    () => [
      {
        key: 'id_danh_muc',
        label: txt('matTranHangHoa.store.tenNhom'),
        icon: FolderTree,
        options: danhMucOptions,
        value: filters.id_danh_muc ? [filters.id_danh_muc] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('id_danh_muc', pick);
        },
      },
      {
        key: 'mo_ta_bucket',
        label: txt('matTranHangHoa.store.moTa'),
        icon: AlignLeft,
        options: moTaChipOptions,
        value: filters.mo_ta_bucket ? [filters.mo_ta_bucket] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('mo_ta_bucket', pick === 'has' || pick === 'empty' ? pick : '');
        },
      },
      {
        key: 'trang_thai',
        label: txt('matTranHangHoa.store.trangThai'),
        icon: CircleDot,
        options: trangThaiOptions,
        value: filters.trang_thai ? [filters.trang_thai] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('trang_thai', pick);
        },
      },
    ],
    [danhMucOptions, moTaChipOptions, trangThaiOptions, filters.id_danh_muc, filters.mo_ta_bucket, filters.trang_thai, setFilter],
  );

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipSingleSelect
          options={danhMucOptions}
          value={filters.id_danh_muc || null}
          onChange={(v) => setFilter('id_danh_muc', v ?? '')}
          placeholder={txt('matTranHangHoa.filterDanhMucPlaceholder')}
          icon={FolderTree}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,32vw)] sm:max-w-[300px]"
        />
        <FilterChipSingleSelect
          options={trangThaiOptions}
          value={filters.trang_thai || null}
          onChange={(v) => setFilter('trang_thai', v ?? '')}
          placeholder={txt('matTranHangHoa.filterTrangThaiPlaceholder')}
          icon={CircleDot}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipSingleSelect
          options={moTaChipOptions}
          value={filters.mo_ta_bucket || null}
          onChange={(v) => setFilter('mo_ta_bucket', v === 'has' || v === 'empty' ? v : '')}
          placeholder={txt('matTranHangHoa.filterMoTaChipPlaceholder')}
          icon={AlignLeft}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [danhMucOptions, trangThaiOptions, moTaChipOptions, filters.id_danh_muc, filters.trang_thai, filters.mo_ta_bucket, setFilter],
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
      filterGroups={filterGroups}
      filters={filtersSlot}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('common.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
      tabSlot={tabSlot}
    />
  );
};

export default KhoDanhSachHangHoaToolbar;
