import React from 'react';
import { BarChart3, Package, Warehouse } from 'lucide-react';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailFieldGrid from '@/components/shared/DetailFieldGrid';
import DetailField from '@/components/shared/DetailField';
import GenericSubTableSection from '@/components/shared/GenericSubTableSection';
import Button from '@/components/ui/Button';
import { BTN_CLOSE } from '@/lib/button-labels';
import { txt } from '@/lib/text';
import { formatDecimal } from '@/lib/utils';
import type { NXTByProductRow, NXTFilters } from '../core/types';
import { useNXTProductWarehouse } from '../hooks/use-kho-ton-kho';

interface Props {
  product: NXTByProductRow | null;
  filters: NXTFilters;
  onClose: () => void;
}

const NxtKyProductDrawer: React.FC<Props> = ({ product, filters, onClose }) => {
  const open = Boolean(product);
  const { data: byWarehouse = [], isLoading, isError, error } = useNXTProductWarehouse(
    filters,
    product?.hang_hoa_id ?? null,
    open
  );

  if (!product) return null;

  return (
    <GenericDrawer
      title={txt('matTranTonKho.nxt.detailDrawer.title')}
      subtitle={product.ten_hang_hoa}
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
        <DetailSection title={txt('matTranTonKho.nxt.detailDrawer.sectionTotals')} icon={<Package size={14} />}>
          <DetailFieldGrid cols={2}>
            <DetailField label={txt('matTranTonKho.nxt.maHang')} value={product.hang_hoa_id} icon={<Package size={14} />} />
            <DetailField label={txt('matTranTonKho.nxt.tenHang')} value={product.ten_hang_hoa} />
            <DetailField label={txt('matTranTonKho.nxt.danhMuc')} value={product.ten_danh_muc ?? '—'} />
            <DetailField label={txt('matTranTonKho.nxt.dvt')} value={product.don_vi_tinh} />
            <DetailField label={txt('matTranTonKho.nxt.tonDau')} value={formatDecimal(product.ton_dau_ky)} />
            <DetailField label={txt('matTranTonKho.nxt.nhap')} value={formatDecimal(product.tong_nhap)} />
            <DetailField label={txt('matTranTonKho.nxt.xuat')} value={formatDecimal(product.tong_xuat)} />
            <DetailField label={txt('matTranTonKho.nxt.tonCuoi')} value={formatDecimal(product.ton_cuoi_ky)} />
          </DetailFieldGrid>
        </DetailSection>

        <GenericSubTableSection
          title={txt('matTranTonKho.nxt.detailDrawer.sectionByWarehouse')}
          icon={<Warehouse size={14} />}
          count={isLoading ? undefined : byWarehouse.length}
          loading={isLoading}
          emptyTitle={txt('matTranTonKho.nxt.detailDrawer.emptyWarehouse')}
          emptyDescription={isError && error instanceof Error ? error.message : undefined}
          maxTableHeight="280px"
        >
          {!isLoading && !isError && byWarehouse.length > 0 ? (
            <>
              <thead className="bg-muted/80 border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {txt('matTranTonKho.nxt.tenKho')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {txt('matTranTonKho.nxt.tonDau')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {txt('matTranTonKho.nxt.nhap')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {txt('matTranTonKho.nxt.xuat')}
                  </th>
                  <th className="text-right px-3 py-2 text-xs font-semibold whitespace-nowrap">
                    {txt('matTranTonKho.nxt.tonCuoi')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {byWarehouse.map((row) => (
                  <tr key={row.kho_id} className="border-b border-border/70">
                    <td className="px-3 py-2">{row.ten_kho}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatDecimal(row.ton_dau_ky)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatDecimal(row.tong_nhap)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                      {formatDecimal(row.tong_xuat)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{formatDecimal(row.ton_cuoi_ky)}</td>
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

export default NxtKyProductDrawer;
