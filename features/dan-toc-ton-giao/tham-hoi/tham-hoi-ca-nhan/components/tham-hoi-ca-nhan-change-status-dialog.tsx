import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, X } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Combobox from '@/components/ui/Combobox';
import Input from '@/components/ui/Input';
import { DIALOG_SIZE, Z_INDEX_APP_MODAL_CLASS } from '@/lib/dialog-sizes';
import { cn } from '@/lib/utils';
import { TRANG_THAI_VALUES } from '../core/constants';
import type { TrangThaiThamHoi } from '../core/constants';
import type { ThamHoiCaNhan } from '../core/types';
import { useUpdateThamHoiCaNhanTrangThai } from '../hooks/use-tham-hoi-ca-nhan';

interface Props {
  open: boolean;
  item: ThamHoiCaNhan | null;
  onClose: () => void;
}

const ThamHoiCaNhanChangeStatusDialog: React.FC<Props> = ({ open, item, onClose }) => {
  const updateMutation = useUpdateThamHoiCaNhanTrangThai(onClose);
  const [trangThai, setTrangThai] = useState<TrangThaiThamHoi>('Chưa thực hiện');
  const [thoiGianThucTe, setThoiGianThucTe] = useState('');

  const trangThaiOptions = useMemo(
    () => TRANG_THAI_VALUES.map((t) => ({ label: t, value: t })),
    [],
  );

  useEffect(() => {
    if (!open || !item) return;
    setTrangThai(item.trang_thai);
    setThoiGianThucTe(item.thoi_gian_thuc_te ?? '');
  }, [open, item]);

  if (!open || !item) return null;

  const pending = updateMutation.isPending;

  const handleSubmit = () => {
    updateMutation.mutate({
      id: item.id,
      trangThai,
      thoiGianThucTe: trangThai === 'Đã hoàn thành' ? thoiGianThucTe || undefined : undefined,
    });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !pending && onClose()}
        className={cn('fixed inset-0 bg-black/25', Z_INDEX_APP_MODAL_CLASS)}
        aria-hidden
      />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className={cn(
            'pointer-events-auto w-full rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]',
            DIALOG_SIZE.MEDIUM,
          )}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ArrowRightLeft size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">
                  {txt('danTocThamHoiCaNhan.detail.changeStatusTitle')}
                </h2>
                <p className="text-xs text-muted-foreground truncate">{item.ho_va_ten ?? item.dip_tham_hoi}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} disabled={pending}>
              <X size={16} />
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">{txt('danTocThamHoiCaNhan.detail.changeStatusHint')}</p>
            <Combobox
              label={txt('danTocThamHoiCaNhan.form.trangThai')}
              options={trangThaiOptions}
              value={trangThai}
              onChange={(v) => setTrangThai(v as TrangThaiThamHoi)}
            />
            {trangThai === 'Đã hoàn thành' ? (
              <Input
                label={txt('danTocThamHoiCaNhan.form.thoiGianThucTe')}
                type="date"
                value={thoiGianThucTe}
                onChange={(e) => setThoiGianThucTe(e.target.value)}
              />
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>
              {txt('common.cancel')}
            </Button>
            <Button type="button" size="sm" onClick={handleSubmit} disabled={pending}>
              {txt('common.save')}
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ThamHoiCaNhanChangeStatusDialog;
