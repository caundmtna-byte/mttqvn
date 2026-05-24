import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import GenericSubTableSection from '@/components/shared/GenericSubTableSection';
import { txt } from '@/lib/text';
import { formatDecimal } from '@/lib/utils';
import { useHangNxHistory } from '../hooks/use-kho-ton-kho';
import { computeTonSauByChiTiet } from '../utils/compute-ton-sau-by-chi-tiet';
import { nxHistoryToLichSuRows } from '../utils/nx-history-to-lich-su';
import { loaiPhieuLabel } from '../core/constants';
import type { TonKhoHangNxHistoryRow } from '../core/types';
import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';

function formatNgayVN(ymd: string): string {
  const d = (ymd ?? '').slice(0, 10);
  if (!d || d.length < 10) return d || '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function loaiDisplay(loai: NhapXuatKhoLoaiPhieu): string {
  return loaiPhieuLabel(loai);
}

function khoDisplay(row: TonKhoHangNxHistoryRow): string {
  if (row.loai_phieu === 'chuyen_kho') {
    const from = (row.ten_kho_xuat ?? '').trim() || '—';
    const to = (row.ten_kho_nhap ?? '').trim();
    if (to) return txt('matTranTonKho.detail.historyNx.khoChuyen', { from, to });
  }
  if (row.loai_phieu === 'nhap_ngoai') return (row.ten_kho_nhap ?? '').trim() || '—';
  if (row.loai_phieu === 'xuat_ngoai') return (row.ten_kho_xuat ?? '').trim() || '—';
  return '—';
}

interface Props {
  hangHoaId: string;
}

const TonKhoHangNxHistorySection: React.FC<Props> = ({ hangHoaId }) => {
  const { data = [], isLoading, isError, error } = useHangNxHistory(hangHoaId);

  const errMsg = useMemo(() => (error instanceof Error ? error.message : String(error ?? '')), [error]);

  const tonSauByChiTiet = useMemo(() => {
    if (!data.length) return new Map<string, number>();
    return computeTonSauByChiTiet(nxHistoryToLichSuRows(data, hangHoaId), 'byProductGlobal');
  }, [data, hangHoaId]);

  return (
    <GenericSubTableSection
      title={txt('matTranTonKho.detail.historyNx.title')}
      icon={<History size={14} />}
      count={isLoading ? undefined : data.length}
      loading={isLoading}
      loadingText={txt('matTranTonKho.detail.historyNx.loading')}
      emptyTitle={txt('matTranTonKho.detail.historyNx.empty')}
      emptyDescription={isError ? errMsg : txt('matTranTonKho.detail.historyNx.emptyHint')}
      maxTableHeight="260px"
    >
      {!isLoading && !isError && data.length > 0 ? (
        <>
          <thead className="bg-muted/80 border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {txt('matTranTonKho.detail.historyNx.colDate')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {txt('matTranTonKho.detail.historyNx.colSoPhieu')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {txt('matTranTonKho.detail.historyNx.colLoai')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold min-w-[140px]">
                {txt('matTranTonKho.detail.historyNx.colKho')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {txt('matTranTonKho.detail.historyNx.colSl')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {txt('matTranTonKho.detail.historyNx.colTon')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {data.map((row) => {
              const tonSau = tonSauByChiTiet.get(String(row.chi_tiet_id));
              return (
                <tr key={row.chi_tiet_id} className="border-b border-border/70">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                    {formatNgayVN(row.ngay_phieu)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{row.so_phieu}</td>
                  <td className="px-3 py-2">{loaiDisplay(row.loai_phieu)}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">{khoDisplay(row)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatDecimal(row.so_luong)}
                    <span className="text-muted-foreground text-xs ml-1">{row.don_vi_tinh}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {tonSau !== undefined ? formatDecimal(tonSau) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </>
      ) : undefined}
    </GenericSubTableSection>
  );
};

export default TonKhoHangNxHistorySection;
