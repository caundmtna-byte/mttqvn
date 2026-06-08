import React, { useMemo, type ReactNode } from 'react';
import { Download, Filter, Package, Warehouse } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import type { Option } from '@/components/ui/MultiSelect';
import { useNhapXuatKhoCtFlatStore } from '../store/useNhapXuatKhoCtFlatStore';
import { countColumnSearchActive } from '../utils/column-search';
import type { NhapXuatKhoCtFlatRow } from '../core/types';
import { NHAP_XUAT_KHO_LOAI_PHIEU, type NhapXuatKhoLoaiPhieu } from '../core/constants';

interface Props {
  tabSlot: ReactNode;
  onPageBack: () => void;
  onExport: () => void;
  items?: NhapXuatKhoCtFlatRow[] | null;
}

const NhapXuatKhoCtFlatToolbar: React.FC<Props> = ({ tabSlot, onPageBack, onExport, items }) => {
  const { canExport } = useResourcePermissions('matTranReliefStockTransactions');
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
    setSort,
  } = useNhapXuatKhoCtFlatStore();

  const loaiCounts = useMemo(() => {
    const counts: Record<NhapXuatKhoLoaiPhieu, number> = {
      nhap_ngoai: 0,
      xuat_ngoai: 0,
      chuyen_kho: 0,
    };
    for (const r of itemRows) counts[r.loai_phieu] = (counts[r.loai_phieu] ?? 0) + 1;
    return counts;
  }, [itemRows]);

  const loaiOptions = useMemo<Option[]>(
    () =>
      NHAP_XUAT_KHO_LOAI_PHIEU.map((v) => ({
        label: txt(`matTranNhapXuatKho.loaiPhieu.${v}`),
        value: v,
        count: loaiCounts[v] ?? 0,
      })),
    [loaiCounts],
  );

  /** Tập kho duy nhất xuất hiện trong rows (kho_xuat hoặc kho_nhap). */
  const khoOptions = useMemo<Option[]>(() => {
    const map = new Map<string, string>();
    for (const r of itemRows) {
      if (r.kho_xuat_id && r.ten_kho_xuat) map.set(r.kho_xuat_id, r.ten_kho_xuat);
      if (r.kho_nhap_id && r.ten_kho_nhap) map.set(r.kho_nhap_id, r.ten_kho_nhap);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'vi'))
      .map(([value, label]) => ({ label, value }));
  }, [itemRows]);

  const hangHoaOptions = useMemo<Option[]>(() => {
    const map = new Map<string, string>();
    for (const r of itemRows) {
      const id = r.hang_hoa_id;
      const lbl = r.ten_hang_hoa ?? `#${id}`;
      if (!map.has(id)) map.set(id, lbl);
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1], 'vi'))
      .map(([id, label]) => ({ label, value: id }));
  }, [itemRows]);

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai_phieu ? 1 : 0) +
      (filters.kho_id ? 1 : 0) +
      (filters.hang_hoa_id ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('loai_phieu', null);
    setFilter('kho_id', null);
    setFilter('hang_hoa_id', null);
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
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[240px]"
        />
        <FilterChipSingleSelect
          options={khoOptions}
          value={filters.kho_id}
          onChange={(v) => setFilter('kho_id', v && v.length > 0 ? v : null)}
          placeholder={txt('matTranNhapXuatKho.toolbar.filterKho')}
          icon={Warehouse}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipSingleSelect
          options={hangHoaOptions}
          value={filters.hang_hoa_id}
          onChange={(v) => setFilter('hang_hoa_id', v && v.length > 0 ? v : null)}
          placeholder={txt('matTranNhapXuatKho.toolbar.filterHangHoa')}
          icon={Package}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[260px]"
        />
      </div>
    ),
    [filters.loai_phieu, filters.kho_id, filters.hang_hoa_id, loaiOptions, khoOptions, hangHoaOptions, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'loai_phieu',
        label: txt('matTranNhapXuatKho.loaiPhieu.all'),
        icon: Filter,
        options: loaiOptions,
        value: filters.loai_phieu ? [filters.loai_phieu] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter(
            'loai_phieu',
            NHAP_XUAT_KHO_LOAI_PHIEU.includes(pick as NhapXuatKhoLoaiPhieu) ? pick : null,
          );
        },
      },
      {
        key: 'kho_id',
        label: txt('matTranNhapXuatKho.toolbar.filterKho'),
        icon: Warehouse,
        options: khoOptions,
        value: filters.kho_id ? [filters.kho_id] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('kho_id', pick && pick.length > 0 ? pick : null);
        },
      },
      {
        key: 'hang_hoa_id',
        label: txt('matTranNhapXuatKho.toolbar.filterHangHoa'),
        icon: Package,
        options: hangHoaOptions,
        value: filters.hang_hoa_id ? [filters.hang_hoa_id] : [],
        onChange: (vals: string[]) => {
          const pick = vals.length ? vals[vals.length - 1] : '';
          setFilter('hang_hoa_id', pick && pick.length > 0 ? pick : null);
        },
      },
    ],
    [loaiOptions, khoOptions, hangHoaOptions, filters.loai_phieu, filters.kho_id, filters.hang_hoa_id, setFilter],
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
    </>
  );

  return (
    <GenericToolbar
      selectedCount={0}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={() => undefined}
      actions={renderActions}
      filterGroups={filterGroups}
      filters={filtersSlot}
      mobileActions={mobileActions}
      searchPlaceholder={txt('matTranNhapXuatKho.searchPlaceholderCt')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
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

export default NhapXuatKhoCtFlatToolbar;
