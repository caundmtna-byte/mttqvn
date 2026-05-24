import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Warehouse } from 'lucide-react';
import TonKhoPTHangNxHistorySection from './TonKhoPTHangNxHistorySection';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '../../../../components/shared/GenericDrawer';
import DetailSection from '../../../../components/shared/DetailSection';
import DetailFieldGrid from '../../../../components/shared/DetailFieldGrid';
import DetailField from '../../../../components/shared/DetailField';
import GenericSubTableSection from '../../../../components/shared/GenericSubTableSection';
import Button from '../../../../components/ui/Button';
import { BTN_CLOSE } from '../../../../lib/button-labels';
import { formatNumberVN } from '../../../../lib/utils';
import type { TonKhoPTProductAgg } from '../core/types';

interface Props {
  agg: TonKhoPTProductAgg;
  onClose: () => void;
}

const TonKhoPTProductDetail: React.FC<Props> = ({ agg, onClose }) => {
  const { t } = useTranslation();
  const sortedRows = [...agg.rows].sort((a, b) => a.ten_kho.localeCompare(b.ten_kho));

  return (
    <GenericDrawer
      title={t('tonKhoPhanThuoc.detail.productTitle')}
      subtitle={agg.ma_hang}
      icon={<Package size={18} />}
      onClose={onClose}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      footer={
        <div className="flex w-full justify-end">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground border border-border">
            {BTN_CLOSE()}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <DetailSection title={t('tonKhoPhanThuoc.detail.sectionSummary')} icon={<Package size={14} />}>
          <DetailFieldGrid cols={2}>
            <DetailField label={t('tonKhoPhanThuoc.table.maHang')} value={agg.ma_hang} icon={<Package size={14} />} />
            <DetailField label={t('tonKhoPhanThuoc.table.tenHang')} value={agg.ten_hang} />
            <DetailField label={t('tonKhoPhanThuoc.table.danhMuc')} value={agg.ten_danh_muc ?? '—'} />
            <DetailField label={t('tonKhoPhanThuoc.table.dvt')} value={agg.don_vi_tinh} />
            <DetailField label={t('tonKhoPhanThuoc.byProduct.totalQty')} value={formatNumberVN(agg.tong_so_luong)} />
            <DetailField
              label={t('tonKhoPhanThuoc.byProduct.warehouseCount')}
              value={String(agg.so_kho_co_ton)}
            />
          </DetailFieldGrid>
        </DetailSection>

        <GenericSubTableSection
          title={t('tonKhoPhanThuoc.detail.sectionByWarehouse')}
          icon={<Warehouse size={14} />}
          count={sortedRows.length}
          emptyTitle={t('tonKhoPhanThuoc.empty')}
          maxTableHeight="280px"
        >
          <thead className="bg-muted/80 border-b border-border">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.table.kho')}
              </th>
              <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                {t('tonKhoPhanThuoc.table.soLuong')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={`${r.id_kho}-${r.id_hang_hoa}`} className="border-b border-border/70">
                <td className="px-3 py-2">{r.ten_kho}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatNumberVN(r.so_luong)}</td>
              </tr>
            ))}
          </tbody>
        </GenericSubTableSection>

        <TonKhoPTHangNxHistorySection idHangHoa={agg.id_hang_hoa} />
      </div>
    </GenericDrawer>
  );
};

export default TonKhoPTProductDetail;
