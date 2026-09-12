import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Hash, Landmark, ListOrdered, Type, Wallet } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import StatusToggle from '@/components/ui/StatusToggle';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import type { QuyKey } from '../../core/constants';
import {
  quyDanhMucTaiKhoanSchema,
  type QuyDanhMucTaiKhoanFormValues,
} from '../core/schema';
import type { QuyDanhMucTaiKhoanListRow } from '../core/types';
import {
  useCreateQuyDanhMucTaiKhoan,
  useUpdateQuyDanhMucTaiKhoan,
} from '../hooks/use-quy-danh-muc-tai-khoan';

const FORM_ID = 'quy-danh-muc-tai-khoan-form';

const DEFAULT_VALUES: QuyDanhMucTaiKhoanFormValues = {
  ten: '',
  so_tai_khoan: '',
  ngan_hang: '',
  mo_ta: '',
  thu_tu: '',
  trang_thai: 'Hoạt động',
};

interface Props {
  quy: QuyKey;
  initialData?: QuyDanhMucTaiKhoanListRow | null;
  onClose: () => void;
}

const QuyDanhMucTaiKhoanForm: React.FC<Props> = ({ quy, initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateQuyDanhMucTaiKhoan(quy, onClose);
  const updateMutation = useUpdateQuyDanhMucTaiKhoan(quy, onClose);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuyDanhMucTaiKhoanFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(quyDanhMucTaiKhoanSchema) as Resolver<QuyDanhMucTaiKhoanFormValues>,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ten: initialData.ten,
        so_tai_khoan: initialData.so_tai_khoan ?? '',
        ngan_hang: initialData.ngan_hang ?? '',
        mo_ta: initialData.mo_ta ?? '',
        thu_tu: initialData.thu_tu ? String(initialData.thu_tu) : '',
        trang_thai: initialData.trang_thai,
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<QuyDanhMucTaiKhoanFormValues> = (data) => {
    if (isEdit && initialData) updateMutation.mutate({ id: initialData.id, data });
    else createMutation.mutate(data);
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Wallet size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('quy.danhMucTaiKhoan.form.editSubtitle')} · ${initialData.ten}`
          : txt('quy.danhMucTaiKhoan.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Wallet className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('quy.danhMucTaiKhoan.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('quy.danhMucTaiKhoan.form.ten')}
                required
                icon={Wallet}
                {...register('ten')}
                error={errors.ten?.message}
              />
              <p className="text-xs text-muted-foreground mt-1 m-0">
                {txt('quy.danhMucTaiKhoan.form.tenHint')}
              </p>
            </div>

            <div>
              <Input
                label={txt('quy.danhMucTaiKhoan.form.soTaiKhoan')}
                icon={Hash}
                {...register('so_tai_khoan')}
                error={errors.so_tai_khoan?.message}
              />
              <p className="text-xs text-muted-foreground mt-1 m-0">
                {txt('quy.danhMucTaiKhoan.form.soTaiKhoanHint')}
              </p>
            </div>

            <Input
              label={txt('quy.danhMucTaiKhoan.form.nganHang')}
              icon={Landmark}
              {...register('ngan_hang')}
              error={errors.ngan_hang?.message}
            />

            <Input
              label={txt('quy.danhMucTaiKhoan.form.thuTu')}
              icon={ListOrdered}
              inputMode="numeric"
              {...register('thu_tu')}
              error={errors.thu_tu?.message}
            />

            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <StatusToggle
                    label={txt('quy.danhMucTaiKhoan.form.trangThai')}
                    value={field.value}
                    onChange={(v) => field.onChange(String(v))}
                    activeLabel="Hoạt động"
                    inactiveLabel="Ngừng"
                    error={errors.trang_thai?.message}
                  />
                  <p className="text-xs text-muted-foreground m-0">
                    {txt('quy.danhMucTaiKhoan.form.trangThaiHint')}
                  </p>
                </div>
              )}
            />

            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('quy.danhMucTaiKhoan.form.moTa')}
                rows={3}
                icon={FileText}
                {...register('mo_ta')}
                error={errors.mo_ta?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default QuyDanhMucTaiKhoanForm;
