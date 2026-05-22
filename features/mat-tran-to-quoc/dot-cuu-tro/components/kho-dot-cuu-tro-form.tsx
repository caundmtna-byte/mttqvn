import React, { useEffect } from 'react';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, HandHeart, Link2, Type } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { khoDotCuuTroSchema, type KhoDotCuuTroFormValues } from '../core/schema';
import type { KhoDotCuuTroDetail } from '../core/types';
import { useCreateKhoDotCuuTro, useUpdateKhoDotCuuTro } from '../hooks/use-kho-dot-cuu-tro';

const FORM_ID = 'kho-dot-cuu-tro-form';

const DEFAULT_VALUES: KhoDotCuuTroFormValues = {
  ten: '',
  mo_ta: '',
  link: '',
};

interface Props {
  initialData?: KhoDotCuuTroDetail | null;
  onClose: () => void;
}

const KhoDotCuuTroForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateKhoDotCuuTro(onClose);
  const updateMutation = useUpdateKhoDotCuuTro(onClose);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KhoDotCuuTroFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(khoDotCuuTroSchema) as Resolver<KhoDotCuuTroFormValues>,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ten: initialData.ten,
        mo_ta: initialData.mo_ta ?? '',
        link: initialData.link ?? '',
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<KhoDotCuuTroFormValues> = (data) => {
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
      icon={<HandHeart size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranDotCuuTro.form.editSubtitle')} · ${initialData.ten}`
          : txt('matTranDotCuuTro.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<HandHeart className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranDotCuuTro.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranDotCuuTro.form.ten')}
                required
                icon={Type}
                {...register('ten')}
                error={errors.ten?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranDotCuuTro.form.moTa')}
                rows={5}
                icon={FileText}
                {...register('mo_ta')}
                error={errors.mo_ta?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranDotCuuTro.form.link')}
                icon={Link2}
                placeholder="https://"
                {...register('link')}
                error={errors.link?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KhoDotCuuTroForm;
