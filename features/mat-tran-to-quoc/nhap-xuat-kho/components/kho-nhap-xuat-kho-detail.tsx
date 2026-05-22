import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Building2,
  Calculator,
  Calendar,
  Coins,
  Edit,
  FileText,
  HandHeart,
  Hash,
  Info,
  ListOrdered,
  Package,
  Ruler,
  StickyNote,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import EmptyState from '@/components/shared/EmptyState';
import TabGroup, { type Tab } from '@/components/ui/TabGroup';
import { formatCurrency, formatDateShort, formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import type { NhapXuatKhoDetail, NhapXuatKhoCtRow } from '../core/types';
import type { NhapXuatKhoLoaiPhieu } from '../core/constants';

const TAB_INFO = 'info';
const TAB_LINES = 'chiTiet';

interface Props {
  data: NhapXuatKhoDetail;
  onClose: () => void;
  onEdit: (item: NhapXuatKhoDetail) => void;
  onDelete: (id: string) => void;
}

function loaiPhieuIcon(loai: NhapXuatKhoLoaiPhieu) {
  switch (loai) {
    case 'nhap_ngoai':
      return ArrowDownToLine;
    case 'xuat_ngoai':
      return ArrowUpFromLine;
    case 'chuyen_kho':
      return ArrowLeftRight;
  }
}

const KhoNhapXuatKhoDetailDrawer: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranReliefStockTransactions');
  const confirm = useConfirmStore((s) => s.confirm);
  const [detailTab, setDetailTab] = useState<string>(TAB_INFO);

  useEffect(() => {
    setDetailTab(TAB_INFO);
  }, [data.id]);

  const tabs = useMemo<Tab[]>(
    () => [
      { id: TAB_INFO, label: txt('matTranNhapXuatKho.detail.tabChinh'), icon: Info },
      { id: TAB_LINES, label: txt('matTranNhapXuatKho.detail.tabChiTiet'), icon: Package },
    ],
    [],
  );

  const loaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      nhap_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.nhap_ngoai'), color: 'emerald' },
      xuat_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.xuat_ngoai'), color: 'rose' },
      chuyen_kho: { label: txt('matTranNhapXuatKho.loaiPhieu.chuyen_kho'), color: 'sky' },
    };
  }, []);

  const lines = useMemo<NhapXuatKhoCtRow[]>(() => {
    const all = Array.isArray(data.chi_tiet) ? [...data.chi_tiet] : [];
    return all.sort((a, b) => {
      const ta = a.thu_tu ?? 0;
      const tb = b.thu_tu ?? 0;
      if (ta !== tb) return ta - tb;
      return Number(a.id) - Number(b.id);
    });
  }, [data.chi_tiet]);

  const tongTien = useMemo(
    () => lines.reduce((acc, l) => acc + (Number.isFinite(l.thanh_tien) ? l.thanh_tien : 0), 0),
    [lines],
  );

  const handleDelete = () => {
    confirm({
      title: txt('matTranNhapXuatKho.deleteTitle'),
      message: txt('matTranNhapXuatKho.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: () => onDelete(data.id),
    });
  };

  const HeaderIcon = loaiPhieuIcon(data.loai_phieu);

  const footer = (
    <div className="flex items-center justify-between w-full gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
      >
        {BTN_CLOSE()}
      </Button>
      {canEdit || canDelete ? (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              size="sm"
              onClick={() => {
                onEdit(data);
                onClose();
              }}
              className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_EDIT()}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:text-rose-400 border border-rose-200 hover:border-rose-300 dark:border-rose-800 dark:hover:border-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_DELETE()}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );

  const subtitleParts = [data.so_phieu, data.ngay_phieu ? formatDateShort(data.ngay_phieu) : null].filter(
    (s): s is string => Boolean(s),
  );

  return (
    <GenericDrawer
      onClose={onClose}
      title={txt('matTranNhapXuatKho.detail.title')}
      subtitle={subtitleParts.join(' · ')}
      icon={<HeaderIcon size={18} />}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      footer={footer}
      footerCompact
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <HeaderIcon size={26} className="text-white" aria-hidden />
            </DetailSummaryIconTile>
          }
          title={data.so_phieu}
          subtitle={
            <p className="m-0 text-muted-foreground">
              {data.ten_kho_xuat ?? data.ten_don_vi_cuu_tro ?? '—'}
              {' → '}
              {data.ten_kho_nhap ?? data.ten_dot_cuu_tro ?? '—'}
            </p>
          }
          badge={<EnumBadge value={data.loai_phieu} config={loaiBadge} shape="pill" truncate />}
        />

        <div className="w-full overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
          <TabGroup tabs={tabs} activeTab={detailTab} onChange={setDetailTab} />
        </div>

        {detailTab === TAB_INFO ? (
          <>
            <DetailSection
              title={txt('matTranNhapXuatKho.detail.sectionMain')}
              icon={<FileText size={14} />}
              variant="primary"
            >
              <DetailFieldGrid>
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.soPhieu')}
                  value={<span className="font-semibold tracking-tight tabular-nums">{data.so_phieu}</span>}
                  icon={<Hash size={12} />}
                />
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.loaiPhieu')}
                  value={<EnumBadge value={data.loai_phieu} config={loaiBadge} shape="pill" truncate />}
                  icon={<HeaderIcon size={12} />}
                />
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.ngayPhieu')}
                  value={data.ngay_phieu ? formatDateShort(data.ngay_phieu) : undefined}
                  icon={<Calendar size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.soDong')}
                  value={
                    <span className="tabular-nums font-semibold text-foreground">{lines.length}</span>
                  }
                  icon={<ListOrdered size={12} />}
                />

                {data.ten_kho_xuat || data.kho_xuat_id ? (
                  <DetailField
                    label={txt('matTranNhapXuatKho.detail.khoXuat')}
                    value={data.ten_kho_xuat ?? (data.kho_xuat_id ? `#${data.kho_xuat_id}` : undefined)}
                    icon={<Warehouse size={12} />}
                    emptyText={txt('common.emptyCell')}
                  />
                ) : null}
                {data.ten_kho_nhap || data.kho_nhap_id ? (
                  <DetailField
                    label={txt('matTranNhapXuatKho.detail.khoNhap')}
                    value={data.ten_kho_nhap ?? (data.kho_nhap_id ? `#${data.kho_nhap_id}` : undefined)}
                    icon={<Warehouse size={12} />}
                    emptyText={txt('common.emptyCell')}
                  />
                ) : null}
                {data.ten_don_vi_cuu_tro || data.don_vi_cuu_tro_id ? (
                  <DetailField
                    label={txt('matTranNhapXuatKho.detail.donViCuuTro')}
                    value={
                      data.ten_don_vi_cuu_tro ??
                      (data.don_vi_cuu_tro_id ? `#${data.don_vi_cuu_tro_id}` : undefined)
                    }
                    icon={<Building2 size={12} />}
                    emptyText={txt('common.emptyCell')}
                  />
                ) : null}
                {data.ten_dot_cuu_tro || data.dot_cuu_tro_id ? (
                  <DetailField
                    label={txt('matTranNhapXuatKho.detail.dotCuuTro')}
                    value={data.ten_dot_cuu_tro ?? (data.dot_cuu_tro_id ? `#${data.dot_cuu_tro_id}` : undefined)}
                    icon={<HandHeart size={12} />}
                    emptyText={txt('common.emptyCell')}
                  />
                ) : null}

                <DetailField
                  label={txt('matTranNhapXuatKho.detail.tongTien')}
                  value={
                    tongTien > 0 ? (
                      <span className="tabular-nums font-semibold text-foreground">
                        {formatCurrency(tongTien)}
                      </span>
                    ) : undefined
                  }
                  icon={<Calculator size={12} />}
                  emptyText={txt('common.emptyCell')}
                />

                <DetailField
                  className={DETAIL_FIELD_SPAN_FULL}
                  label={txt('matTranNhapXuatKho.detail.ghiChu')}
                  value={
                    data.ghi_chu?.trim() ? (
                      <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">
                        {data.ghi_chu}
                      </p>
                    ) : undefined
                  }
                  icon={<StickyNote size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
              </DetailFieldGrid>
            </DetailSection>

            <DetailSection title={txt('matTranNhapXuatKho.detail.systemInfo')} icon={<Calendar size={14} />}>
              <DetailFieldGrid>
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.tgTao')}
                  value={data.tg_tao ? formatDateTimeShort(data.tg_tao) : undefined}
                  icon={<Calendar size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
                <DetailField
                  label={txt('matTranNhapXuatKho.detail.tgCapNhat')}
                  value={data.tg_cap_nhat ? formatDateTimeShort(data.tg_cap_nhat) : undefined}
                  icon={<Calendar size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
              </DetailFieldGrid>
            </DetailSection>
          </>
        ) : null}

        {detailTab === TAB_LINES ? (
          <DetailSection
            title={txt('matTranNhapXuatKho.detail.sectionChiTiet')}
            icon={<Package size={14} />}
            variant="primary"
          >
            {lines.length === 0 ? (
              <EmptyState
                title={txt('matTranNhapXuatKho.detail.chiTietEmpty')}
                description={txt('matTranNhapXuatKho.emptyHintCt')}
                icon={<Package size={28} className="text-muted-foreground" aria-hidden />}
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap w-12">
                        {txt('matTranNhapXuatKho.store.ttCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {txt('matTranNhapXuatKho.store.hangHoaCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {txt('matTranNhapXuatKho.store.donViTinhCol')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {txt('matTranNhapXuatKho.store.soLuongCol')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {txt('matTranNhapXuatKho.store.donGiaCol')}
                      </th>
                      <th className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {txt('matTranNhapXuatKho.store.thanhTienCol')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        {txt('matTranNhapXuatKho.store.ghiChuCol')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={line.id} className="border-t border-border last:border-b-0">
                        <td className="px-3 py-2 align-top text-muted-foreground tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex min-w-0 items-center gap-2">
                            <Package size={12} className="shrink-0 text-muted-foreground/70" aria-hidden />
                            <span className="truncate text-foreground">
                              {line.ten_hang_hoa ?? `#${line.hang_hoa_id}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Ruler size={12} aria-hidden />
                            {line.don_vi_tinh}
                          </span>
                        </td>
                        <td className="px-3 py-2 align-top text-right tabular-nums font-medium text-foreground whitespace-nowrap">
                          {line.so_luong}
                        </td>
                        <td className="px-3 py-2 align-top text-right tabular-nums text-muted-foreground whitespace-nowrap">
                          {line.don_gia > 0 ? (
                            <span className="inline-flex items-center gap-1">
                              <Coins size={12} aria-hidden />
                              {formatCurrency(line.don_gia)}
                            </span>
                          ) : (
                            txt('common.emptyCell')
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-right tabular-nums font-semibold text-foreground whitespace-nowrap">
                          {line.thanh_tien > 0 ? formatCurrency(line.thanh_tien) : txt('common.emptyCell')}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <span
                            className="text-muted-foreground line-clamp-2"
                            title={line.ghi_chu ?? undefined}
                          >
                            {line.ghi_chu ?? txt('common.emptyCell')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {tongTien > 0 ? (
                    <tfoot>
                      <tr className="border-t border-border bg-muted/30">
                        <td colSpan={5} className="px-3 py-2 text-right text-muted-foreground font-medium">
                          {txt('matTranNhapXuatKho.detail.tongTien')}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
                          {formatCurrency(tongTien)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            )}
          </DetailSection>
        ) : null}
      </div>
    </GenericDrawer>
  );
};

export default KhoNhapXuatKhoDetailDrawer;
