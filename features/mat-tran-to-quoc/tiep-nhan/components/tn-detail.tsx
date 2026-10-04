import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Building2,
  CalendarDays,
  Coins,
  CreditCard,
  Edit,
  FileText,
  Gift,
  HandCoins,
  HandHeart,
  Landmark,
  ListChecks,
  MapPin,
  Package,
  Printer,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import DetailSystemInfo from '@/components/shared/DetailSystemInfo';
import { BTN_CLOSE, BTN_DELETE, BTN_EDIT } from '@/lib/button-labels';
import { formatDisplayDateShort } from '@/lib/display-format';
import { tenNguoiThaoTac } from '@/lib/nguoi-thao-tac';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { TN_LIST_PATH, TN_MUC_DICH } from '../core/constants';
import type { TiepNhanFull } from '../core/types';
import type { TiepNhanTrangThaiValues } from '../core/schema';
import { tnHinhThucBadge, tnTrangThaiBadge } from '../core/display-badges';
import { useUpdateTiepNhanTrangThai } from '../hooks/use-tiep-nhan';
import { formatTnTien } from '../utils/column-display';
import TnChuyenTrangThaiDialog from './tn-chuyen-trang-thai-dialog';

interface Props {
  data: TiepNhanFull;
  onClose: () => void;
  onEdit: (item: TiepNhanFull) => void;
  onDelete: (id: string) => void;
}

const tien = (n: number | null | undefined) => {
  const s = formatTnTien(n);
  return s ? <span className="tabular-nums text-body-sm text-foreground">{s}</span> : undefined;
};

const TnDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useResourcePermissions('matTranTiepNhan');
  const empty = txt('common.emptyCell');
  const [statusOpen, setStatusOpen] = useState(false);
  const statusMutation = useUpdateTiepNhanTrangThai();

  const toolbarActions: DetailToolbarAction[] = useMemo(() => {
    // In chỉ cần quyền xem — người mở được chi tiết là in được.
    const actions: DetailToolbarAction[] = [
      {
        label: txt('matTranTiepNhan.detail.actionPrint'),
        icon: <Printer size={16} />,
        variant: 'primary',
        onClick: () => navigate(`${TN_LIST_PATH}/${data.id}/in/bien-ban-xac-nhan`),
      },
    ];
    if (canEdit) {
      actions.push({
        label: txt('matTranTiepNhan.detail.actionTrangThai'),
        icon: <ArrowRightLeft size={16} />,
        variant: 'info',
        onClick: () => setStatusOpen(true),
      });
    }
    return actions;
  }, [canEdit, navigate, data.id]);

  const statusInitial: TiepNhanTrangThaiValues = useMemo(
    () => ({ trang_thai: data.trang_thai, ghi_chu: data.ghi_chu ?? '' }),
    [data.trang_thai, data.ghi_chu],
  );

  const mucDichDaChon = TN_MUC_DICH.filter((m) => data.muc_dich.includes(m.value));

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
            onClick={() => {
              onDelete(data.id);
              onClose();
            }}
            className="h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-200"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
            {BTN_DELETE()}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <GenericDrawer
      title={txt('matTranTiepNhan.detail.title')}
      subtitle={data.so_phieu}
      icon={<HandCoins size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <HandCoins size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_nha_tai_tro}
          badge={<EnumBadge value={data.trang_thai} config={tnTrangThaiBadge} shape="pill" truncate />}
          subtitle={
            <span className="tabular-nums font-semibold text-foreground">{formatTnTien(data.tong_gia_tri) || '0 đ'}</span>
          }
        />

        <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />

        <DetailSection title={txt('matTranTiepNhan.detail.sectionChung')} icon={<HandHeart size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('matTranTiepNhan.store.soPhieuCol')} icon={<FileText size={12} />} value={data.so_phieu} />
            <DetailField
              label={txt('matTranTiepNhan.store.ngayCol')}
              icon={<CalendarDays size={12} />}
              value={formatDisplayDateShort(data.ngay_tiep_nhan) || undefined}
              emptyText={empty}
            />
            <DetailField label={txt('matTranTiepNhan.store.nhaTaiTroCol')} icon={<Building2 size={12} />} value={data.ten_nha_tai_tro} />
            <DetailField label={txt('matTranTiepNhan.store.chuongTrinhCol')} icon={<HandHeart size={12} />} value={data.ten_chuong_trinh} />
            <DetailField
              label={txt('matTranTiepNhan.store.donViTiepNhanCol')}
              icon={<Landmark size={12} />}
              value={data.ten_don_vi_tiep_nhan || undefined}
              emptyText={empty}
            />
            <DetailField
              label={txt('matTranTiepNhan.form.diaDiemLap')}
              icon={<MapPin size={12} />}
              value={data.dia_diem_lap || undefined}
              emptyText={empty}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranTiepNhan.detail.sectionGiaTri')} icon={<Coins size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranTiepNhan.form.hinhThuc')}
              icon={<CreditCard size={12} />}
              value={data.hinh_thuc ? <EnumBadge value={data.hinh_thuc} config={tnHinhThucBadge} shape="pill" truncate /> : undefined}
              emptyText={empty}
            />
            <DetailField label={txt('matTranTiepNhan.form.soTien')} icon={<Coins size={12} />} value={tien(data.so_tien)} emptyText={empty} />
            <DetailField
              label={txt('matTranTiepNhan.store.phieuKhoCol')}
              icon={<Package size={12} />}
              value={tien(data.gia_tri_phieu_kho)}
              emptyText={empty}
            />
            <DetailField
              label={txt('matTranTiepNhan.form.hienVatKhacMoTa')}
              icon={<Gift size={12} />}
              value={
                data.hien_vat_khac_mo_ta || data.hien_vat_khac_gia_tri
                  ? [data.hien_vat_khac_mo_ta, formatTnTien(data.hien_vat_khac_gia_tri)].filter(Boolean).join(' — ')
                  : undefined
              }
              emptyText={empty}
            />
            <DetailField
              label={txt('matTranTiepNhan.form.giayToMoTa')}
              icon={<FileText size={12} />}
              value={
                data.giay_to_co_gia_mo_ta || data.giay_to_co_gia_gia_tri
                  ? [data.giay_to_co_gia_mo_ta, formatTnTien(data.giay_to_co_gia_gia_tri)].filter(Boolean).join(' — ')
                  : undefined
              }
              emptyText={empty}
            />
            <DetailField
              label={txt('matTranTiepNhan.store.tongGiaTriCol')}
              icon={<Coins size={12} />}
              value={<span className="tabular-nums font-semibold text-foreground">{formatTnTien(data.tong_gia_tri) || '0 đ'}</span>}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranTiepNhan.detail.sectionPhieuKho')} icon={<Package size={14} />}>
          {data.phieu_kho.length === 0 ? (
            <p className="text-sm text-muted-foreground">{txt('matTranTiepNhan.detail.phieuKhoTrong')}</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.phieu_kho.map((p) => (
                <li key={p.phieu_id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium tabular-nums">{p.so_phieu}</span>
                    <span className="text-muted-foreground"> · {formatDisplayDateShort(p.ngay_phieu)}{p.ten_kho ? ` · ${p.ten_kho}` : ''}</span>
                  </span>
                  <span className="shrink-0 tabular-nums">{formatTnTien(p.tong_tien)}</span>
                </li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection title={txt('matTranTiepNhan.detail.sectionMucDich')} icon={<ListChecks size={14} />}>
          {mucDichDaChon.length === 0 ? (
            <p className="text-sm text-muted-foreground">{txt('matTranTiepNhan.detail.mucDichTrong')}</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {mucDichDaChon.map((m) => (
                <li key={m.value}>{m.label}</li>
              ))}
            </ul>
          )}
        </DetailSection>

        <DetailSection title={txt('matTranTiepNhan.detail.sectionPhuLuc')} icon={<Users size={14} />}>
          {data.phu_luc.length === 0 ? (
            <p className="text-sm text-muted-foreground">{txt('matTranTiepNhan.detail.phuLucTrong')}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left">#</th>
                    <th className="px-2 py-1.5 text-left">{txt('matTranTiepNhan.form.phuLucHoTen')}</th>
                    <th className="px-2 py-1.5 text-left">{txt('matTranTiepNhan.form.phuLucDiaChi')}</th>
                    <th className="px-2 py-1.5 text-left">{txt('matTranTiepNhan.form.phuLucQuanHe')}</th>
                    <th className="px-2 py-1.5 text-left">{txt('matTranTiepNhan.form.phuLucNoiDung')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.phu_luc.map((d, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5 tabular-nums">{i + 1}</td>
                      <td className="px-2 py-1.5">{d.ho_ten}</td>
                      <td className="px-2 py-1.5">{d.dia_chi}</td>
                      <td className="px-2 py-1.5">{d.quan_he}</td>
                      <td className="px-2 py-1.5">{d.noi_dung_gia_tri}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailSection>

        {data.ghi_chu ? (
          <DetailSection title={txt('matTranTiepNhan.form.ghiChu')} icon={<StickyNote size={14} />}>
            <DetailFieldGrid>
              <DetailField className={DETAIL_FIELD_SPAN_FULL} label={txt('matTranTiepNhan.form.ghiChu')} value={data.ghi_chu} />
            </DetailFieldGrid>
          </DetailSection>
        ) : null}

        <DetailSystemInfo
          nguoiTao={tenNguoiThaoTac({ ho_va_ten: data.ho_va_ten_nguoi_tao, ten_tai_khoan: data.ten_tai_khoan_nguoi_tao })}
          tgTao={data.tg_tao}
          nguoiCapNhat={tenNguoiThaoTac({ ho_va_ten: data.ho_va_ten_nguoi_cap_nhat, ten_tai_khoan: data.ten_tai_khoan_nguoi_cap_nhat })}
          tgCapNhat={data.tg_cap_nhat}
        />
      </div>

      <TnChuyenTrangThaiDialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        initial={statusInitial}
        isSubmitting={statusMutation.isPending}
        onSave={async (values) => {
          await statusMutation.mutateAsync({ id: data.id, data: values });
        }}
      />
    </GenericDrawer>
  );
};

export default TnDetail;
