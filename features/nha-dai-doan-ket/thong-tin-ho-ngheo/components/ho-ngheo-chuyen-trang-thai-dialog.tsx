import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
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
import { HNGH_TRANG_THAI_VALUES } from '../core/constants';
import { hoNgheoStatusChangeSchema, type HoNgheoStatusChangeValues } from '../core/schema';

const FORM_ID = 'ho-ngheo-chuyen-trang-thai-form';

interface Props {
  open: boolean;
  onClose: () => void;
  initial: HoNgheoStatusChangeValues;
  isSubmitting?: boolean;
  onSave: (values: HoNgheoStatusChangeValues) => void | Promise<void>;
}

/**
 * Popup giữa màn: đổi trạng thái hộ + ghi lý do.
 *
 * Quy chuẩn `docs/patterns-detail-status-change.md` — `GenericDrawer` +
 * `variant="modal"`, KHÔNG dùng drawer trượt từ phải cho luồng này.
 *
 * Khác Nhà đại đoàn kết: không lọc theo quyền Duyệt. Hộ chỉ có hai trạng thái
 * và cả hai chiều đều hợp lệ — một hộ đã thoát nghèo vẫn có thể tái nghèo.
 */
const HoNgheoChuyenTrangThaiDialog: React.FC<Props> = ({
  open,
  onClose,
  initial,
  isSubmitting = false,
  onSave,
}) => {
  const trangThaiOptions = useMemo(
    () => HNGH_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HoNgheoStatusChangeValues>({
    resolver: zodResolver(hoNgheoStatusChangeSchema) as Resolver<HoNgheoStatusChangeValues>,
    defaultValues: initial,
  });

  useEffect(() => {
    if (!open) return;
    reset({ trang_thai: initial.trang_thai, ghi_chu: initial.ghi_chu });
  }, [open, initial, reset]);

  const onSubmit: SubmitHandler<HoNgheoStatusChangeValues> = async (values) => {
    await Promise.resolve(onSave(values));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.MEDIUM}`}
      onClose={onClose}
      title={txt('hoNgheo.statusChangeModal.title')}
      icon={<ArrowRightLeft size={18} />}
      subtitle={txt('hoNgheo.statusChangeModal.subtitle')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit
          compact
          saveLabel={txt('hoNgheo.statusChangeModal.save')}
          createIcon={<ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection
          title={txt('hoNgheo.statusChangeModal.section')}
          icon={<ListChecks size={14} />}
          variant="primary"
        >
          <FormGrid>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('hoNgheo.store.trangThaiCol')}
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.trang_thai?.message}
                  icon={<ListChecks size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('hoNgheo.statusChangeModal.lyDoLabel')}
                icon={<StickyNote size={12} />}
                {...register('ghi_chu')}
                rows={4}
                placeholder={txt('hoNgheo.statusChangeModal.lyDoPlaceholder')}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('hoNgheo.statusChangeModal.hint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default HoNgheoChuyenTrangThaiDialog;
