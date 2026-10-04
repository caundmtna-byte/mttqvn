import React, { useEffect } from 'react';
import { Controller, useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft, ListChecks, StickyNote } from 'lucide-react';
import { txt } from '@/lib/text';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { TN_TRANG_THAI_VALUES } from '../core/constants';
import { tiepNhanTrangThaiSchema, type TiepNhanTrangThaiValues } from '../core/schema';

const FORM_ID = 'tn-chuyen-trang-thai-form';
const OPTIONS = TN_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v }));

interface Props {
  open: boolean;
  onClose: () => void;
  initial: TiepNhanTrangThaiValues;
  isSubmitting?: boolean;
  onSave: (values: TiepNhanTrangThaiValues) => void | Promise<void>;
}

/**
 * Đăng ký ⇄ Đã bàn giao — hai chiều đều hợp lệ (ghi nhầm thì lùi được), không đòi
 * quyền Duyệt. Lý do được trigger chụp vào `lich_su_trang_thai`.
 */
const TnChuyenTrangThaiDialog: React.FC<Props> = ({ open, onClose, initial, isSubmitting = false, onSave }) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TiepNhanTrangThaiValues>({
    resolver: zodResolver(tiepNhanTrangThaiSchema) as Resolver<TiepNhanTrangThaiValues>,
    defaultValues: initial,
  });

  useEffect(() => {
    if (open) reset(initial);
  }, [open, initial, reset]);

  const onSubmit: SubmitHandler<TiepNhanTrangThaiValues> = async (values) => {
    await Promise.resolve(onSave(values));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.MEDIUM}`}
      onClose={onClose}
      title={txt('matTranTiepNhan.statusChange.title')}
      icon={<ArrowRightLeft size={18} />}
      subtitle={txt('matTranTiepNhan.statusChange.subtitle')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit
          compact
          saveLabel={txt('matTranTiepNhan.statusChange.save')}
          createIcon={<ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection title={txt('matTranTiepNhan.statusChange.title')} icon={<ListChecks size={14} />} variant="primary">
          <FormGrid>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTiepNhan.store.trangThaiCol')}
                  options={OPTIONS}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  icon={<ListChecks size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                  error={errors.trang_thai?.message}
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranTiepNhan.statusChange.lyDo')}
                icon={<StickyNote size={12} />}
                rows={3}
                {...register('ghi_chu')}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default TnChuyenTrangThaiDialog;
