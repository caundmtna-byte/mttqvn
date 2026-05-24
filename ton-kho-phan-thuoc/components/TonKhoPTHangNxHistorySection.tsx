import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import GenericSubTableSection from '../../../../components/shared/GenericSubTableSection';
import { useFarmPhieuKhoPTHangNxHistory } from '../hooks/use-farm-ton-kho-pt';
import type { TonKhoPTHangNxHistoryRow } from '../core/types';
import { formatNumberVN } from '../../../../lib/utils';
import { computeTonSauByChiTiet } from '../../../kho-van/ton-kho/utils/lich-su-ton-sau';
import { farmNxHistoryToLichSuRows } from '../utils/farm-nx-history-to-lich-su';

function formatNgayVN(ymd: string): string {
  const d = (ymd ?? '').slice(0, 10);
  if (!d || d.length < 10) return d || '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function loaiLabel(t: (k: string) => string, loai: string): string {
  const l = (loai ?? '').trim();
  if (l === 'nhập') return t('tonKhoPhanThuoc.detail.historyNx.loaiNhap');
  if (l === 'xuất') return t('tonKhoPhanThuoc.detail.historyNx.loaiXuat');
  if (l === 'chuyển') return t('tonKhoPhanThuoc.detail.historyNx.loaiChuyen');
  return l || '—';
}

function khoDisplay(row: TonKhoPTHangNxHistoryRow, t: (k: string) => string): string {
  const from = (row.ten_kho ?? '').trim() || '—';
  const to = (row.ten_kho_den ?? '').trim();
  if ((row.loai ?? '').trim() === 'chuyển' && to) {
    return t('tonKhoPhanThuoc.detail.historyNx.khoChuyen', { from, to });
  }
  return from;
}

interface Props {
  idHangHoa: string;
}

const TonKhoPTHangNxHistorySection: React.FC<Props> = ({ idHangHoa }) => {
  const { t } = useTranslation();
  const { data = [], isLoading, isError, error } = useFarmPhieuKhoPTHangNxHistory(idHangHoa);

  const errMsg = useMemo(() => (error instanceof Error ? error.message : String(error ?? '')), [error]);

  const tonSauByChiTiet = useMemo(() => {
    if (!data.length) return new Map<string, number>();
    return computeTonSauByChiTiet(farmNxHistoryToLichSuRows(data, idHangHoa), 'byProductGlobal');
  }, [data, idHangHoa]);

  return (
    <GenericSubTableSection
      title={t('tonKhoPhanThuoc.detail.historyNx.title')}
      icon={<History size={14} />}
      count={isLoading ? undefined : data.length}
      loading={isLoading}
      loadingText={t('tonKhoPhanThuoc.detail.historyNx.loading')}
      emptyTitle={t('tonKhoPhanThuoc.detail.historyNx.empty')}
      emptyDescription={isError ? errMsg : t('tonKhoPhanThuoc.detail.historyNx.emptyHint')}
      maxTableHeight="260px"
    >
      {!isLoading && !isError && data.length > 0 ? (
        <>
          <thead className="bg-muted/80 border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.detail.historyNx.colDate')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.detail.historyNx.colSoPhieu')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.detail.historyNx.colLoai')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold min-w-[140px]">
                {t('tonKhoPhanThuoc.detail.historyNx.colKho')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.detail.historyNx.colSl')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.detail.historyNx.colTon')}
              </th>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.detail.historyNx.colTrangThai')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {data.map((row) => {
              const tonSau = tonSauByChiTiet.get(String(row.chi_tiet_id));
              return (
              <tr key={row.chi_tiet_id} className="border-b border-border/70">
                <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">{formatNgayVN(row.ngay)}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.so_phieu}</td>
                <td className="px-3 py-2">{loaiLabel(t, row.loai)}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{khoDisplay(row, t)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatNumberVN(row.so_luong)}
                  {row.don_vi_tinh ? (
                    <span className="text-muted-foreground text-xs ml-1">{row.don_vi_tinh}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                  {tonSau !== undefined ? formatNumberVN(tonSau) : '—'}
                </td>
                <td className="px-3 py-2 text-xs">{row.trang_thai || '—'}</td>
              </tr>
              );
            })}
          </tbody>
        </>
      ) : undefined}
    </GenericSubTableSection>
  );
};

export default TonKhoPTHangNxHistorySection;
