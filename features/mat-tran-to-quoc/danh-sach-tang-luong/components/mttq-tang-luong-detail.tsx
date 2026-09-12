import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Banknote,
  Calendar,
  Edit,
  FileText,
  Layers,
  Printer,
  StickyNote,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import EnumBadge from '@/components/ui/EnumBadge';
import type { MttqTangLuongListRow } from '../core/types';
import { getTangLuongLoaiKyBadgeConfig } from '../utils/display-format';
import { BTN_CLOSE, BTN_DELETE, BTN_EDIT, CONFIRM_DELETE } from '@/lib/button-labels';
import Button from '@/components/ui/Button';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useCan } from '@/hooks/use-can';
import { TANG_LUONG_LIST_PATH } from '../core/constants';

interface Props {
  data: MttqTangLuongListRow;
  onClose: () => void;
  onEdit: (row: MttqTangLuongListRow) => void;
  onDelete: (row: MttqTangLuongListRow) => void;
}

const loaiKyBadge = getTangLuongLoaiKyBadgeConfig();

const MttqTangLuongDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranSalaryIncreaseList');
  // Nút in chỉ hiện khi có quyền xem module; bản ghi đang mở đã nằm trong phạm
  // vi dòng của người xem (danh sách đã lọc qua `canViewTangLuongRow`), và trang
  // in kiểm tra lại lần nữa trước khi dựng văn bản.
  const canViewModule = useCan('view', 'matTranSalaryIncreaseList');
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);

  const handleDelete = () => {
    confirm({
      title: txt('matTranTangLuong.deleteTitle'),
      message: txt('matTranTangLuong.deleteMessage', { ngay: formatDateShort(data.ngay_nang_luong) }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: () => onDelete(data),
    });
  };

  const fileLink = useMemo(() => {
    const u = data.file_quyet_dinh?.trim();
    if (!u) return null;
    return u.startsWith('http') ? u : u;
  }, [data.file_quyet_dinh]);

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
      {canViewModule || canEdit || canDelete ? (
        <div className="flex items-center gap-2">
          {canViewModule && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`${TANG_LUONG_LIST_PATH}/${data.id}/in-quyet-dinh`)}
              className="h-8 px-3 text-xs text-sky-600 hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/50 dark:text-sky-400 border border-sky-200 hover:border-sky-300 dark:border-sky-800 dark:hover:border-sky-700"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {txt('matTranTangLuong.printPreview.print')}
            </Button>
          )}
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

  return (
    <GenericDrawer
      onClose={onClose}
      title={txt('matTranTangLuong.detail.title')}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      icon={<TrendingUp size={18} />}
      subtitle={data.ho_ten_can_bo}
      footer={footer}
      footerCompact
    >
      <div className="space-y-6">
        <DetailSection title={txt('matTranTangLuong.form.sectionMain')} icon={<TrendingUp size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailField
              icon={<User size={12} />}
              label={txt('matTranTangLuong.form.canBo')}
              value={data.ho_ten_can_bo}
            />
            <DetailField
              icon={<Calendar size={12} />}
              label={txt('matTranTangLuong.form.ngayNang')}
              value={formatDateShort(data.ngay_nang_luong)}
            />
            <DetailField
              icon={<TrendingUp size={12} />}
              label={txt('matTranTangLuong.form.loaiKy')}
              value={<EnumBadge value={data.loai_ky} config={loaiKyBadge} />}
            />
            <DetailField
              icon={<Calendar size={12} />}
              label={txt('matTranTangLuong.form.ngayDenHanGoc')}
              value={data.ngay_den_han_goc ? formatDateShort(data.ngay_den_han_goc) : '—'}
            />
            <DetailField
              icon={<Layers size={12} />}
              label={txt('matTranTangLuong.form.ngachCu')}
              value={data.ten_ngach_cu?.trim() || '—'}
            />
            <DetailField
              icon={<Layers size={12} />}
              label={txt('matTranTangLuong.form.bacCu')}
              value={data.ma_bac_cu?.trim() || '—'}
            />
            <DetailField
              icon={<Layers size={12} />}
              label={txt('matTranTangLuong.form.ngachMoi')}
              value={data.ten_ngach_moi?.trim() || '—'}
            />
            <DetailField
              icon={<Layers size={12} />}
              label={txt('matTranTangLuong.form.bacMoi')}
              value={data.ma_bac_moi?.trim() || '—'}
            />
            <DetailField
              icon={<Banknote size={12} />}
              label={txt('matTranTangLuong.form.luong')}
              value={data.luong > 0 ? formatCurrency(data.luong) : '—'}
            />
            <DetailField
              icon={<StickyNote size={12} />}
              label={txt('matTranTangLuong.form.ghiChu')}
              value={data.ghi_chu?.trim() || '—'}
              className="sm:col-span-2"
            />
            <DetailField
              icon={<FileText size={12} />}
              label={txt('matTranTangLuong.form.fileQuyetDinh')}
              value={
                fileLink ? (
                  <a
                    href={fileLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm break-all"
                  >
                    {data.file_quyet_dinh}
                  </a>
                ) : (
                  '—'
                )
              }
              className="sm:col-span-2"
            />
          </div>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default MttqTangLuongDetail;
