import React from 'react';
import {
  Edit,
  Trash2,
  Megaphone,
  Calendar,
  Clock,
  FileText,
  Building2,
  Users,
  Link2,
  Percent,
  ListChecks,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  User,
  CalendarClock,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge from '@/components/ui/EnumBadge';
import type { ThucHienPhanBien } from '../core/types';
import { capThucHienBadge, loaiHinhBadge, tinhTrangBadge } from '../core/display-badges';
import {
  formatPbxhDateTimeDisplay,
  formatPbxhDonViThucHienDisplay,
  formatPbxhNgayDisplay,
  formatPbxhNguoiTaoDisplay,
  formatPbxhPhanTramDisplay,
  formatPbxhSoNguyenDisplay,
  formatPbxhTienDoDisplay,
  trimmedPbxhDisplay,
} from '../utils/display-format';

interface Props {
  data: ThucHienPhanBien;
  onClose: () => void;
  onEdit: (item: ThucHienPhanBien) => void;
  onDelete: (id: string) => void;
}

const ThucHienPhanBienDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('phanBienThucHien');
  const emptyCell = txt('common.emptyCell');
  const tienDoLabel = formatPbxhTienDoDisplay(data);

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
              onClick={() => {
                onDelete(data.id);
                onClose();
              }}
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

  return (
    <GenericDrawer
      title={txt('pbxhThucHien.detailTitle')}
      subtitle={`${data.loai_hinh} · #${data.id}`}
      icon={<Megaphone size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Megaphone size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.noi_dung}
          subtitle={
            <div className="flex flex-wrap items-center gap-2">
              {data.loai_hinh?.trim() ? (
                <EnumBadge value={data.loai_hinh.trim()} config={loaiHinhBadge} shape="pill" truncate />
              ) : null}
              {data.cap_thuc_hien?.trim() ? (
                <EnumBadge value={data.cap_thuc_hien.trim()} config={capThucHienBadge} shape="pill" truncate />
              ) : null}
              {data.tinh_trang?.trim() ? (
                <EnumBadge value={data.tinh_trang.trim()} config={tinhTrangBadge} shape="pill" truncate />
              ) : null}
            </div>
          }
        />

        <DetailSection title={txt('pbxhThucHien.form.sectionMain')} icon={<FileText size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('pbxhThucHien.store.capThucHienCol')}
              icon={<Building2 size={12} />}
              value={
                data.cap_thuc_hien?.trim() ? (
                  <EnumBadge value={data.cap_thuc_hien.trim()} config={capThucHienBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.loaiHinhCol')}
              icon={<Megaphone size={12} />}
              value={
                data.loai_hinh?.trim() ? (
                  <EnumBadge value={data.loai_hinh.trim()} config={loaiHinhBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('pbxhThucHien.store.noiDungCol')}
              icon={<FileText size={12} />}
              value={
                trimmedPbxhDisplay(data.noi_dung) ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm font-semibold tracking-tight text-foreground">
                    {data.noi_dung}
                  </p>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.doiTuongCol')}
              icon={<Users size={12} />}
              value={trimmedPbxhDisplay(data.ten_doi_tuong) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.hinhThucCol')}
              icon={<ListChecks size={12} />}
              value={trimmedPbxhDisplay(data.ten_hinh_thuc) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.tinhTrangCol')}
              icon={<ListChecks size={12} />}
              value={
                data.tinh_trang?.trim() ? (
                  <EnumBadge value={data.tinh_trang.trim()} config={tinhTrangBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.tienDoCol')}
              icon={<Clock size={12} />}
              value={
                tienDoLabel ? (
                  <span className="tabular-nums text-body-sm text-foreground">{tienDoLabel}</span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.soLanHoanThanhCol')}
              icon={<CheckCircle2 size={12} />}
              value={
                <span className="tabular-nums text-body-sm text-foreground">
                  {formatPbxhSoNguyenDisplay(data.so_lan_hoan_thanh)}
                </span>
              }
            />
            <DetailField
              label={txt('pbxhThucHien.store.soLanKhaoSatCol')}
              icon={<ClipboardList size={12} />}
              value={
                <span className="tabular-nums text-body-sm text-foreground">
                  {formatPbxhSoNguyenDisplay(data.so_lan_khao_sat)}
                </span>
              }
            />
            <DetailField
              label={txt('pbxhThucHien.store.phanTramCol')}
              icon={<Percent size={12} />}
              value={
                <span className="tabular-nums text-body-sm text-foreground">
                  {formatPbxhPhanTramDisplay(data.phan_tram_hoan_thanh)}
                </span>
              }
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('pbxhThucHien.form.sectionThoiGian')} icon={<Calendar size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('pbxhThucHien.store.ngayBatDauCol')}
              icon={<Calendar size={12} />}
              value={
                formatPbxhNgayDisplay(data.ngay_bat_dau) ? (
                  <span className="tabular-nums">{formatPbxhNgayDisplay(data.ngay_bat_dau)}</span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.ngayKetThucCol')}
              icon={<Calendar size={12} />}
              value={
                formatPbxhNgayDisplay(data.ngay_ket_thuc) ? (
                  <span className="tabular-nums">{formatPbxhNgayDisplay(data.ngay_ket_thuc)}</span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.moTaThoiGianCol')}
              icon={<Calendar size={12} />}
              value={
                trimmedPbxhDisplay(data.mo_ta_thoi_gian) ? (
                  <span className="tabular-nums text-body-sm text-foreground">{data.mo_ta_thoi_gian}</span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('pbxhThucHien.form.sectionDonVi')} icon={<Building2 size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('pbxhThucHien.store.donViChuTriCol')}
              icon={<Building2 size={12} />}
              value={trimmedPbxhDisplay(data.ten_don_vi_chu_tri) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.phongBanCol')}
              icon={<Users size={12} />}
              value={trimmedPbxhDisplay(data.ten_phong_ban) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.donViThucHienCol')}
              icon={<Building2 size={12} />}
              value={formatPbxhDonViThucHienDisplay(data)}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('pbxhThucHien.store.ketQuaCol')}
              icon={<FileText size={12} />}
              value={
                trimmedPbxhDisplay(data.ket_qua_kien_nghi) ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">
                    {data.ket_qua_kien_nghi}
                  </p>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('pbxhThucHien.store.linkKetQuaCol')}
              icon={<Link2 size={12} />}
              value={
                trimmedPbxhDisplay(data.link_ket_qua) ? (
                  <a
                    href={data.link_ket_qua!.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                  >
                    {txt('pbxhThucHien.detail.openLink')}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('pbxhThucHien.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('pbxhThucHien.store.nguoiTaoCol')}
              icon={<User size={12} />}
              value={formatPbxhNguoiTaoDisplay(data) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('pbxhThucHien.store.tgCapNhatCol')}
              icon={<CalendarClock size={12} />}
              value={
                formatPbxhDateTimeDisplay(data.tg_cap_nhat) ? (
                  <span className="tabular-nums">{formatPbxhDateTimeDisplay(data.tg_cap_nhat)}</span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default ThucHienPhanBienDetail;
