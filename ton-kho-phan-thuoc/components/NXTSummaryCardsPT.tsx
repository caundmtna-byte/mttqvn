import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, ArrowDownCircle, ArrowUpCircle, Layers } from 'lucide-react';
import type { TonKhoPTSummaryTotals } from '../core/types';

const CARD_CLASS = 'bg-card rounded-xl border border-border p-3 sm:p-4 transition-all hover:shadow-md';
const ICON_WRAP = 'w-9 h-9 rounded-lg flex items-center justify-center shrink-0';

interface Props {
  summary: TonKhoPTSummaryTotals;
}

const NXTSummaryCardsPT: React.FC<Props> = ({ summary }) => {
  const { t } = useTranslation();
  const items = [
    { labelKey: 'tonKhoPhanThuoc.summary.tonDauKy', value: summary.ton_dau_ky, icon: Layers, iconClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400' },
    { labelKey: 'tonKhoPhanThuoc.summary.tongNhap', value: summary.tong_nhap, icon: ArrowDownCircle, iconClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { labelKey: 'tonKhoPhanThuoc.summary.tongXuat', value: summary.tong_xuat, icon: ArrowUpCircle, iconClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { labelKey: 'tonKhoPhanThuoc.summary.tonCuoiKy', value: summary.ton_cuoi_ky, icon: Package, iconClass: 'bg-primary/10 text-primary' },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.labelKey} className={CARD_CLASS}>
            <div className="flex items-center gap-3">
              <div className={`${ICON_WRAP} ${item.iconClass}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{t(item.labelKey)}</p>
                <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{item.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NXTSummaryCardsPT;
