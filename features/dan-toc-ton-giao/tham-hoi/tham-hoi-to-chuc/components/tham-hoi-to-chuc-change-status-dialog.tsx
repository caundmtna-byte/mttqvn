import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, X } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Combobox from '@/components/ui/Combobox';
import Input from '@/components/ui/Input';
import { DIALOG_SIZE, Z_INDEX_APP_MODAL_CLASS } from '@/lib/dialog-sizes';
import { cn } from '@/lib/utils';
import { TIEN_DO_VALUES } from '../core/constants';
import type { TienDoThamHoi } from '../core/constants';
import type { ThamHoiToChuc } from '../core/types';
import { useUpdateThamHoiToChucTienDo } from '../hooks/use-tham-hoi-to-chuc';

interface Props {
  open: boolean;
  item: ThamHoiToChuc | null;
  onClose: () => void;
}

const ThamHoiToChucChangeStatusDialog: React.FC<Props> = ({ open, item, onClose }) => {
  const updateMutation = useUpdateThamHoiToChucTienDo(onClose);
  const [tienDo, setTienDo] = useState<TienDoThamHoi>('Chưa thực hiện');
  const [thoiGianThucTe, setThoiGianThucTe] = useState('');

  const tienDoOptions = useMemo(
    () => TIEN_DO_VALUES.map((t) => ({ label: t, value: t })),
    [],
  );

  useEffect(() => {
    if (!open || !item) return;
    setTienDo(item.tien_do);
    setThoiGianThucTe(item.thoi_gian_thuc_te ?? '');
  }, [open, item]);

  if (!open || !item) return null;

  const pending = updateMutation.isPending;

  const handleSubmit = () => {
    updateMutation.mutate({
      id: item.id,
      tienDo,
      thoiGianThucTe: tienDo === 'Đã hoàn thành' ? thoiGianThucTe || undefined : undefined,
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
                  {txt('danTocThamHoiToChuc.detail.changeStatusTitle')}
                </h2>
                <p className="text-xs text-muted-foreground truncate">{item.ten_co_so ?? item.dip_tham_hoi}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} disabled={pending}>
              <X size={16} />
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">{txt('danTocThamHoiToChuc.detail.changeStatusHint')}</p>
            <Combobox
              label={txt('danTocThamHoiToChuc.form.tienDo')}
              options={tienDoOptions}
              value={tienDo}
              onChange={(v) => setTienDo(v as TienDoThamHoi)}
            />
            {tienDo === 'Đã hoàn thành' ? (
              <Input
                label={txt('danTocThamHoiToChuc.form.thoiGianThucTe')}
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

export default ThamHoiToChucChangeStatusDialog;
