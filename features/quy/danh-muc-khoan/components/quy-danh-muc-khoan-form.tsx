import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDownLeft, ArrowUpRight, FileText, ListOrdered, Tag, Type } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import RadioGroup from '@/components/ui/RadioGroup';
import StatusToggle from '@/components/ui/StatusToggle';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { QUY_LOAI_KHOAN_LABEL, type QuyKey, type QuyLoai } from '../../core/constants';
import { quyDanhMucKhoanSchema, type QuyDanhMucKhoanFormValues } from '../core/schema';
import type { QuyDanhMucKhoanListRow } from '../core/types';
import {
  useCreateQuyDanhMucKhoan,
  useUpdateQuyDanhMucKhoan,
} from '../hooks/use-quy-danh-muc-khoan';

const FORM_ID = 'quy-danh-muc-khoan-form';

const DEFAULT_VALUES: QuyDanhMucKhoanFormValues = {
  loai: 'thu',
  ten: '',
  mo_ta: '',
  thu_tu: '',
  trang_thai: 'Hoạt động',
};

const LOAI_OPTIONS = [
  {
    value: 'thu' as QuyLoai,
    label: QUY_LOAI_KHOAN_LABEL.thu,
    color: 'emerald' as const,
    icon: <ArrowDownLeft size={14} />,
  },
  {
    value: 'chi' as QuyLoai,
    label: QUY_LOAI_KHOAN_LABEL.chi,
    color: 'rose' as const,
    icon: <ArrowUpRight size={14} />,
  },
];

interface Props {
  quy: QuyKey;
  initialData?: QuyDanhMucKhoanListRow | null;
  onClose: () => void;
}

const QuyDanhMucKhoanForm: React.FC<Props> = ({ quy, initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateQuyDanhMucKhoan(quy, onClose);
  const updateMutation = useUpdateQuyDanhMucKhoan(quy, onClose);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuyDanhMucKhoanFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(quyDanhMucKhoanSchema) as Resolver<QuyDanhMucKhoanFormValues>,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        loai: initialData.loai,
        ten: initialData.ten,
        mo_ta: initialData.mo_ta ?? '',
        thu_tu: initialData.thu_tu ? String(initialData.thu_tu) : '',
        trang_thai: initialData.trang_thai,
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<QuyDanhMucKhoanFormValues> = (data) => {
    if (isEdit && initialData) updateMutation.mutate({ id: initialData.id, data });
    else createMutation.mutate(data);
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Tag size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('quy.danhMucKhoan.form.editSubtitle')} · ${initialData.ten}`
          : txt('quy.danhMucKhoan.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Tag className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('quy.danhMucKhoan.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="loai"
                control={control}
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <RadioGroup
                      label={txt('quy.danhMucKhoan.form.loai')}
                      required
                      options={LOAI_OPTIONS}
                      value={field.value}
                      onChange={(v) => field.onChange(String(v))}
                      error={errors.loai?.message}
                      layout="horizontal"
                    />
                    <p className="text-xs text-muted-foreground m-0">
                      {isEdit
                        ? txt('quy.danhMucKhoan.form.loaiHintEdit')
                        : txt('quy.danhMucKhoan.form.loaiHint')}
                    </p>
                  </div>
                )}
              />
            </div>

            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('quy.danhMucKhoan.form.ten')}
                required
                icon={Tag}
                {...register('ten')}
                error={errors.ten?.message}
              />
            </div>

            <Input
              label={txt('quy.danhMucKhoan.form.thuTu')}
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
                    label={txt('quy.danhMucKhoan.form.trangThai')}
                    value={field.value}
                    onChange={(v) => field.onChange(String(v))}
                    activeLabel="Hoạt động"
                    inactiveLabel="Ngừng"
                    error={errors.trang_thai?.message}
                  />
                  <p className="text-xs text-muted-foreground m-0">
                    {txt('quy.danhMucKhoan.form.trangThaiHint')}
                  </p>
                </div>
              )}
            />

            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('quy.danhMucKhoan.form.moTa')}
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

export default QuyDanhMucKhoanForm;
