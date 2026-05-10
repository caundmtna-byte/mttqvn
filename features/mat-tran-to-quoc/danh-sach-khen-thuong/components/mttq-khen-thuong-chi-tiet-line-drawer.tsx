import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlignLeft,
  Link2,
  ListChecks,
  Medal,
  UserCircle,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Combobox from '@/components/ui/Combobox';
import CanBoCombobox from '@/features/mat-tran-to-quoc/danh-sach-can-bo/components/can-bo-combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DRAWER_WIDTH_STACKED } from '@/lib/dialog-sizes';
import {
  mttqKhenThuongChiTietLineSchema,
  type MttqKhenThuongChiTietLineFormValues,
} from '../core/schema';

const EMPTY_LINE: MttqKhenThuongChiTietLineFormValues = {
  id: undefined,
  can_bo_id: '',
  hinh_thuc_khen: 'Thường xuyên',
  danh_hieu: 'Giấy khen',
  noi_dung_khen: undefined,
  ho_so_khen: undefined,
};

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  /** Giá trị ban đầu khi mở drawer (đồng bộ khi `open` bật). */
  initialLine: MttqKhenThuongChiTietLineFormValues;
  canBoOptions: { label: string; value: string }[];
  hinhThucOpts: { label: string; value: string }[];
  danhHieuOpts: { label: string; value: string }[];
  /** Trả về Promise khi cần đợi ghi DB trước khi đóng drawer (vd. lưu từ màn detail). */
  onSave: (values: MttqKhenThuongChiTietLineFormValues) => void | Promise<void>;
  /** Đang ghi DB (vd. cập nhật từ drawer detail). */
  isSubmitting?: boolean;
  /** Mặc định 1 — drawer mở trên drawer cha (form/detail). */
  stackLevel?: number;
}

const FORM_ID = 'mttq-khen-thuong-chi-tiet-line-form';

const MttqKhenThuongChiTietLineDrawer: React.FC<Props> = ({
  open,
  onClose,
  mode,
  initialLine,
  canBoOptions,
  hinhThucOpts,
  danhHieuOpts,
  onSave,
  isSubmitting = false,
  stackLevel = 1,
}) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MttqKhenThuongChiTietLineFormValues>({
    resolver: zodResolver(mttqKhenThuongChiTietLineSchema) as Resolver<MttqKhenThuongChiTietLineFormValues>,
    defaultValues: EMPTY_LINE,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      ...EMPTY_LINE,
      ...initialLine,
      id: initialLine.id,
      can_bo_id: initialLine.can_bo_id ?? '',
      hinh_thuc_khen: initialLine.hinh_thuc_khen ?? 'Thường xuyên',
      danh_hieu: initialLine.danh_hieu ?? 'Giấy khen',
      noi_dung_khen: initialLine.noi_dung_khen,
      ho_so_khen: initialLine.ho_so_khen,
    });
  }, [open, initialLine, reset]);

  const onSubmit: SubmitHandler<MttqKhenThuongChiTietLineFormValues> = async (formData) => {
    await Promise.resolve(onSave(formData));
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      stackLevel={stackLevel}
      maxWidthClass={DRAWER_WIDTH_STACKED}
      onClose={onClose}
      title={mode === 'add' ? txt('matTranKhenThuong.chiTietDrawer.titleAdd') : txt('matTranKhenThuong.chiTietDrawer.titleEdit')}
      icon={<UserCircle size={18} />}
      subtitle={txt('matTranKhenThuong.form.sectionChiTiet')}
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
        <FormSection title={txt('matTranKhenThuong.form.sectionChiTiet')} icon={<Users size={14} />} variant="primary">
          <FormGrid>
            <Controller
              name="can_bo_id"
              control={control}
              render={({ field }) => (
                <CanBoCombobox
                  createFormStackLevel={stackLevel + 1}
                  label={txt('matTranKhenThuong.form.canBo')}
                  options={canBoOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  placeholder={txt('common.select')}
                  error={errors.can_bo_id?.message}
                  icon={<Users size={12} />}
                  required
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="hinh_thuc_khen"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranKhenThuong.form.hinhThuc')}
                  options={hinhThucOpts}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.hinh_thuc_khen?.message}
                  icon={<ListChecks size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="danh_hieu"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranKhenThuong.form.danhHieu')}
                  options={danhHieuOpts}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.danh_hieu?.message}
                  icon={<Medal size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranKhenThuong.form.noiDung')}
                icon={<AlignLeft size={12} />}
                {...register('noi_dung_khen')}
                error={errors.noi_dung_khen?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranKhenThuong.form.hoSo')}
                icon={<Link2 size={12} />}
                {...register('ho_so_khen')}
                error={errors.ho_so_khen?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqKhenThuongChiTietLineDrawer;
export { EMPTY_LINE as MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE };
