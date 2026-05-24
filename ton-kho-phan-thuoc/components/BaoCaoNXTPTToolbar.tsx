import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FileDown, Printer, RefreshCw, ChevronDown, Warehouse, ClipboardList, Tags, Package } from 'lucide-react';
import DashboardToolbar from '../../../../components/shared/DashboardToolbar';
import FilterChipMultiSelect from '../../../../components/shared/FilterChipMultiSelect';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import type { DateRangeValue } from '../../../../components/ui/DateRangePicker';
import type { FilterGroup } from '../../../../components/ui/MobileFilterSheet';
import type { Kho } from '../../../kho-van/danh-sach-kho/core/types';
import type { FarmHangHoa } from '../../hang-hoa-phan-thuoc/core/types';
import type { FarmDanhMucCap2WithParent } from '../../hang-hoa-phan-thuoc/services/farm-danh-muc-service';
import type { LoaiPhieuKhoPT } from '../../phieu-kho-phan-thuoc/core/types';
import { useTonKhoPTStore } from '../store/useTonKhoPTStore';
import { getDateRangeFromPreset, getPresetFromDates } from '../core/datePresets';
import { FARM_TON_KHO_PT_QUERY_KEY } from '../hooks/use-farm-ton-kho-pt';
import { cn } from '../../../../lib/utils';

const CUSTOM_PRESET_ID = 'custom';

interface Props {
  khoList: Kho[];
  danhMucCap2: FarmDanhMucCap2WithParent[];
  hangHoaList: FarmHangHoa[];
  onExportExcel: () => void;
}

const BaoCaoNXTPTToolbar: React.FC<Props> = ({ khoList, danhMucCap2, hangHoaList, onExportExcel }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const nxtDateFrom = useTonKhoPTStore((s) => s.nxtDateFrom);
  const nxtDateTo = useTonKhoPTStore((s) => s.nxtDateTo);
  const setNxtDateRange = useTonKhoPTStore((s) => s.setNxtDateRange);
  const setNxtPreset = useTonKhoPTStore((s) => s.setNxtPreset);
  const nxtWarehouseIds = useTonKhoPTStore((s) => s.nxtWarehouseIds);
  const setNxtWarehouseIds = useTonKhoPTStore((s) => s.setNxtWarehouseIds);
  const nxtLoaiPhieu = useTonKhoPTStore((s) => s.nxtLoaiPhieu);
  const setNxtLoaiPhieu = useTonKhoPTStore((s) => s.setNxtLoaiPhieu);
  const nxtHangHoaIds = useTonKhoPTStore((s) => s.nxtHangHoaIds);
  const setNxtHangHoaIds = useTonKhoPTStore((s) => s.setNxtHangHoaIds);
  const nxtCategoryIds = useTonKhoPTStore((s) => s.nxtCategoryIds);
  const setNxtCategoryIds = useTonKhoPTStore((s) => s.setNxtCategoryIds);
  const clearNxtFilters = useTonKhoPTStore((s) => s.clearNxtFilters);

  useEffect(() => {
    if (!nxtCategoryIds.length) return;
    const catSet = new Set(nxtCategoryIds);
    const allowed = new Set(
      hangHoaList.filter((h) => h.danh_muc_id != null && catSet.has(String(h.danh_muc_id))).map((h) => String(h.id))
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
      (['thisMonth', 'lastMonth', 'thisQuarter', 'thisYear'] as const).map((id) => ({
        id,
        label: t(`tonKhoPhanThuoc.nxt.preset.${id}`),
      })),
    [t]
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
    () => khoList.map((k) => ({ label: k.ten_kho, value: String(k.id), subLabel: k.ma_kho })),
    [khoList]
  );

  const loaiOptions = useMemo(
    () => [
      { value: 'nhập', label: t('phieuKhoPhanThuoc.tabs.nhap') },
      { value: 'xuất', label: t('phieuKhoPhanThuoc.tabs.xuat') },
      { value: 'chuyển', label: t('phieuKhoPhanThuoc.tabs.chuyen') },
    ],
    [t]
  );

  const categoryOptions = useMemo(
    () =>
      danhMucCap2.map((d) => ({
        label: d.ten_danh_muc_cha ? `${d.ten_danh_muc_cha} / ${d.ten_danh_muc}` : d.ten_danh_muc,
        value: String(d.id),
      })),
    [danhMucCap2]
  );

  const productOptions = useMemo(() => {
    const catSet = nxtCategoryIds.length > 0 ? new Set(nxtCategoryIds.map(String)) : null;
    return hangHoaList
      .filter((h) => {
        if (!catSet) return true;
        return h.danh_muc_id != null && catSet.has(String(h.danh_muc_id));
      })
      .map((h) => ({
        label: h.ten_hang_hoa ?? h.ten_hang ?? '—',
        value: String(h.id),
        subLabel: h.ma_hang_hoa ?? h.ma_hang,
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
        label: t('tonKhoPhanThuoc.nxt.warehouses'),
        icon: Warehouse,
        options: warehouseOptions.map((o) => ({ ...o, value: String(o.value) })),
        value: nxtWarehouseIds,
        onChange: (val: string[]) => setNxtWarehouseIds(val),
      },
      {
        key: 'loaiPhieu',
        label: t('tonKhoPhanThuoc.nxt.loaiPhieu'),
        icon: ClipboardList,
        options: loaiOptions.map((o) => ({ ...o, value: o.value })),
        value: nxtLoaiPhieu,
        onChange: (val: string[]) => setNxtLoaiPhieu(val as LoaiPhieuKhoPT[]),
      },
      {
        key: 'categoryIds',
        label: t('tonKhoPhanThuoc.nxt.categories'),
        icon: Tags,
        options: categoryOptions,
        value: nxtCategoryIds,
        onChange: (val: string[]) => setNxtCategoryIds(val),
      },
      {
        key: 'hangHoaIds',
        label: t('tonKhoPhanThuoc.nxt.products'),
        icon: Package,
        options: productOptions,
        value: nxtHangHoaIds,
        onChange: (val: string[]) => setNxtHangHoaIds(val),
      },
    ],
    [
      t,
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
        placeholder={t('tonKhoPhanThuoc.nxt.periodPlaceholder')}
        customPresetId={CUSTOM_PRESET_ID}
        className="shrink-0"
      />
      <FilterChipMultiSelect
        options={warehouseOptions}
        value={nxtWarehouseIds}
        onChange={setNxtWarehouseIds}
        placeholder={t('tonKhoPhanThuoc.nxt.filterWarehousePlaceholder')}
        icon={Warehouse}
        className="w-full sm:w-[180px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={loaiOptions}
        value={nxtLoaiPhieu}
        onChange={(v) => setNxtLoaiPhieu(v as LoaiPhieuKhoPT[])}
        placeholder={t('tonKhoPhanThuoc.nxt.filterLoaiPlaceholder')}
        icon={ClipboardList}
        className="w-full sm:w-[160px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={categoryOptions}
        value={nxtCategoryIds}
        onChange={setNxtCategoryIds}
        placeholder={t('tonKhoPhanThuoc.nxt.filterCategoryPlaceholder')}
        icon={Tags}
        className="w-full sm:w-[200px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={productOptions}
        value={nxtHangHoaIds}
        onChange={setNxtHangHoaIds}
        placeholder={t('tonKhoPhanThuoc.nxt.filterProductPlaceholder')}
        icon={Package}
        className="w-full sm:w-[200px]"
        size="md"
      />
    </>
  );

  const actions = (
    <div className="flex items-center gap-2">
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
          <span>{t('tonKhoPhanThuoc.nxt.export')}</span>
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
              {t('tonKhoPhanThuoc.nxt.exportExcel')}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <Printer size={14} />
        <span className="hidden sm:inline">{t('tonKhoPhanThuoc.nxt.print')}</span>
      </button>
      <button
        type="button"
        onClick={() => queryClient.invalidateQueries({ queryKey: FARM_TON_KHO_PT_QUERY_KEY })}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <RefreshCw size={14} />
        <span className="hidden sm:inline">{t('tonKhoPhanThuoc.nxt.refresh')}</span>
      </button>
    </div>
  );

  return (
    <DashboardToolbar
      onBack={() => window.history.back()}
      filters={renderFilters}
      filterGroups={filterGroups}
      activeFilterCount={activeFilterCount}
      onClearFilters={clearNxtFilters}
      actions={actions}
      className="print:hidden rounded-xl border border-border shadow-sm"
    />
  );
};

export default BaoCaoNXTPTToolbar;
