import React, { useMemo } from 'react';
import { Calendar, Edit, FileText, ListOrdered, Package, Ruler, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import type { KhoDanhSachHangHoaDetail } from '../core/types';

interface Props {
  data: KhoDanhSachHangHoaDetail;
  onClose: () => void;
  onEdit: (item: KhoDanhSachHangHoaDetail) => void;
  onDelete: (id: string) => void;
}

const KhoDanhSachHangHoaDetailDrawer: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranReliefGoods');

  const trangThaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
      'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
    };
  }, []);

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
      title={txt('matTranHangHoa.detailHang.title')}
      subtitle={`#${data.id}`}
      icon={<Package size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Package size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_hang_hoa}
          subtitle={<p className="m-0 truncate text-muted-foreground">{data.ten_danh_muc_nhom}</p>}
          badge={<EnumBadge value={data.trang_thai} config={trangThaiBadge} shape="pill" truncate />}
        />

        <DetailSection title={txt('matTranHangHoa.detailHang.section')} icon={<Package size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranHangHoa.store.donViTinh')} value={data.don_vi_tinh} icon={<Package size={12} />} />
            <DetailField label={txt('matTranHangHoa.store.thuTu')} value={String(data.thu_tu)} icon={<ListOrdered size={12} />} />
            <DetailField label={txt('matTranHangHoa.store.quyCach')} value={data.quy_cach} icon={<Ruler size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranHangHoa.store.moTa')}
              value={data.mo_ta}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranHangHoa.detailHang.system')} icon={<Package size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranHangHoa.store.tgTao')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
            <DetailField
              label={txt('matTranHangHoa.store.tgCapNhat')}
              value={formatDateTimeShort(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default KhoDanhSachHangHoaDetailDrawer;
