import React from 'react';
import { Edit, Trash2, Megaphone, Calendar, Clock, FileText, Building2, Users, Link2, Percent, ListChecks, CheckCircle2, ClipboardList } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge from '@/components/ui/EnumBadge';
import type { ThucHienPhanBien } from '../core/types';
import { loaiHinhBadge, tinhTrangBadge } from '../core/display-badges';
import { tinhTienDo } from '../core/display-tien-do';
import { formatTenDonViThucHien } from '../utils/display-don-vi-thuc-hien';

interface Props {
  data: ThucHienPhanBien;
  onClose: () => void;
  onEdit: (item: ThucHienPhanBien) => void;
  onDelete: (id: string) => void;
}

const ThucHienPhanBienDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('phanBienThucHien');
  const tienDoLabel = tinhTienDo(data.ngay_ket_thuc) ?? data.mo_ta_thoi_gian ?? '—';

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
              {data.tinh_trang?.trim() ? (
                <EnumBadge value={data.tinh_trang.trim()} config={tinhTrangBadge} shape="pill" truncate />
              ) : null}
            </div>
          }
        />

        <DetailSection title={txt('pbxhThucHien.form.sectionMain')} icon={<FileText size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('pbxhThucHien.store.capThucHienCol')} value={data.cap_thuc_hien} icon={<Building2 size={12} />} />
            <DetailField label={txt('pbxhThucHien.store.loaiHinhCol')} value={data.loai_hinh} icon={<Megaphone size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('pbxhThucHien.store.noiDungCol')}
              value={data.noi_dung}
              icon={<FileText size={12} />}
            />
            <DetailField label={txt('pbxhThucHien.store.doiTuongCol')} value={data.ten_doi_tuong ?? ''} icon={<Users size={12} />} emptyText="—" />
            <DetailField label={txt('pbxhThucHien.store.hinhThucCol')} value={data.ten_hinh_thuc ?? ''} icon={<ListChecks size={12} />} emptyText="—" />
            <DetailField label={txt('pbxhThucHien.store.tienDoCol')} value={tienDoLabel} icon={<Clock size={12} />} />
            <DetailField
              label={txt('pbxhThucHien.store.soLanHoanThanhCol')}
              value={String(data.so_lan_hoan_thanh)}
              icon={<CheckCircle2 size={12} />}
            />
            <DetailField
              label={txt('pbxhThucHien.store.soLanKhaoSatCol')}
              value={String(data.so_lan_khao_sat)}
              icon={<ClipboardList size={12} />}
            />
            <DetailField
              label={txt('pbxhThucHien.store.phanTramCol')}
              value={`${data.phan_tram_hoan_thanh}%`}
              icon={<Percent size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('pbxhThucHien.form.sectionThoiGian')} icon={<Calendar size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('pbxhThucHien.store.ngayBatDauCol')}
              value={data.ngay_bat_dau ? formatDateShort(data.ngay_bat_dau) : ''}
              icon={<Calendar size={12} />}
              emptyText="—"
            />
            <DetailField
              label={txt('pbxhThucHien.store.ngayKetThucCol')}
              value={data.ngay_ket_thuc ? formatDateShort(data.ngay_ket_thuc) : ''}
              icon={<Calendar size={12} />}
              emptyText="—"
            />
            <DetailField
              label={txt('pbxhThucHien.store.moTaThoiGianCol')}
              value={data.mo_ta_thoi_gian ?? ''}
              icon={<Calendar size={12} />}
              emptyText="—"
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('pbxhThucHien.form.sectionDonVi')} icon={<Building2 size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('pbxhThucHien.store.donViChuTriCol')} value={data.ten_don_vi_chu_tri ?? ''} icon={<Building2 size={12} />} emptyText="—" />
            <DetailField label={txt('pbxhThucHien.store.phongBanCol')} value={data.ten_phong_ban ?? ''} icon={<Users size={12} />} emptyText="—" />
            <DetailField
              label={txt('pbxhThucHien.store.donViThucHienCol')}
              value={formatTenDonViThucHien(data)}
              icon={<Building2 size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('pbxhThucHien.store.ketQuaCol')}
              value={data.ket_qua_kien_nghi ?? ''}
              icon={<FileText size={12} />}
              emptyText="—"
            />
            {data.link_ket_qua?.trim() ? (
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('pbxhThucHien.store.linkKetQuaCol')}
                value={
                  <a
                    href={data.link_ket_qua}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate inline-flex items-center gap-1"
                  >
                    <Link2 size={12} />
                    {data.link_ket_qua}
                  </a>
                }
                icon={<Link2 size={12} />}
              />
            ) : null}
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('page.articleSettings.detailSystem')} icon={<Clock size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('page.articleSettings.colTgCapNhat')} value={formatDateTimeShort(data.tg_cap_nhat)} icon={<Calendar size={12} />} />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default ThucHienPhanBienDetail;
