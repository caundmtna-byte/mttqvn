import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileDown, Printer, RefreshCw, ChevronDown, Warehouse, ClipboardList, Tags, Package } from 'lucide-react';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import DateRangePicker from '@/components/ui/DateRangePicker';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import type { KhoDanhSachKhoListRow } from '../../danh-sach-kho/core/types';
import type { KhoDanhMucHangHoaListRow, KhoDanhSachHangHoaListRow } from '../../hang-hoa/core/types';
import { NHAP_XUAT_KHO_LOAI_PHIEU, loaiPhieuLabel } from '../../nhap-xuat-kho/core/constants';
import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';
import { useTonKhoNxtStore } from '../store/useTonKhoNxtStore';
import { getDateRangeFromPreset, getPresetFromDates } from '../core/datePresets';
import { queryKeys } from '@/lib/query-keys';
import { txt } from '@/lib/text';
import { cn } from '@/lib/utils';

const CUSTOM_PRESET_ID = 'custom';

interface Props {
  khoList: KhoDanhSachKhoListRow[];
  danhMucList: KhoDanhMucHangHoaListRow[];
  hangHoaList: KhoDanhSachHangHoaListRow[];
  onExportExcel: () => void;
  onBack: () => void;
  canExport?: boolean;
}

const BaoCaoNxtToolbar: React.FC<Props> = ({
  khoList,
  danhMucList,
  hangHoaList,
  onExportExcel,
  onBack,
  canExport = true,
}) => {
  const queryClient = useQueryClient();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const nxtDateFrom = useTonKhoNxtStore((s) => s.nxtDateFrom);
  const nxtDateTo = useTonKhoNxtStore((s) => s.nxtDateTo);
  const setNxtDateRange = useTonKhoNxtStore((s) => s.setNxtDateRange);
  const setNxtPreset = useTonKhoNxtStore((s) => s.setNxtPreset);
  const nxtWarehouseIds = useTonKhoNxtStore((s) => s.nxtWarehouseIds);
  const setNxtWarehouseIds = useTonKhoNxtStore((s) => s.setNxtWarehouseIds);
  const nxtLoaiPhieu = useTonKhoNxtStore((s) => s.nxtLoaiPhieu);
  const setNxtLoaiPhieu = useTonKhoNxtStore((s) => s.setNxtLoaiPhieu);
  const nxtHangHoaIds = useTonKhoNxtStore((s) => s.nxtHangHoaIds);
  const setNxtHangHoaIds = useTonKhoNxtStore((s) => s.setNxtHangHoaIds);
  const nxtCategoryIds = useTonKhoNxtStore((s) => s.nxtCategoryIds);
  const setNxtCategoryIds = useTonKhoNxtStore((s) => s.setNxtCategoryIds);
  const clearNxtFilters = useTonKhoNxtStore((s) => s.clearNxtFilters);

  useEffect(() => {
    if (!nxtCategoryIds.length) return;
    const catSet = new Set(nxtCategoryIds);
    const allowed = new Set(
      hangHoaList.filter((h) => catSet.has(String(h.id_danh_muc))).map((h) => String(h.id))
    );
    const next = nxtHangHoaIds.filter((id) => allowed.has(String(id)));
    if (next.length === nxtHangHoaIds.length) return;
    setNxtHangHoaIds(next);
  }, [nxtCategoryIds, nxtHangHoaIds, hangHoaList, setNxtHangHoaIds]);

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  const dateRangePresets = useMemo(
    () =>
      (['all', 'thisMonth', 'lastMonth', 'thisQuarter', 'thisYear'] as const).map((id) => ({
        id,
        label: txt(`matTranTonKho.nxt.preset.${id}`),
      })),
    []
  );

  const dateRangeValue: DateRangeValue = useMemo(
    () => ({
      preset: getPresetFromDates(nxtDateFrom, nxtDateTo),
      customStart: nxtDateFrom,
      customEnd: nxtDateTo,
    }),
    [nxtDateFrom, nxtDateTo]
  );

  const handleDateRangeChange = (value: DateRangeValue) => {
    if (value.preset === CUSTOM_PRESET_ID) {
      setNxtDateRange(value.customStart, value.customEnd);
    } else {
      setNxtPreset(value.preset);
    }
  };

  const warehouseOptions = useMemo(
    () => khoList.map((k) => ({ label: k.ten_kho, value: String(k.id) })),
    [khoList]
  );

  const loaiOptions = useMemo(
    () =>
      NHAP_XUAT_KHO_LOAI_PHIEU.map((value) => ({
        value,
        label: loaiPhieuLabel(value),
      })),
    []
  );

  const categoryOptions = useMemo(
    () => danhMucList.map((d) => ({ label: d.ten_danh_muc, value: String(d.id) })),
    [danhMucList]
  );

  const productOptions = useMemo(() => {
    const catSet = nxtCategoryIds.length > 0 ? new Set(nxtCategoryIds.map(String)) : null;
    return hangHoaList
      .filter((h) => {
        if (!catSet) return true;
        return catSet.has(String(h.id_danh_muc));
      })
      .map((h) => ({
        label: h.ten_hang_hoa,
        value: String(h.id),
      }));
  }, [hangHoaList, nxtCategoryIds]);

  const activeFilterCount = useMemo(
    () =>
      nxtWarehouseIds.length +
      nxtCategoryIds.length +
      nxtHangHoaIds.length +
      nxtLoaiPhieu.length,
    [nxtWarehouseIds, nxtCategoryIds, nxtHangHoaIds, nxtLoaiPhieu.length]
  );

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        key: 'warehouseIds',
        label: txt('matTranTonKho.nxt.warehouses'),
        icon: Warehouse,
        options: warehouseOptions,
        value: nxtWarehouseIds,
        onChange: (val: string[]) => setNxtWarehouseIds(val),
      },
      {
        key: 'loaiPhieu',
        label: txt('matTranTonKho.nxt.loaiPhieu'),
        icon: ClipboardList,
        options: loaiOptions,
        value: nxtLoaiPhieu,
        onChange: (val: string[]) => setNxtLoaiPhieu(val as NhapXuatKhoLoaiPhieu[]),
      },
      {
        key: 'categoryIds',
        label: txt('matTranTonKho.nxt.categories'),
        icon: Tags,
        options: categoryOptions,
        value: nxtCategoryIds,
        onChange: (val: string[]) => setNxtCategoryIds(val),
      },
      {
        key: 'hangHoaIds',
        label: txt('matTranTonKho.nxt.products'),
        icon: Package,
        options: productOptions,
        value: nxtHangHoaIds,
        onChange: (val: string[]) => setNxtHangHoaIds(val),
      },
    ],
    [
      warehouseOptions,
      loaiOptions,
      categoryOptions,
      productOptions,
      nxtWarehouseIds,
      nxtLoaiPhieu,
      nxtCategoryIds,
      nxtHangHoaIds,
      setNxtWarehouseIds,
      setNxtLoaiPhieu,
      setNxtCategoryIds,
      setNxtHangHoaIds,
    ]
  );

  const renderFilters = (
    <>
      <DateRangePicker
        presets={dateRangePresets}
        value={dateRangeValue}
        onChange={handleDateRangeChange}
        placeholder={txt('matTranTonKho.nxt.periodPlaceholder')}
        customPresetId={CUSTOM_PRESET_ID}
        className="shrink-0"
      />
      <FilterChipMultiSelect
        options={warehouseOptions}
        value={nxtWarehouseIds}
        onChange={setNxtWarehouseIds}
        placeholder={txt('matTranTonKho.nxt.filterWarehousePlaceholder')}
        icon={Warehouse}
        className="w-full sm:w-[180px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={loaiOptions}
        value={nxtLoaiPhieu}
        onChange={(v) => setNxtLoaiPhieu(v as NhapXuatKhoLoaiPhieu[])}
        placeholder={txt('matTranTonKho.nxt.filterLoaiPlaceholder')}
        icon={ClipboardList}
        className="w-full sm:w-[160px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={categoryOptions}
        value={nxtCategoryIds}
        onChange={setNxtCategoryIds}
        placeholder={txt('matTranTonKho.nxt.filterCategoryPlaceholder')}
        icon={Tags}
        className="w-full sm:w-[200px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={productOptions}
        value={nxtHangHoaIds}
        onChange={setNxtHangHoaIds}
        placeholder={txt('matTranTonKho.nxt.filterProductPlaceholder')}
        icon={Package}
        className="w-full sm:w-[200px]"
        size="md"
      />
    </>
  );

  const actions = (
    <div className="flex items-center gap-2">
      {canExport ? (
        <div className="relative shrink-0" ref={exportRef}>
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            className={cn(
              'h-8 px-3 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-all',
              exportOpen
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <FileDown size={14} />
            <span>{txt('matTranTonKho.nxt.export')}</span>
            <ChevronDown size={12} className={cn('transition-transform', exportOpen && 'rotate-180')} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] bg-card rounded-xl shadow-xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  onExportExcel();
                  setExportOpen(false);
                }}
                className="w-full h-9 px-3 flex items-center gap-2 text-left text-sm text-foreground hover:bg-muted/60 transition-colors"
              >
                <FileDown size={16} className="text-muted-foreground" />
                {txt('matTranTonKho.nxt.exportExcel')}
              </button>
            </div>
          )}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => window.print()}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <Printer size={14} />
        <span className="hidden sm:inline">{txt('matTranTonKho.nxt.print')}</span>
      </button>
      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.khoTonKho.all })}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <RefreshCw size={14} />
        <span className="hidden sm:inline">{txt('matTranTonKho.nxt.refresh')}</span>
      </button>
    </div>
  );

  return (
    <DashboardToolbar
      onBack={onBack}
      filters={renderFilters}
      filterGroups={filterGroups}
      activeFilterCount={activeFilterCount}
      onClearFilters={clearNxtFilters}
      actions={actions}
      className="print:hidden rounded-xl border border-border shadow-sm"
    />
  );
};

export default BaoCaoNxtToolbar;
