import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, IdCard, ListChecks, UserCircle, Users } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DRAWER_WIDTH_STACKED } from '@/lib/dialog-sizes';
import {
  mttqTapHuanChiTietLineSchema,
  type MttqTapHuanChiTietLineFormValues,
} from '../core/schema';

const EMPTY_LINE: MttqTapHuanChiTietLineFormValues = {
  id: undefined,
  can_bo_id: '',
  chuc_vu: '',
  don_vi_cong_tac: '',
  thuoc_dien: 'Biên chế',
};

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  /** Giá trị ban đầu khi mở drawer (đồng bộ khi `open` bật). */
  initialLine: MttqTapHuanChiTietLineFormValues;
  canBoOptions: { label: string; value: string }[];
  thuocDienOpts: { label: string; value: string }[];
  /** Điền chức vụ / đơn vị từ hồ sơ cán bộ khi đổi combobox cán bộ. */
  resolveFromCanBo: (canBoId: string) => { chuc_vu: string; don_vi_cong_tac: string };
  /** Trả về Promise khi cần đợi ghi DB trước khi đóng drawer (vd. lưu từ màn detail). */
  onSave: (values: MttqTapHuanChiTietLineFormValues) => void | Promise<void>;
  /** Đang ghi DB (vd. cập nhật từ drawer detail). */
  isSubmitting?: boolean;
  /** Mặc định 1 — drawer mở trên drawer cha (form/detail). */
  stackLevel?: number;
}

const FORM_ID = 'mttq-tap-huan-chi-tiet-line-form';

const MttqTapHuanChiTietLineDrawer: React.FC<Props> = ({
  open,
  onClose,
  mode,
  initialLine,
  canBoOptions,
  thuocDienOpts,
  resolveFromCanBo,
  onSave,
  isSubmitting = false,
  stackLevel = 1,
}) => {
  const {
    handleSubmit,
    control,
    register,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MttqTapHuanChiTietLineFormValues>({
    resolver: zodResolver(mttqTapHuanChiTietLineSchema) as Resolver<MttqTapHuanChiTietLineFormValues>,
    defaultValues: EMPTY_LINE,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      ...EMPTY_LINE,
      ...initialLine,
      id: initialLine.id,
      can_bo_id: initialLine.can_bo_id ?? '',
      chuc_vu: initialLine.chuc_vu ?? '',
      don_vi_cong_tac: initialLine.don_vi_cong_tac ?? '',
      thuoc_dien: initialLine.thuoc_dien ?? 'Biên chế',
    });
  }, [open, initialLine, reset]);

  const onSubmit: SubmitHandler<MttqTapHuanChiTietLineFormValues> = async (formData) => {
    await Promise.resolve(onSave(formData));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      stackLevel={stackLevel}
      maxWidthClass={DRAWER_WIDTH_STACKED}
      onClose={onClose}
      title={
        mode === 'add'
          ? txt('matTranTapHuan.chiTietDrawer.titleAdd')
          : txt('matTranTapHuan.chiTietDrawer.titleEdit')
      }
      icon={<UserCircle size={18} />}
      subtitle={txt('matTranTapHuan.form.sectionChiTiet')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit={mode === 'edit'}
          compact
          createIcon={<Users className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection
          title={txt('matTranTapHuan.form.sectionChiTiet')}
          icon={<Users size={14} />}
          variant="primary"
        >
          <FormGrid>
            <Controller
              name="can_bo_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTapHuan.form.canBo')}
                  options={canBoOptions}
                  value={field.value}
                  onChange={(v) => {
                    const id = String(v);
                    field.onChange(id);
                    const snap = resolveFromCanBo(id);
                    setValue('chuc_vu', snap.chuc_vu, { shouldDirty: true, shouldValidate: true });
                    setValue('don_vi_cong_tac', snap.don_vi_cong_tac, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  placeholder={txt('common.select')}
                  error={errors.can_bo_id?.message}
                  icon={<Users size={12} />}
                  required
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranTapHuan.form.chucVu')}
                icon={<IdCard size={12} />}
                {...register('chuc_vu')}
                error={errors.chuc_vu?.message}
                required
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranTapHuan.form.donViCongTac')}
                icon={<Building2 size={12} />}
                {...register('don_vi_cong_tac')}
                error={errors.don_vi_cong_tac?.message}
                required
              />
            </div>
            <Controller
              name="thuoc_dien"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTapHuan.form.thuocDien')}
                  options={thuocDienOpts}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.thuoc_dien?.message}
                  icon={<ListChecks size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqTapHuanChiTietLineDrawer;
export { EMPTY_LINE as MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE };
