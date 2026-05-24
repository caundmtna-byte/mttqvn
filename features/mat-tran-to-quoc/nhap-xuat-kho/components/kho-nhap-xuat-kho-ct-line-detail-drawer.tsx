import React from 'react';
import { Calculator, Coins, Edit, Hash, Package, Ruler, StickyNote } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer from '@/components/shared/GenericDrawer';
import { DRAWER_WIDTH_DETAIL_SMALL } from '@/lib/dialog-sizes';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatCurrency, formatDecimal } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT } from '@/lib/button-labels';
import type { NhapXuatKhoCtRow } from '../core/types';

interface Props {
  line: NhapXuatKhoCtRow;
  soPhieu: string;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const NhapXuatKhoCtLineDetailDrawer: React.FC<Props> = ({ line, soPhieu, canEdit, onClose, onEdit }) => {
  const tenHangHoa = line.ten_hang_hoa?.trim() ? line.ten_hang_hoa : `#${line.hang_hoa_id}`;

  return (
    <GenericDrawer
      stackLevel={1}
      maxWidthClass={DRAWER_WIDTH_DETAIL_SMALL}
      onClose={onClose}
      title={txt('matTranNhapXuatKho.detail.lineDetailTitle')}
      subtitle={
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-medium text-foreground">{tenHangHoa}</span>
          <span className="text-muted-foreground text-sm font-normal">· {soPhieu}</span>
        </span>
      }
      icon={<Package size={18} />}
      footerCompact
      footer={
        <div className="flex items-center justify-end w-full gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
          >
            {BTN_CLOSE()}
          </Button>
          {canEdit ? (
            <Button
              size="sm"
              onClick={onEdit}
              className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_EDIT()}
            </Button>
          ) : null}
        </div>
      }
    >
      <DetailSection title={txt('matTranNhapXuatKho.form.sectionChiTiet')} icon={<Package size={14} />} variant="primary">
        <DetailFieldGrid>
          <DetailField
            className={DETAIL_FIELD_SPAN_FULL}
            label={txt('matTranNhapXuatKho.form.hangHoa')}
            value={<span className="font-medium text-foreground">{tenHangHoa}</span>}
            icon={<Package size={12} />}
            emptyText={txt('common.emptyCell')}
          />
          <DetailField
            label={txt('matTranNhapXuatKho.form.donViTinh')}
            value={line.don_vi_tinh}
            icon={<Ruler size={12} />}
            emptyText={txt('common.emptyCell')}
          />
          <DetailField
            label={txt('matTranNhapXuatKho.form.soLuong')}
            value={
              <span className="tabular-nums font-medium text-foreground">{formatDecimal(line.so_luong)}</span>
            }
            icon={<Hash size={12} />}
            emptyText={txt('common.emptyCell')}
          />
          <DetailField
            label={txt('matTranNhapXuatKho.form.donGia')}
            value={
              line.don_gia > 0 ? (
                <span className="tabular-nums text-foreground">{formatCurrency(line.don_gia)}</span>
              ) : undefined
            }
            icon={<Coins size={12} />}
            emptyText={txt('common.emptyCell')}
          />
          <DetailField
            label={txt('matTranNhapXuatKho.form.thanhTien')}
            value={
              line.thanh_tien > 0 ? (
                <span className="tabular-nums font-semibold text-foreground">{formatCurrency(line.thanh_tien)}</span>
              ) : undefined
            }
            icon={<Calculator size={12} />}
            emptyText={txt('common.emptyCell')}
          />
          <DetailField
            className={DETAIL_FIELD_SPAN_FULL}
            label={txt('matTranNhapXuatKho.form.chiTietGhiChu')}
            value={
              line.ghi_chu?.trim() ? (
                <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{line.ghi_chu}</p>
              ) : undefined
            }
            icon={<StickyNote size={12} />}
            emptyText={txt('common.emptyCell')}
          />
        </DetailFieldGrid>
      </DetailSection>
    </GenericDrawer>
  );
};

export default NhapXuatKhoCtLineDetailDrawer;
