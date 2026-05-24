import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Package, Warehouse } from 'lucide-react';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '../../../../components/shared/GenericDrawer';
import DetailSection from '../../../../components/shared/DetailSection';
import DetailFieldGrid from '../../../../components/shared/DetailFieldGrid';
import DetailField from '../../../../components/shared/DetailField';
import GenericSubTableSection from '../../../../components/shared/GenericSubTableSection';
import Button from '../../../../components/ui/Button';
import { BTN_CLOSE } from '../../../../lib/button-labels';
import { formatNumberVN } from '../../../../lib/utils';
import type { NXTByProductPTRow, NXTPTFilters } from '../core/types';
import { useFarmNXTPTProductWarehouse } from '../hooks/use-farm-ton-kho-pt';

interface Props {
  product: NXTByProductPTRow | null;
  filters: NXTPTFilters;
  onClose: () => void;
}

const NXTKyPTProductDrawer: React.FC<Props> = ({ product, filters, onClose }) => {
  const { t } = useTranslation();
  const open = Boolean(product);
  const { data: byWarehouse = [], isLoading, isError, error } = useFarmNXTPTProductWarehouse(
    filters,
    product?.id_hang_hoa ?? null,
    open
  );

  if (!product) return null;

  return (
    <GenericDrawer
      title={t('tonKhoPhanThuoc.nxt.detailDrawer.title')}
      subtitle={product.ma_hang}
      icon={<BarChart3 size={18} />}
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
        <DetailSection title={t('tonKhoPhanThuoc.nxt.detailDrawer.sectionTotals')} icon={<Package size={14} />}>
          <DetailFieldGrid cols={2}>
            <DetailField label={t('tonKhoPhanThuoc.nxt.maHang')} value={product.ma_hang} icon={<Package size={14} />} />
            <DetailField label={t('tonKhoPhanThuoc.nxt.tenHang')} value={product.ten_hang} />
            <DetailField label={t('tonKhoPhanThuoc.nxt.danhMuc')} value={product.ten_danh_muc ?? '—'} />
            <DetailField label={t('tonKhoPhanThuoc.nxt.dvt')} value={product.don_vi_tinh} />
            <DetailField label={t('tonKhoPhanThuoc.nxt.tonDau')} value={formatNumberVN(product.ton_dau_ky)} />
            <DetailField label={t('tonKhoPhanThuoc.nxt.nhap')} value={formatNumberVN(product.tong_nhap)} />
            <DetailField label={t('tonKhoPhanThuoc.nxt.xuat')} value={formatNumberVN(product.tong_xuat)} />
            <DetailField label={t('tonKhoPhanThuoc.nxt.tonCuoi')} value={formatNumberVN(product.ton_cuoi_ky)} />
          </DetailFieldGrid>
        </DetailSection>

        <GenericSubTableSection
          title={t('tonKhoPhanThuoc.nxt.detailDrawer.sectionByWarehouse')}
          icon={<Warehouse size={14} />}
          count={isLoading ? undefined : byWarehouse.length}
          loading={isLoading}
          loadingText={t('tonKhoPhanThuoc.nxt.loading')}
          emptyTitle={isError ? t('common.error') : t('tonKhoPhanThuoc.nxt.detailDrawer.emptyWarehouse')}
          emptyDescription={isError ? (error instanceof Error ? error.message : String(error)) : undefined}
          maxTableHeight="320px"
        >
          {!isLoading && !isError && byWarehouse.length > 0 ? (
            <>
              <thead className="bg-muted/80 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {t('tonKhoPhanThuoc.nxt.maKho')}
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {t('tonKhoPhanThuoc.nxt.tenKho')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {t('tonKhoPhanThuoc.nxt.tonDau')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {t('tonKhoPhanThuoc.nxt.nhap')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {t('tonKhoPhanThuoc.nxt.xuat')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {t('tonKhoPhanThuoc.nxt.tonCuoi')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {byWarehouse.map((r) => (
                  <tr key={r.id_kho} className="border-b border-border/70">
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.ma_kho}</td>
                    <td className="px-3 py-2">{r.ten_kho}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatNumberVN(r.ton_dau_ky)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatNumberVN(r.tong_nhap)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {formatNumberVN(r.tong_xuat)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatNumberVN(r.ton_cuoi_ky)}</td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : undefined}
        </GenericSubTableSection>
      </div>
    </GenericDrawer>
  );
};

export default NXTKyPTProductDrawer;
