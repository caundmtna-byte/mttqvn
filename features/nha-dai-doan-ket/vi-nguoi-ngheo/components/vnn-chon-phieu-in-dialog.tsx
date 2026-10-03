import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardList, HandCoins, Printer } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer from '@/components/shared/GenericDrawer';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { BTN_CLOSE } from '@/lib/button-labels';
import { VNN_LIST_PATH, type VnnLoaiPhieuIn } from '../core/constants';
import { vnnLoaiPhieu } from '../core/phieu-khao-sat';
import type { ViNguoiNgheo } from '../core/types';

interface Props {
  /** `null` ⇒ đóng. */
  item: Pick<ViNguoiNgheo, 'id' | 'ho_ten_nguoi_nhan' | 'linh_vuc_ho_tro'> | null;
  onClose: () => void;
}

const ICON: Record<VnnLoaiPhieuIn, React.ReactNode> = {
  'khao-sat': <ClipboardList size={20} />,
  'ban-giao': <HandCoins size={20} />,
};

export function vnnTenPhieuIn(loai: VnnLoaiPhieuIn): string {
  return txt(`viNguoiNgheo.inPhieu.tenPhieu.${loai}`);
}

/** Phiếu khảo sát chỉ có khi lĩnh vực có phiếu; biên bản bàn giao luôn có. */
export function vnnPhieuInCoSan(linhVuc: string | null | undefined): VnnLoaiPhieuIn[] {
  return vnnLoaiPhieu(linhVuc) ? ['khao-sat', 'ban-giao'] : ['ban-giao'];
}

/** Popup chọn phiếu in ⇒ mở trang xem trước `/:id/in/:loai`. */
const VnnChonPhieuInDialog: React.FC<Props> = ({ item, onClose }) => {
  const navigate = useNavigate();
  if (!item) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.COMPACT}`}
      onClose={onClose}
      title={txt('viNguoiNgheo.inPhieu.chonPhieuTitle')}
      subtitle={item.ho_ten_nguoi_nhan}
      icon={<Printer size={18} />}
      footer={
        <div className="flex justify-end w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
          >
            {BTN_CLOSE()}
          </Button>
        </div>
      }
      footerCompact
    >
      <div className="space-y-2">
        {vnnPhieuInCoSan(item.linh_vuc_ho_tro).map((loai) => (
          <button
            key={loai}
            type="button"
            onClick={() => {
              onClose();
              navigate(`${VNN_LIST_PATH}/${encodeURIComponent(item.id)}/in/${loai}`);
            }}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {ICON[loai]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{vnnTenPhieuIn(loai)}</span>
              <span className="block text-xs text-muted-foreground">
                {txt(`viNguoiNgheo.inPhieu.moTa.${loai}`)}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </GenericDrawer>
  );
};

export default VnnChonPhieuInDialog;
