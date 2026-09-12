import React from 'react';
import { Calendar, Edit, FileText, Hash, Landmark, ListOrdered, Trash2, Wallet } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatCurrency, formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { quyTrangThaiBadge } from '../../core/display-badges';
import type { QuyDanhMucTaiKhoanDetail } from '../core/types';

interface Props {
  data: QuyDanhMucTaiKhoanDetail;
  /** Số dư hiện tại của tài khoản — `null` khi chưa tải xong. */
  soDu: number | null;
  onClose: () => void;
  onEdit: (item: QuyDanhMucTaiKhoanDetail) => void;
  onDelete: (id: string) => void;
}

const QuyDanhMucTaiKhoanDetailDrawer: React.FC<Props> = ({
  data,
  soDu,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { canEdit, canDelete } = useResourcePermissions('quyDanhMucTaiKhoan');

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
      title={txt('quy.danhMucTaiKhoan.detail.title')}
      subtitle={`#${data.id}`}
      icon={<Wallet size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              {data.so_tai_khoan?.trim() ? (
                <Landmark size={26} className="text-white" />
              ) : (
                <Wallet size={26} className="text-white" />
              )}
            </DetailSummaryIconTile>
          }
          title={data.ten}
          subtitle={
            <p className="m-0 truncate text-muted-foreground">
              {[data.so_tai_khoan, data.ngan_hang].filter(Boolean).join(' · ') ||
                txt('quy.danhMucTaiKhoan.filter.loaiNguonTienMat')}
            </p>
          }
        />

        <DetailSection title={txt('quy.danhMucTaiKhoan.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.danhMucTaiKhoan.store.soDuCol')}
              value={soDu == null ? txt('common.emptyCell') : formatCurrency(soDu)}
              icon={<Wallet size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucTaiKhoan.store.trangThaiCol')}
              value={<EnumBadge value={data.trang_thai} config={quyTrangThaiBadge} />}
              icon={<ListOrdered size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucTaiKhoan.form.soTaiKhoan')}
              value={data.so_tai_khoan}
              icon={<Hash size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucTaiKhoan.form.nganHang')}
              value={data.ngan_hang}
              icon={<Landmark size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucTaiKhoan.form.thuTu')}
              value={String(data.thu_tu)}
              icon={<ListOrdered size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('quy.danhMucTaiKhoan.form.moTa')}
              value={data.mo_ta}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('quy.danhMucTaiKhoan.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.danhMucTaiKhoan.detail.tgTao')}
              value={formatDateTimeShort(data.tg_tao)}
              icon={<Calendar size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucTaiKhoan.detail.tgCapNhat')}
              value={formatDateTimeShort(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default QuyDanhMucTaiKhoanDetailDrawer;
