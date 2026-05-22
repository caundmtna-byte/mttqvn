import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, FileText, Mail, MapPin, Phone, Type, User } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { khoDonViCuuTroSchema, type KhoDonViCuuTroFormValues } from '../core/schema';
import type { KhoDonViCuuTroListRow } from '../core/types';
import { useCreateKhoDonViCuuTro, useUpdateKhoDonViCuuTro } from '../hooks/use-kho-don-vi-cuu-tro';

const FORM_ID = 'kho-don-vi-cuu-tro-form';

const DEFAULT_VALUES: KhoDonViCuuTroFormValues = {
  loai: 'to_chuc',
  ten: '',
  dia_chi: '',
  dien_thoai: '',
  email: '',
  ghi_chu: '',
};

interface Props {
  initialData?: KhoDonViCuuTroListRow | null;
  onClose: () => void;
}

const KhoDonViCuuTroForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateKhoDonViCuuTro(onClose);
  const updateMutation = useUpdateKhoDonViCuuTro(onClose);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<KhoDonViCuuTroFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(khoDonViCuuTroSchema) as Resolver<KhoDonViCuuTroFormValues>,
  });

  const loai = watch('loai');

  const loaiOptions = useMemo(
    () => [
      { label: txt('matTranDonViCuuTro.loai.toChuc'), value: 'to_chuc' },
      { label: txt('matTranDonViCuuTro.loai.caNhan'), value: 'ca_nhan' },
    ],
    [],
  );

  useEffect(() => {
    if (initialData) {
      reset({
        loai: initialData.loai,
        ten: initialData.ten,
        dia_chi: initialData.dia_chi ?? '',
        dien_thoai: initialData.dien_thoai ?? '',
        email: initialData.email ?? '',
        ghi_chu: initialData.ghi_chu ?? '',
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<KhoDonViCuuTroFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={loai === 'ca_nhan' ? <User size={18} /> : <Building2 size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranDonViCuuTro.form.editSubtitle')} · ${initialData.ten}`
          : txt('matTranDonViCuuTro.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranDonViCuuTro.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className="space-y-1.5">
              <Controller
                name="loai"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={loaiOptions}
                    value={field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? 'to_chuc' : String(v))}
                    label={txt('matTranDonViCuuTro.form.loai')}
                    placeholder={txt('matTranDonViCuuTro.form.loai')}
                    error={errors.loai?.message}
                    icon={<Building2 size={14} />}
                    dropdownInPortal
                    searchPlaceholder={txt('matTranDonViCuuTro.form.loai')}
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranDonViCuuTro.form.ten')}
                required
                icon={<Type size={12} />}
                {...register('ten')}
                error={errors.ten?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranDonViCuuTro.form.diaChi')}
                icon={<MapPin size={12} />}
                {...register('dia_chi')}
                error={errors.dia_chi?.message}
              />
            </div>
            <div>
              <Input
                label={txt('matTranDonViCuuTro.form.dienThoai')}
                icon={<Phone size={12} />}
                {...register('dien_thoai')}
                error={errors.dien_thoai?.message}
              />
            </div>
            <div>
              <Input
                label={txt('matTranDonViCuuTro.form.email')}
                icon={<Mail size={12} />}
                {...register('email')}
                error={errors.email?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranDonViCuuTro.form.ghiChu')}
                rows={3}
                icon={FileText}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KhoDonViCuuTroForm;
