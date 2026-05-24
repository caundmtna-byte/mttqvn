import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useFarmNXTPT, isNXTDateRangeValid } from '../hooks/use-farm-ton-kho-pt';
import { useTonKhoPTStore } from '../store/useTonKhoPTStore';
import { sumNXTPTSummary } from '../services/farm-ton-kho-pt';
import type { LoaiPhieuKhoPT } from '../../phieu-kho-phan-thuoc/core/types';
import type { NXTByProductPTRow, NXTPTFilters } from '../core/types';
import NXTKyPTProductDrawer from './NXTKyPTProductDrawer';
import LoadingSpinnerWithText from '../../../../components/shared/LoadingSpinnerWithText';
import EmptyState from '../../../../components/shared/EmptyState';
import NXTSummaryCardsPT from './NXTSummaryCardsPT';

function formatDateDisplay(ymd: string): string {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

interface Props {
  onClearFilters?: () => void;
}

const TongHopNXTKyPTTab: React.FC<Props> = ({ onClearFilters }) => {
  const { t } = useTranslation();
  const nxtDateFrom = useTonKhoPTStore((s) => s.nxtDateFrom);
  const nxtDateTo = useTonKhoPTStore((s) => s.nxtDateTo);
  const nxtWarehouseIds = useTonKhoPTStore((s) => s.nxtWarehouseIds);
  const nxtLoaiPhieu = useTonKhoPTStore((s) => s.nxtLoaiPhieu);
  const nxtHangHoaIds = useTonKhoPTStore((s) => s.nxtHangHoaIds);
  const nxtCategoryIds = useTonKhoPTStore((s) => s.nxtCategoryIds);

  const filters: NXTPTFilters = useMemo(
    () => ({
      dateFrom: nxtDateFrom,
      dateTo: nxtDateTo,
      warehouseIds: nxtWarehouseIds,
      loaiPhieu: nxtLoaiPhieu as LoaiPhieuKhoPT[],
      hangHoaIds: nxtHangHoaIds,
      categoryIds: nxtCategoryIds,
    }),
    [nxtDateFrom, nxtDateTo, nxtWarehouseIds, nxtLoaiPhieu, nxtHangHoaIds, nxtCategoryIds]
  );

  const rangeOk = isNXTDateRangeValid(filters);
  const { data, isLoading, isError, error } = useFarmNXTPT(filters, true);
  const [detailProduct, setDetailProduct] = useState<NXTByProductPTRow | null>(null);

  const summary = useMemo(() => (data ? sumNXTPTSummary(data.byProduct) : null), [data]);

  const activeNxtChips =
    nxtWarehouseIds.length + nxtHangHoaIds.length + nxtCategoryIds.length + nxtLoaiPhieu.length;

  if (!rangeOk) {
    return (
      <div className="flex-1 flex flex-col min-h-0 items-center justify-center p-6">
        {nxtDateFrom && nxtDateTo ? (
          <p className="text-sm text-amber-700 dark:text-amber-400 text-center">{t('tonKhoPhanThuoc.nxt.dateInvalid')}</p>
        ) : (
          <p className="text-sm text-muted-foreground text-center max-w-md">{t('tonKhoPhanThuoc.nxt.selectPeriod')}</p>
        )}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-sm text-destructive">{error instanceof Error ? error.message : t('common.error')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 py-6 px-4">
          <LoadingSpinnerWithText text={t('tonKhoPhanThuoc.nxt.loading')} centered />
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
          title={t('tonKhoPhanThuoc.nxt.empty')}
          description={t('tonKhoPhanThuoc.nxt.emptyHint')}
          icon={<BarChart3 size={48} className="text-muted-foreground/30" />}
          action={
            onClearFilters && activeNxtChips > 0 ? (
              <button type="button" onClick={onClearFilters} className="text-sm font-medium text-primary hover:underline">
                {t('common.clearFilters', { count: activeNxtChips })}
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const periodLabel = t('tonKhoPhanThuoc.nxt.periodLabel', {
    from: formatDateDisplay(nxtDateFrom),
    to: formatDateDisplay(nxtDateTo),
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <div className="p-3 sm:p-4 space-y-4 print:overflow-visible">
        <p className="text-sm text-muted-foreground font-medium print:text-foreground">{periodLabel}</p>

        {summary && byProduct.length > 0 && <NXTSummaryCardsPT summary={summary} />}

        {byProduct.length > 0 && (
          <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <h3 className="px-4 py-3 text-sm font-semibold text-foreground border-b border-border bg-muted/30">
              {t('tonKhoPhanThuoc.nxt.sectionByProduct')}
            </h3>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-[1] bg-muted/95 backdrop-blur">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.maHang')}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.tenHang')}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.danhMuc')}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.dvt')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.tonDau')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.nhap')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.xuat')}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground/90 whitespace-nowrap">
                      {t('tonKhoPhanThuoc.nxt.tonCuoi')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map((row) => (
                    <tr
                      key={row.id_hang_hoa}
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
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.ma_hang}</td>
                      <td className="px-4 py-3 font-medium">{row.ten_hang}</td>
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
        )}
      </div>

      <NXTKyPTProductDrawer product={detailProduct} filters={filters} onClose={() => setDetailProduct(null)} />
    </div>
  );
};

export default TongHopNXTKyPTTab;
