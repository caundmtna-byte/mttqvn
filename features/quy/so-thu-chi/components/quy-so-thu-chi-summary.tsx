import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatCurrency } from '@/lib/utils';
import type { QuySoDuTaiKhoanRow } from '../../utils/quy-so-du';
import { tongHopSoDu } from '../../utils/quy-so-du';
import type { QuySoThuChiTong } from '../core/types';

interface Props {
  /** Số dư luỹ kế từng tài khoản — KHÔNG phụ thuộc bộ lọc đang bật. */
  soDuRows: QuySoDuTaiKhoanRow[];
  /** Tổng thu / chi của tập dòng đang lọc — do RPC tính trên toàn bộ tập. */
  tongDaLoc: QuySoThuChiTong;
  /** Bộ lọc đang thu hẹp kết quả ⇒ nói rõ hai con số khác nhau ở chỗ nào. */
  dangLoc: boolean;
  isLoading?: boolean;
}

const Tile: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'thu' | 'chi' | 'du';
}> = ({ label, value, icon, tone = 'du' }) => {
  const toneClass =
    tone === 'thu'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'chi'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-foreground';
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2 min-w-0">
      <span className="shrink-0 text-muted-foreground" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={`block text-sm font-semibold tabular-nums truncate ${toneClass}`}>
          {value}
        </span>
      </span>
    </div>
  );
};

/**
 * Dải số dư ở đầu trang sổ.
 *
 * Hai nhóm số CỐ Ý khác nhau và được ghi nhãn rõ:
 * · “trong danh sách đang xem” = tổng thu/chi của tập ĐÃ LỌC (RPC trả về);
 * · “số dư từng tài khoản” = luỹ kế toàn bộ sổ, không đổi theo bộ lọc — vì số
 *   dư quỹ là số dư thật, không phải số dư của một khoảng ngày.
 */
const QuySoThuChiSummary: React.FC<Props> = ({ soDuRows, tongDaLoc, dangLoc, isLoading }) => {
  const tongQuy = tongHopSoDu(soDuRows);

  if (isLoading) {
    return (
      <div className="px-3 py-2.5 border-b border-border">
        <div className="h-[52px] animate-pulse rounded-lg bg-muted/50" />
      </div>
    );
  }

  return (
    <div className="px-3 py-2.5 border-b border-border space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Tile
          label={`${txt('quy.common.tongThu')}${dangLoc ? ' (đang lọc)' : ''}`}
          value={formatCurrency(tongDaLoc.tongThu)}
          icon={<ArrowDownLeft size={16} />}
          tone="thu"
        />
        <Tile
          label={`${txt('quy.common.tongChi')}${dangLoc ? ' (đang lọc)' : ''}`}
          value={formatCurrency(tongDaLoc.tongChi)}
          icon={<ArrowUpRight size={16} />}
          tone="chi"
        />
        <Tile
          label={`${txt('quy.common.soDu')} — toàn quỹ`}
          value={formatCurrency(tongQuy.soDu)}
          icon={<Wallet size={16} />}
        />
      </div>

      <div className="min-w-0">
        <p className="m-0 mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
          {txt('quy.common.soDuTheoTaiKhoan')}
        </p>
        {soDuRows.length === 0 ? (
          <p className="m-0 text-xs text-muted-foreground">{txt('quy.common.soDuChuaCo')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {soDuRows.map((r) => (
              <span
                key={r.tai_khoan_id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs min-w-0"
                title={`${r.ten_tai_khoan}: ${formatCurrency(r.so_du)}`}
              >
                <Landmark size={12} className="shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate max-w-[160px] text-muted-foreground">
                  {r.ten_tai_khoan}
                </span>
                <span
                  className={`font-semibold tabular-nums ${
                    r.so_du < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                  }`}
                >
                  {formatCurrency(r.so_du)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuySoThuChiSummary;
