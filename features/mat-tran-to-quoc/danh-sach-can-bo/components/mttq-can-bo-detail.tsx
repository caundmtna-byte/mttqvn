import React from 'react';
import {
  BadgeCheck,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  Church,
  Edit,
  Layers,
  MapPin,
  Phone,
  Trash2,
  User,
  UserCircle2,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import type { MttqCanBoRow } from '../core/types';
import { formatDateTimeShort } from '@/lib/utils';
import {
  canBoPhoneTelHref,
  formatCanBoDetailDate,
  formatCanBoPhoneDisplay,
  trimmedDisplay,
} from '../utils/display-format';
import { formatTenDonViCongTacDisplay } from '@/lib/format-ten-don-vi-cap-quan-ly';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { computeAgeFromBirthDate } from '../utils/age';
import MttqCanBoTapHuanSection from './mttq-can-bo-tap-huan-section';
import MttqCanBoKhenThuongSection from './mttq-can-bo-khen-thuong-section';

interface Props {
  data: MttqCanBoRow;
  onClose: () => void;
  onEdit: (item: MttqCanBoRow) => void;
  onDelete: (id: string) => void;
}

const MttqCanBoDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranOfficerList');
  const tuoi = data.tuoi ?? computeAgeFromBirthDate(data.ngay_sinh);
  const phoneDisplay = formatCanBoPhoneDisplay(data.dien_thoai);
  const phoneHref = canBoPhoneTelHref(data.dien_thoai);
  const summarySubtitleParts = [trimmedDisplay(data.ten_chuc_vu), trimmedDisplay(data.ten_to_chuc)].filter(Boolean);

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
      onClose={onClose}
      title={txt('matTranCanBo.detail.title')}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      icon={<Users size={18} aria-hidden />}
      subtitle={`${txt('matTranCanBo.detail.subtitle')} · ${data.ho_ten}`}
      footer={footer}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Users size={26} className="text-white" aria-hidden />
            </DetailSummaryIconTile>
          }
          title={trimmedDisplay(data.ho_ten) ?? txt('common.emptyCell')}
          subtitle={
            summarySubtitleParts.length > 0 ? (
              <p className="m-0 truncate">{summarySubtitleParts.join(' · ')}</p>
            ) : undefined
          }
        />

        <DetailSection title={txt('matTranCanBo.detail.sectionNhanThan')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranCanBo.form.hoTen')}
              icon={<User size={12} />}
              value={trimmedDisplay(data.ho_ten) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.ngaySinh')}
              icon={<Calendar size={12} />}
              value={formatCanBoDetailDate(data.ngay_sinh) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.store.tuoiCol')}
              icon={<UserCircle2 size={12} />}
              value={tuoi != null ? txt('matTranCanBo.display.ageYears', { years: String(tuoi) }) : undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.gioiTinh')}
              icon={<UserCircle2 size={12} />}
              value={trimmedDisplay(data.gioi_tinh) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.danToc')}
              icon={<Users size={12} />}
              value={trimmedDisplay(data.ten_dan_toc) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.tonGiao')}
              icon={<Church size={12} />}
              value={trimmedDisplay(data.ton_giao) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.dangVien')}
              icon={<BadgeCheck size={12} />}
              value={data.dang_vien ? txt('matTranCanBo.detail.dangVienYes') : txt('matTranCanBo.detail.dangVienNo')}
            />
            <DetailField
              label={txt('matTranCanBo.form.ngayVaoDang')}
              icon={<Calendar size={12} />}
              value={formatCanBoDetailDate(data.ngay_vao_dang) ?? undefined}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranCanBo.detail.sectionToChuc')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranCanBo.form.toChuc')}
              icon={<Building2 size={12} />}
              value={trimmedDisplay(data.ten_to_chuc) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.phongBan')}
              icon={<Layers size={12} />}
              value={trimmedDisplay(data.ten_phong_ban) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.chucVu')}
              icon={<Briefcase size={12} />}
              value={trimmedDisplay(data.ten_chuc_vu) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.donVi')}
              icon={<MapPin size={12} />}
              value={
                (() => {
                  const d = formatTenDonViCongTacDisplay(data.chuc_vu_cap_quan_ly, data.ten_don_vi);
                  if (d === txt('common.emptyCell')) return undefined;
                  return (
                    <span className="text-body-sm text-foreground whitespace-pre-wrap break-words">
                      {d}
                    </span>
                  );
                })()
              }
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('matTranCanBo.form.ngayThamGiaToChuc')}
              icon={<Calendar size={12} />}
              value={formatCanBoDetailDate(data.ngay_tham_gia_to_chuc) ?? undefined}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranCanBo.detail.sectionHocVan')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranCanBo.form.trinhDo')}
              icon={<BookOpen size={12} />}
              value={trimmedDisplay(data.ten_trinh_do) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.lyLuanChinhTri')}
              icon={<BookOpen size={12} />}
              value={trimmedDisplay(data.ten_ly_luan_chinh_tri) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.vanHoa')}
              icon={<BookOpen size={12} />}
              value={trimmedDisplay(data.van_hoa) ?? undefined}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranCanBo.detail.sectionLienHe')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranCanBo.form.diaChi')}
              icon={<MapPin size={12} />}
              value={(() => {
                const d = trimmedDisplay(data.dia_chi);
                return d ? <p className="whitespace-pre-wrap break-words">{d}</p> : undefined;
              })()}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranCanBo.form.queQuan')}
              icon={<MapPin size={12} />}
              value={(() => {
                const d = trimmedDisplay(data.que_quan);
                return d ? <p className="whitespace-pre-wrap break-words">{d}</p> : undefined;
              })()}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranCanBo.form.noiOHienNay')}
              icon={<MapPin size={12} />}
              value={(() => {
                const d = trimmedDisplay(data.noi_o_hien_nay);
                return d ? <p className="whitespace-pre-wrap break-words">{d}</p> : undefined;
              })()}
            />
            <DetailField
              label={txt('matTranCanBo.form.dienThoai')}
              icon={<Phone size={12} />}
              value={
                phoneDisplay
                  ? phoneHref
                    ? (
                        <a href={phoneHref} className="font-mono tabular-nums text-primary hover:underline">
                          {phoneDisplay}
                        </a>
                      )
                    : (
                        <span className="font-mono tabular-nums">{phoneDisplay}</span>
                      )
                  : undefined
              }
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranCanBo.detail.sectionTrangThai')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranCanBo.form.trangThai')}
              icon={<BadgeCheck size={12} />}
              value={trimmedDisplay(data.ten_trang_thai) ?? undefined}
            />
            <DetailField
              label={txt('matTranCanBo.form.ngayNhapTrangThai')}
              icon={<Calendar size={12} />}
              value={formatCanBoDetailDate(data.ngay_nhap_trang_thai) ?? undefined}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranCanBo.detail.sectionHeThong')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranCanBo.detail.creator')}
              icon={<User size={12} />}
              value={
                trimmedDisplay(data.ho_va_ten_nguoi_tao)
                ?? trimmedDisplay(data.ten_tai_khoan_nguoi_tao)
                ?? undefined
              }
            />
            <DetailField
              label={txt('matTranCanBo.detail.createdAt')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_tao)}
            />
            <DetailField
              label={txt('matTranCanBo.detail.updatedAt')}
              icon={<CalendarClock size={12} />}
              value={formatDateTimeShort(data.tg_cap_nhat)}
            />
          </DetailFieldGrid>
        </DetailSection>

        <MttqCanBoTapHuanSection canBoId={data.id} />
        <MttqCanBoKhenThuongSection canBoId={data.id} />
      </div>
    </GenericDrawer>
  );
};

export default MttqCanBoDetail;
