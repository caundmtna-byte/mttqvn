import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { txt } from '@/lib/text';
import { useNXTByPeriod, isNXTDateRangeValid } from '../hooks/use-kho-ton-kho';
import { useTonKhoNxtStore } from '../store/useTonKhoNxtStore';
import { sumNXTSummary } from '../services/kho-ton-kho-service';
import type { NXTByProductRow, NXTFilters } from '../core/types';
import NxtKyProductDrawer from './nxt-ky-product-drawer';
import LoadingSpinnerWithText from '@/components/shared/LoadingSpinnerWithText';
import EmptyState from '@/components/shared/EmptyState';
import NxtSummaryCards from './nxt-summary-cards';

function formatDateDisplay(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

interface Props {
  onClearFilters?: () => void;
}

const TongHopNxtKyTab: React.FC<Props> = ({ onClearFilters }) => {
  const nxtDateFrom = useTonKhoNxtStore((s) => s.nxtDateFrom);
  const nxtDateTo = useTonKhoNxtStore((s) => s.nxtDateTo);
  const nxtWarehouseIds = useTonKhoNxtStore((s) => s.nxtWarehouseIds);
  const nxtLoaiPhieu = useTonKhoNxtStore((s) => s.nxtLoaiPhieu);
  const nxtHangHoaIds = useTonKhoNxtStore((s) => s.nxtHangHoaIds);
  const nxtCategoryIds = useTonKhoNxtStore((s) => s.nxtCategoryIds);

  const filters: NXTFilters = useMemo(
    () => ({
      dateFrom: nxtDateFrom,
      dateTo: nxtDateTo,
      warehouseIds: nxtWarehouseIds,
      loaiPhieu: nxtLoaiPhieu,
      hangHoaIds: nxtHangHoaIds,
      categoryIds: nxtCategoryIds,
    }),
    [nxtDateFrom, nxtDateTo, nxtWarehouseIds, nxtLoaiPhieu, nxtHangHoaIds, nxtCategoryIds]
  );

  const rangeOk = isNXTDateRangeValid(filters);
  const { data, isLoading, isError, error } = useNXTByPeriod(filters, true);
  const [detailProduct, setDetailProduct] = useState<NXTByProductRow | null>(null);

  const summary = useMemo(() => (data ? sumNXTSummary(data.byProduct) : null), [data]);

  const activeNxtChips =
    nxtWarehouseIds.length + nxtHangHoaIds.length + nxtCategoryIds.length + nxtLoaiPhieu.length;

  if (!rangeOk) {
    return (
      <div className="flex-1 flex flex-col min-h-0 items-center justify-center p-6">
        {nxtDateFrom && nxtDateTo ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 text-center">{txt('matTranTonKho.nxt.dateInvalid')}</p>
        ) : (
          <p className="text-sm text-muted-foreground text-center max-w-md">{txt('matTranTonKho.nxt.selectPeriod')}</p>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : txt('common.error')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 py-6 px-4">
          <LoadingSpinnerWithText text={txt('matTranTonKho.nxt.loading')} centered />
        </div>
      </div>
    );
  }

  const byProduct = data?.byProduct ?? [];
  const hasData = byProduct.length > 0;

  if (!hasData) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <EmptyState
          title={txt('matTranTonKho.nxt.empty')}
          description={txt('matTranTonKho.nxt.emptyHint')}
          icon={<BarChart3 size={48} className="text-muted-foreground/30" />}
          action={
            onClearFilters && activeNxtChips > 0 ? (
              <button type="button" onClick={onClearFilters} className="text-sm font-medium text-primary hover:underline">
                {txt('common.clearFilters', { count: activeNxtChips })}
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const periodLabel = txt('matTranTonKho.nxt.periodLabel', {
    from: formatDateDisplay(nxtDateFrom),
    to: formatDateDisplay(nxtDateTo),
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <div className="p-3 sm:p-4 space-y-4 print:overflow-visible">
        <p className="text-sm text-muted-foreground font-medium print:text-foreground">{periodLabel}</p>

        {summary && byProduct.length > 0 && <NxtSummaryCards summary={summary} />}

        <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <h3 className="px-4 py-3 text-sm font-semibold text-foreground border-b border-border bg-muted/30">
            {txt('matTranTonKho.nxt.sectionByProduct')}
          </h3>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-[1] bg-muted/95 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.maHang')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.tenHang')}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.danhMuc')}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.dvt')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.tonDau')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.nhap')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.xuat')}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                    {txt('matTranTonKho.nxt.tonCuoi')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {byProduct.map((row) => (
                  <tr
                    key={row.hang_hoa_id}
                    className={cn(
                      'border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailProduct(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDetailProduct(row);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.hang_hoa_id}</td>
                    <td className="px-4 py-3 font-medium">{row.ten_hang_hoa}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.ten_danh_muc ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{row.don_vi_tinh}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.ton_dau_ky.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {row.tong_nhap.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {row.tong_xuat.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{row.ton_cuoi_ky.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <NxtKyProductDrawer product={detailProduct} filters={filters} onClose={() => setDetailProduct(null)} />
    </div>
  );
};

export default TongHopNxtKyTab;
