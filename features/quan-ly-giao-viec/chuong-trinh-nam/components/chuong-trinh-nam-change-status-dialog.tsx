import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, X } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Combobox from '@/components/ui/Combobox';
import Textarea from '@/components/ui/Textarea';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DIALOG_SIZE, Z_INDEX_APP_MODAL_CLASS } from '@/lib/dialog-sizes';
import { cn } from '@/lib/utils';
import { CHUONG_TRINH_NAM_TRANG_THAI } from '../core/constants';
import { chuongTrinhNamRowToFormValues, type ChuongTrinhNamFormValues } from '../core/schema';
import type { ChuongTrinhNam } from '../core/types';
import { useUpdateChuongTrinhNam } from '../hooks/use-chuong-trinh-nam';

interface Props {
  open: boolean;
  program: ChuongTrinhNam | null;
  onClose: () => void;
}

const ChuongTrinhNamChangeStatusDialog: React.FC<Props> = ({ open, program, onClose }) => {
  const updateMutation = useUpdateChuongTrinhNam(onClose);
  const [trangThai, setTrangThai] = useState<ChuongTrinhNamFormValues['trang_thai']>('Hoạt động');
  const [ghiChu, setGhiChu] = useState('');

  const trangThaiOptions = useMemo(
    () => CHUONG_TRINH_NAM_TRANG_THAI.map((t) => ({ label: t, value: t })),
    [],
  );

  useEffect(() => {
    if (!open || !program) return;
    setTrangThai(program.trang_thai);
    setGhiChu(program.ghi_chu ?? '');
  }, [open, program]);

  if (!open || !program) return null;

  const handleSubmit = () => {
    const base = chuongTrinhNamRowToFormValues(program);
    const data: ChuongTrinhNamFormValues = {
      ...base,
      trang_thai: trangThai,
      ghi_chu: ghiChu.trim() || undefined,
    };
    updateMutation.mutate({ id: program.id, data });
  };

  const pending = updateMutation.isPending;

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
              <h2 className="text-sm font-semibold text-foreground">{txt('chuongTrinhNam.changeStatus.title')}</h2>
              <p className="text-xs text-muted-foreground truncate">{program.ten_chuong_trinh}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            onClick={() => !pending && onClose()}
            disabled={pending}
            aria-label={txt('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <FormSection title={txt('chuongTrinhNam.changeStatus.section')} icon={<ArrowRightLeft size={14} />} variant="primary">
            <FormGrid cols={1}>
              <Combobox
                label={txt('chuongTrinhNam.form.trangThai')}
                required
                clearable={false}
                options={trangThaiOptions}
                value={trangThai}
                onChange={(v) => setTrangThai(v as ChuongTrinhNamFormValues['trang_thai'])}
                dropdownInPortal
              />
              <div className={FORM_GRID_SPAN_FULL}>
                <Textarea
                  label={txt('chuongTrinhNam.changeStatus.ghiChu')}
                  rows={4}
                  value={ghiChu}
                  onChange={(e) => setGhiChu(e.target.value)}
                  placeholder={txt('chuongTrinhNam.changeStatus.ghiChuPlaceholder')}
                />
              </div>
            </FormGrid>
          </FormSection>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={() => !pending && onClose()} disabled={pending}>
            {txt('common.cancel')}
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={pending} className="bg-primary text-white">
            {txt('chuongTrinhNam.changeStatus.submit')}
          </Button>
        </div>
        </motion.div>
      </div>
    </>
  );
};

export default ChuongTrinhNamChangeStatusDialog;
