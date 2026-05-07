import React, { useEffect } from 'react';
import { useForm, type SubmitHandler, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, ArrowUpFromLine } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid from '@/components/shared/FormGrid';
import { tinhThanhSchema, type TinhThanhFormValues } from '../core/schema';
import type { TinhThanh } from '../core/types';
import { useCreateTinhThanh, useTinhThanhList, useUpdateTinhThanh } from '../hooks/use-dia-ban';

const DEFAULT_VALUES: TinhThanhFormValues = {
  ten: '',
  thu_tu: 0,
};

interface Props {
  initialData?: TinhThanh | null;
  onClose: () => void;
}

const TinhThanhForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = !!initialData;
  const createMutation = useCreateTinhThanh(onClose);
  const updateMutation = useUpdateTinhThanh(onClose);
  const { data: list = [] } = useTinhThanhList();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TinhThanhFormValues>({
    resolver: zodResolver(tinhThanhSchema) as Resolver<TinhThanhFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ten: initialData.ten,
        thu_tu: initialData.thu_tu ?? 0,
      });
    } else {
      const next =
        list.length > 0 ? Math.max(...list.map((t) => t.thu_tu ?? 0)) + 1 : 1;
      reset({ ...DEFAULT_VALUES, thu_tu: next });
    }
  }, [initialData, list, reset]);

  const title = isEdit ? txt('diaBan.form.tinhEditTitle') : txt('diaBan.form.tinhCreateTitle');

  const onSubmit: SubmitHandler<TinhThanhFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      title={title}
      subtitle={isEdit ? `#${initialData?.id}` : undefined}
      icon={<MapPin size={18} />}
      onClose={onClose}
      footer={
        <FormDrawerFooter
          formId="dia-ban-tinh-form"
          onCancel={onClose}
          isLoading={isLoading}
          isEdit={isEdit}
          compact
          createIcon={<MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
      maxWidthClass={DRAWER_WIDTH_FORM}
    >
      <form id="dia-ban-tinh-form" className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <FormSection title={txt('diaBan.detail.basicInfo')} icon={<MapPin size={14} />}>
          <FormGrid>
            <Input
              label={txt('diaBan.form.ten')}
              placeholder={txt('diaBan.form.tenPlaceholderTinh')}
              error={errors.ten?.message}
              required
              {...register('ten')}
            />
            <Input
              type="number"
              label={txt('diaBan.form.thuTu')}
              error={errors.thu_tu?.message}
              icon={<ArrowUpFromLine size={14} />}
              required
              {...register('thu_tu', { valueAsNumber: true })}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default TinhThanhForm;
