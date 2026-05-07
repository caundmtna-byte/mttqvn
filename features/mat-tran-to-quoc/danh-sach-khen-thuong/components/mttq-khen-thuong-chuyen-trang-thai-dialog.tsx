import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft, StickyNote, Tag } from 'lucide-react';
import { txt } from '@/lib/text';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { MTTQ_KHEN_THUONG_TRANG_THAI } from '../core/constants';
import {
  mttqKhenThuongStatusChangeSchema,
  type MttqKhenThuongStatusChangeValues,
} from '../core/schema';

const FORM_ID = 'mttq-khen-thuong-status-change-form';

interface Props {
  open: boolean;
  onClose: () => void;
  initial: MttqKhenThuongStatusChangeValues;
  isSubmitting?: boolean;
  onSave: (values: MttqKhenThuongStatusChangeValues) => void | Promise<void>;
}

/**
 * Popup giữa màn đổi trạng thái + ghi chú.
 * Quy chuẩn: `docs/patterns-detail-status-change.md` — dùng `GenericDrawer` + `variant="modal"`, không dùng drawer trượt.
 */
const MttqKhenThuongChuyenTrangThaiDialog: React.FC<Props> = ({
  open,
  onClose,
  initial,
  isSubmitting = false,
  onSave,
}) => {
  const trangThaiOpts = MTTQ_KHEN_THUONG_TRANG_THAI.map((v) => ({ label: v, value: v }));

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MttqKhenThuongStatusChangeValues>({
    resolver: zodResolver(mttqKhenThuongStatusChangeSchema) as Resolver<MttqKhenThuongStatusChangeValues>,
    defaultValues: initial,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      trang_thai: initial.trang_thai,
      ghi_chu: initial.ghi_chu,
    });
  }, [open, initial, reset]);

  const onSubmit: SubmitHandler<MttqKhenThuongStatusChangeValues> = async (formData) => {
    await Promise.resolve(onSave(formData));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.MEDIUM}`}
      onClose={onClose}
      title={txt('matTranKhenThuong.statusChangeModal.title')}
      icon={<ArrowRightLeft size={18} />}
      subtitle={txt('matTranKhenThuong.statusChangeModal.subtitle')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit
          compact
          saveLabel={txt('matTranKhenThuong.statusChangeModal.save')}
          createIcon={<ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection title={txt('matTranKhenThuong.statusChangeModal.section')} icon={<Tag size={14} />} variant="primary">
          <FormGrid>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranKhenThuong.form.trangThai')}
                  options={trangThaiOpts}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.trang_thai?.message}
                  icon={<Tag size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranKhenThuong.form.ghiChu')}
                icon={<StickyNote size={12} />}
                {...register('ghi_chu')}
                rows={4}
                placeholder={txt('matTranKhenThuong.statusChangeModal.ghiChuPlaceholder')}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqKhenThuongChuyenTrangThaiDialog;
