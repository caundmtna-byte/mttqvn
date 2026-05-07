import React from 'react';
import {
  BookOpen,
  Building2,
  Edit,
  Flag,
  MapPin,
  StickyNote,
  Trash2,
  Type,
  User,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import type { MttqUyVienUyBan } from '../core/types';
import { donViDisplayLabel } from '../utils/column-search';
import {
  formatUyVienDetailDate,
  formatUyVienMaUvDisplay,
  formatUyVienPhoneDisplay,
  getUyVienDangVienBadgeConfig,
  getUyVienGioiTinhBadgeConfig,
  getUyVienTrangThamGiaBadgeConfig,
  uyVienPhoneTelHref,
} from '../utils/display-format';

interface Props {
  data: MttqUyVienUyBan;
  onClose: () => void;
  onEdit: (item: MttqUyVienUyBan) => void;
  onDelete: (id: string) => void;
}

const MttqUyVienUyBanDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranCommitteeMembers');
  const confirm = useConfirmStore((s) => s.confirm);
  const tinhCap = txt('matTranUyVienUyBan.tinhCap');
  const emptyCell = txt('common.emptyCell');
  const maUvDisplay = formatUyVienMaUvDisplay(data.ma_uv);
  const phoneDisplay = formatUyVienPhoneDisplay(data.so_dien_thoai);
  const phoneHref = uyVienPhoneTelHref(data.so_dien_thoai);

  const handleDelete = () => {
    confirm({
      title: txt('matTranUyVienUyBan.deleteTitle'),
      message: txt('matTranUyVienUyBan.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: () => onDelete(data.id),
    });
  };

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

  const subtitle = [formatUyVienMaUvDisplay(data.ma_uv), data.ten_nhiem_ky].filter(Boolean).join(' · ');

  return (
    <GenericDrawer
      onClose={onClose}
      title={txt('matTranUyVienUyBan.detail.title')}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      icon={<Users size={18} />}
      subtitle={subtitle}
      footer={footer}
      footerCompact
    >
      <div className="space-y-5">
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-primary/20 shadow-lg shrink-0">
            <Users size={24} className="text-white" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h2 className="text-base font-bold text-foreground leading-tight truncate tracking-tight">{data.ho_va_ten}</h2>
            <p className="text-body-sm text-muted-foreground truncate">{data.ten_nhiem_ky}</p>
          </div>
        </div>

        <DetailSection title={txt('matTranUyVienUyBan.detail.sectionMain')} icon={<Type size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranUyVienUyBan.form.maUv')}
              value={
                maUvDisplay ? (
                  <span className="font-mono tabular-nums tracking-tight">{maUvDisplay}</span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.form.nhiemKy')}
              value={<span className="font-semibold tracking-tight">{data.ten_nhiem_ky}</span>}
              icon={<Type size={12} />}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.form.donVi')}
              value={donViDisplayLabel(data, tinhCap)}
              icon={<MapPin size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranUyVienUyBan.form.chucVuDonVi')}
              value={data.chuc_vu_don_vi ?? undefined}
              icon={<Building2 size={12} />}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranUyVienUyBan.detail.sectionCaNhan')} icon={<User size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranUyVienUyBan.form.ngaySinh')}
              value={formatUyVienDetailDate(data.ngay_sinh) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.form.gioiTinh')}
              value={
                data.gioi_tinh?.trim() ? (
                  <EnumBadge
                    value={data.gioi_tinh.trim()}
                    config={getUyVienGioiTinhBadgeConfig()}
                    fallbackLabel={data.gioi_tinh.trim()}
                  />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.form.trangThamGia')}
              value={
                data.trang_thai_tham_gia?.trim() ? (
                  <EnumBadge
                    value={data.trang_thai_tham_gia.trim()}
                    config={getUyVienTrangThamGiaBadgeConfig()}
                    fallbackLabel={data.trang_thai_tham_gia.trim()}
                  />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.form.ngayNhapTrangThai')}
              value={formatUyVienDetailDate(data.ngay_nhap_trang_thai) ?? undefined}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranUyVienUyBan.detail.sectionHocVan')} icon={<BookOpen size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranUyVienUyBan.form.vanHoa')} value={data.van_hoa ?? undefined} emptyText={emptyCell} />
            <DetailField label={txt('matTranUyVienUyBan.form.trinhDoCm')} value={data.trinh_do_cm ?? undefined} emptyText={emptyCell} />
            <DetailField label={txt('matTranUyVienUyBan.form.trinhDoLlct')} value={data.trinh_do_llct ?? undefined} emptyText={emptyCell} />
            <DetailField label={txt('matTranUyVienUyBan.form.danToc')} value={data.dan_toc ?? undefined} emptyText={emptyCell} />
            <DetailField label={txt('matTranUyVienUyBan.form.tonGiao')} value={data.ton_giao ?? undefined} emptyText={emptyCell} />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranUyVienUyBan.detail.sectionDang')} icon={<Flag size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranUyVienUyBan.form.dangVien')}
              value={<EnumBadge value={data.dang_vien ? 'Có' : 'Không'} config={getUyVienDangVienBadgeConfig()} />}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.form.ngayVaoDang')}
              value={formatUyVienDetailDate(data.ngay_vao_dang) ?? undefined}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranUyVienUyBan.detail.sectionLienHe')} icon={<MapPin size={14} />}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranUyVienUyBan.form.queQuan')}
              value={data.que_quan ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranUyVienUyBan.form.noiOHienNay')}
              value={data.noi_o_hien_nay ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.form.soDienThoai')}
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
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranUyVienUyBan.form.sectionGhiChu')} icon={<StickyNote size={14} />}>
          <DetailField
            className={DETAIL_FIELD_SPAN_FULL}
            label={txt('matTranUyVienUyBan.form.ghiChu')}
            value={
              data.ghi_chu?.trim() ? (
                <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.ghi_chu}</p>
              ) : undefined
            }
            emptyText={emptyCell}
          />
        </DetailSection>

        <DetailSection title={txt('matTranUyVienUyBan.detail.systemInfo')} icon={<User size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranUyVienUyBan.store.nguoiTaoCol')}
              value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.detail.tgTao')}
              value={data.tg_tao ? formatDateTimeShort(data.tg_tao) : undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('matTranUyVienUyBan.detail.tgCapNhat')}
              value={data.tg_cap_nhat ? formatDateTimeShort(data.tg_cap_nhat) : undefined}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default MttqUyVienUyBanDetail;
