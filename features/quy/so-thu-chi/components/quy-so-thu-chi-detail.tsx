import React from 'react';
import {
  Banknote,
  Calendar,
  Edit,
  FileText,
  MapPin,
  Receipt,
  Tag,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatCurrency, formatDate, formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { quyLoaiPhieuBadge } from '../../core/display-badges';
import type { QuySoThuChiDetail } from '../core/types';

interface Props {
  data: QuySoThuChiDetail;
  /**
   * Tên khoản mục / tài khoản tra từ cache danh mục.
   *
   * Bản ghi đọc thẳng từ bảng chỉ có id (xem `core/supabase-select.ts`), nên tên
   * do trang truyền vào. Nếu tra không ra thì hiện `ten_khoan` mà RPC danh sách
   * đã trả (có khi đang mở từ danh sách), cuối cùng mới là "Chưa có".
   */
  tenKhoan?: string | null;
  tenTaiKhoan?: string | null;
  onClose: () => void;
  onEdit: (item: QuySoThuChiDetail) => void;
  onDelete: (id: string) => void;
}

const QuySoThuChiDetailDrawer: React.FC<Props> = ({
  data,
  tenKhoan,
  tenTaiKhoan,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { canEdit, canDelete } = useResourcePermissions('quySoThuChi');
  const khoanLabel = tenKhoan ?? data.ten_khoan;
  const taiKhoanLabel = tenTaiKhoan ?? data.ten_tai_khoan;
  const laPhieuThu = data.loai === 'thu';

  const renderFooter = (
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
      title={txt('quy.soThuChi.detail.title')}
      subtitle={data.so_chung_tu}
      icon={<Receipt size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Receipt size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.so_chung_tu}
          subtitle={
            <span className="flex flex-col gap-1 min-w-0">
              <span
                className={`text-lg font-semibold tabular-nums ${
                  laPhieuThu
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {laPhieuThu ? '+ ' : '− '}
                {formatCurrency(data.so_tien)}
              </span>
              <span className="truncate text-muted-foreground">{data.noi_dung}</span>
            </span>
          }
        />

        <DetailSection title={txt('quy.soThuChi.detail.sectionChungTu')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.soThuChi.store.loaiCol')}
              value={<EnumBadge value={data.loai} config={quyLoaiPhieuBadge} />}
              icon={<Tag size={12} />}
            />
            <DetailField
              label={txt('quy.soThuChi.store.ngayChungTuCol')}
              value={data.ngay_chung_tu ? formatDate(data.ngay_chung_tu) : null}
              icon={<Calendar size={12} />}
            />
            <DetailField
              label={txt('quy.soThuChi.store.khoanCol')}
              value={khoanLabel}
              icon={<Tag size={12} />}
            />
            <DetailField
              label={txt('quy.soThuChi.store.taiKhoanCol')}
              value={taiKhoanLabel}
              icon={<Wallet size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('quy.soThuChi.detail.sectionTien')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.soThuChi.store.soTienCol')}
              value={formatCurrency(data.so_tien)}
              icon={<Banknote size={12} />}
            />
            <DetailField
              label={
                laPhieuThu
                  ? txt('quy.soThuChi.form.nguoiNopNhanThu')
                  : txt('quy.soThuChi.form.nguoiNopNhanChi')
              }
              value={data.nguoi_nop_nhan}
              icon={<User size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('quy.soThuChi.store.noiDungCol')}
              value={data.noi_dung}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('quy.soThuChi.detail.sectionKhac')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.soThuChi.store.donViCol')}
              value={data.ten_don_vi}
              icon={<MapPin size={12} />}
            />
            <DetailField
              label={txt('quy.soThuChi.store.chungTuGocCol')}
              value={data.chung_tu_goc}
              icon={<FileText size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('quy.soThuChi.store.ghiChuCol')}
              value={data.ghi_chu}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('quy.soThuChi.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.soThuChi.detail.nguoiTao')}
              value={data.ho_va_ten_nguoi_tao}
              icon={<User size={12} />}
            />
            <DetailField
              label={txt('quy.soThuChi.detail.tgTao')}
              value={formatDateTimeShort(data.tg_tao)}
              icon={<Calendar size={12} />}
            />
            <DetailField
              label={txt('quy.soThuChi.detail.tgCapNhat')}
              value={formatDateTimeShort(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default QuySoThuChiDetailDrawer;
