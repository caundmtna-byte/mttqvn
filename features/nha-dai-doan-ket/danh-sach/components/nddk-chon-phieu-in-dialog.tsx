import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ClipboardCheck, ClipboardList, HandCoins, Printer } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer from '@/components/shared/GenericDrawer';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { BTN_CLOSE } from '@/lib/button-labels';
import { NDDK_LIST_PATH, type NddkLoaiPhieuIn } from '../core/constants';

interface Props {
  open: boolean;
  onClose: () => void;
  nddkId: string;
  hoTenChuHo: string;
}

const PHIEU: { loai: NddkLoaiPhieuIn; icon: React.ReactNode }[] = [
  { loai: 'khao-sat', icon: <ClipboardList size={20} /> },
  { loai: 'hoan-thanh', icon: <ClipboardCheck size={20} /> },
  { loai: 'ban-giao', icon: <HandCoins size={20} /> },
];

const TEN_KEY: Record<NddkLoaiPhieuIn, string> = {
  'khao-sat': 'nhaDaiDoanKet.printPreview.phieuKhaoSat',
  'hoan-thanh': 'nhaDaiDoanKet.printPreview.phieuHoanThanh',
  'ban-giao': 'nhaDaiDoanKet.printPreview.phieuBanGiao',
};

const MO_TA_KEY: Record<NddkLoaiPhieuIn, string> = {
  'khao-sat': 'nhaDaiDoanKet.printPreview.moTaKhaoSat',
  'hoan-thanh': 'nhaDaiDoanKet.printPreview.moTaHoanThanh',
  'ban-giao': 'nhaDaiDoanKet.printPreview.moTaBanGiao',
};

export function nddkTenPhieuIn(loai: NddkLoaiPhieuIn): string {
  return txt(TEN_KEY[loai]);
}

/** Popup chọn 1 trong 3 biên bản ⇒ mở trang xem trước `/:id/in/:loai`. */
const NddkChonPhieuInDialog: React.FC<Props> = ({ open, onClose, nddkId, hoTenChuHo }) => {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.COMPACT}`}
      onClose={onClose}
      title={txt('nhaDaiDoanKet.printPreview.chonPhieuTitle')}
      subtitle={hoTenChuHo}
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
        {PHIEU.map(({ loai, icon }) => (
          <button
            key={loai}
            type="button"
            onClick={() => {
              onClose();
              navigate(`${NDDK_LIST_PATH}/${encodeURIComponent(nddkId)}/in/${loai}`);
            }}
            className="w-full flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">
                {nddkTenPhieuIn(loai)}
              </span>
              <span className="block text-xs text-muted-foreground">{txt(MO_TA_KEY[loai])}</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </GenericDrawer>
  );
};

export default NddkChonPhieuInDialog;
