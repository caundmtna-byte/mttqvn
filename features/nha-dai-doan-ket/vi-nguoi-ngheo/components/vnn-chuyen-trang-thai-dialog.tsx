import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRightLeft, Calendar, FileSignature, ListChecks, StickyNote } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DIALOG_SIZE } from '@/lib/dialog-sizes';
import { VNN_TRANG_THAI_VALUES } from '../core/constants';
import { vnnTruongBatBuoc, type VnnTruongBatBuoc } from '../core/luat-truong-bat-buoc';
import {
  viNguoiNgheoStatusChangeSchema,
  type ViNguoiNgheoStatusChangeValues,
} from '../core/schema';

const FORM_ID = 'vnn-chuyen-trang-thai-form';
const TRANG_THAI_OPTIONS = VNN_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v }));

const O_BAT_BUOC: Record<VnnTruongBatBuoc, 'date' | 'text'> = {
  ngay_ban_giao: 'date',
  so_quyet_dinh: 'text',
  ngay_quyet_dinh: 'date',
};

interface Props {
  open: boolean;
  onClose: () => void;
  initial: ViNguoiNgheoStatusChangeValues;
  isSubmitting?: boolean;
  onSave: (values: ViNguoiNgheoStatusChangeValues) => void | Promise<void>;
}

/**
 * Popup giữa màn: đổi trạng thái + ghi lý do (`docs/patterns-detail-status-change.md`).
 * Hai trạng thái, không có luật chuyển cứng và không đòi quyền Duyệt.
 */
const VnnChuyenTrangThaiDialog: React.FC<Props> = ({
  open,
  onClose,
  initial,
  isSubmitting = false,
  onSave,
}) => {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ViNguoiNgheoStatusChangeValues>({
    resolver: zodResolver(viNguoiNgheoStatusChangeSchema) as Resolver<ViNguoiNgheoStatusChangeValues>,
    defaultValues: initial,
  });

  useEffect(() => {
    if (!open) return;
    reset(initial);
  }, [open, initial, reset]);

  // Ô bắt buộc của trạng thái đang chọn (điền sẵn giá trị hiện có của biên bản).
  const truongBatBuoc = vnnTruongBatBuoc(watch('trang_thai'), initial.nguon_ho_tro);

  const onSubmit: SubmitHandler<ViNguoiNgheoStatusChangeValues> = async (values) => {
    await Promise.resolve(onSave(values));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      variant="modal"
      maxWidthClass={`w-full ${DIALOG_SIZE.MEDIUM}`}
      onClose={onClose}
      title={txt('viNguoiNgheo.statusChangeModal.title')}
      icon={<ArrowRightLeft size={18} />}
      subtitle={txt('viNguoiNgheo.statusChangeModal.subtitle')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit
          compact
          saveLabel={txt('viNguoiNgheo.statusChangeModal.save')}
          createIcon={<ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection
          title={txt('viNguoiNgheo.statusChangeModal.section')}
          icon={<ListChecks size={14} />}
          variant="primary"
        >
          <FormGrid>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('viNguoiNgheo.store.trangThaiCol')}
                  options={TRANG_THAI_OPTIONS}
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
                label={txt('viNguoiNgheo.statusChangeModal.lyDoLabel')}
                icon={<StickyNote size={12} />}
                {...register('ghi_chu')}
                rows={4}
                placeholder={txt('viNguoiNgheo.statusChangeModal.lyDoPlaceholder')}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('viNguoiNgheo.statusChangeModal.hint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>
        {truongBatBuoc.length > 0 ? (
          <FormSection
            title={txt('viNguoiNgheo.statusChangeModal.sectionBatBuoc')}
            icon={<Calendar size={14} />}
          >
            <FormGrid cols={2}>
              {truongBatBuoc.map((k) => (
                <Input
                  key={k}
                  label={txt(`viNguoiNgheo.bienBanBanGiao.nhan.${k}`)}
                  type={O_BAT_BUOC[k]}
                  icon={O_BAT_BUOC[k] === 'date' ? Calendar : FileSignature}
                  required
                  {...register(k)}
                  error={errors[k]?.message}
                />
              ))}
            </FormGrid>
          </FormSection>
        ) : null}
      </form>
    </GenericDrawer>
  );
};

export default VnnChuyenTrangThaiDialog;
