import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, X } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Combobox from '@/components/ui/Combobox';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DIALOG_SIZE, Z_INDEX_APP_MODAL_CLASS } from '@/lib/dialog-sizes';
import { cn } from '@/lib/utils';
import { CONG_VIEC_TRANG_THAI } from '../core/constants';
import { congViecRowToFormValues, type CongViecDanhSachFormValues } from '../core/schema';
import type { CongViecDanhSachRow } from '../core/types';
import { useUpdateCongViecDanhSach } from '../hooks/use-cong-viec-danh-sach';

interface Props {
  open: boolean;
  row: CongViecDanhSachRow | null;
  onClose: () => void;
}

const CongViecBaoCaoDialog: React.FC<Props> = ({ open, row, onClose }) => {
  const updateMutation = useUpdateCongViecDanhSach(onClose);
  const [trangThai, setTrangThai] = useState<CongViecDanhSachFormValues['trang_thai']>('Mới');
  const [ketQua, setKetQua] = useState('');
  const [linkKq, setLinkKq] = useState('');
  const [ngayHoanThanh, setNgayHoanThanh] = useState('');

  const trangThaiOptions = useMemo(
    () => CONG_VIEC_TRANG_THAI.map((m) => ({ label: m, value: m })),
    [],
  );

  useEffect(() => {
    if (!open || !row) return;
    setTrangThai(row.trang_thai);
    setKetQua(row.ket_qua ?? '');
    setLinkKq(row.link_kq ?? '');
    setNgayHoanThanh(row.ngay_hoan_thanh ?? '');
  }, [open, row]);

  if (!open || !row) return null;

  const handleSubmit = () => {
    if (trangThai === 'Hoàn thành' && !ketQua.trim()) {
      toast.error(txt('taskList.reportDialog.ketQuaRequired'));
      return;
    }
    const linkTrim = linkKq.trim();
    if (linkTrim) {
      try {
        const u = new URL(linkTrim);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
      } catch {
        toast.error(txt('taskList.validation.linkUrl'));
        return;
      }
    }
    let ngay = ngayHoanThanh.trim() || undefined;
    if (trangThai === 'Hoàn thành' && !ngay) {
      ngay = new Date().toISOString().slice(0, 10);
    }
    if (trangThai !== 'Hoàn thành') {
      ngay = undefined;
    }
    const base = congViecRowToFormValues(row);
    const data: CongViecDanhSachFormValues = {
      ...base,
      trang_thai: trangThai,
      ket_qua: ketQua.trim() || undefined,
      link_kq: linkTrim || undefined,
      ngay_hoan_thanh: ngay,
    };
    updateMutation.mutate({ id: row.id, data });
  };

  const pending = updateMutation.isPending;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={cn('fixed inset-0 bg-black/25', Z_INDEX_APP_MODAL_CLASS)}
      />
      <div className={cn('fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none')}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className={cn(
            'w-full bg-card rounded-2xl shadow-2xl border border-border pointer-events-auto flex flex-col max-h-[85vh]',
            DIALOG_SIZE.MEDIUM,
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cong-viec-bao-cao-title"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                <ClipboardList size={16} />
              </div>
              <div className="min-w-0">
                <h3 id="cong-viec-bao-cao-title" className="text-sm font-semibold text-foreground truncate">
                  {txt('taskList.reportDialog.title')}
                </h3>
                <p className="text-xs text-muted-foreground truncate">{row.ten_cong_viec}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label={txt('common.close')}
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-xs text-muted-foreground">{txt('taskList.reportDialog.subtitle')}</p>
            <Combobox
              label={txt('taskList.form.trangThai')}
              required
              clearable={false}
              options={trangThaiOptions}
              value={trangThai}
              onChange={(v) => setTrangThai(v as CongViecDanhSachFormValues['trang_thai'])}
            />
            <FormSection title={txt('taskList.reportDialog.sectionResult')} icon={<ClipboardList size={14} />} variant="muted">
              <FormGrid cols={1}>
                <div className={FORM_GRID_SPAN_FULL}>
                  <Textarea
                    label={txt('taskList.form.ketQua')}
                    rows={4}
                    value={ketQua}
                    onChange={(e) => setKetQua(e.target.value)}
                  />
                </div>
                <div className={FORM_GRID_SPAN_FULL}>
                  <Input
                    label={txt('taskList.form.linkKq')}
                    type="url"
                    placeholder="https://"
                    value={linkKq}
                    onChange={(e) => setLinkKq(e.target.value)}
                  />
                </div>
                {trangThai === 'Hoàn thành' ? (
                  <Input
                    label={txt('taskList.form.ngayHoanThanh')}
                    type="date"
                    value={ngayHoanThanh}
                    onChange={(e) => setNgayHoanThanh(e.target.value)}
                  />
                ) : null}
              </FormGrid>
            </FormSection>
          </div>

          <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
            <Button variant="outline" type="button" onClick={onClose} disabled={pending} className="text-xs h-8">
              {txt('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={pending} className="bg-primary text-white text-xs h-8 px-4">
              {txt('taskList.reportDialog.submit')}
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default CongViecBaoCaoDialog;
