import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tags, Banknote, FileText } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Textarea from '@/components/ui/Textarea';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid from '@/components/shared/FormGrid';
import { theLoaiSchema, type TheLoaiFormValues } from '../core/schema';
import type { BaiVietTheLoai } from '../core/types';
import { useCreateTheLoai, useUpdateTheLoai } from '../hooks/use-the-loai';

interface Props {
  initialData?: BaiVietTheLoai | null;
  onClose: () => void;
}

const TheLoaiForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = !!initialData;
  const createMut = useCreateTheLoai(onClose);
  const updateMut = useUpdateTheLoai(onClose);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<TheLoaiFormValues>({
    resolver: zodResolver(theLoaiSchema) as Resolver<TheLoaiFormValues>,
    defaultValues: {
      ten_the_loai: '',
      mo_ta: '',
      don_gia: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ten_the_loai: initialData.ten_the_loai,
        mo_ta: initialData.mo_ta ?? '',
        don_gia: initialData.don_gia,
      });
    } else {
      reset({ ten_the_loai: '', mo_ta: '', don_gia: 0 });
    }
  }, [initialData, reset]);

  const onSubmit = (data: TheLoaiFormValues) => {
    const payload = {
      ...data,
      mo_ta: data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null,
    };
    if (isEdit && initialData) {
      updateMut.mutate({ id: initialData.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <GenericDrawer
      title={isEdit ? txt('page.articleSettings.editTheLoai') : txt('page.articleSettings.addTheLoai')}
      subtitle={
        isEdit && initialData
          ? `${txt('page.articleSettings.formTheLoaiEditSubtitle')} · ${initialData.ten_the_loai}`
          : txt('page.articleSettings.formTheLoaiCreateSubtitle')
      }
      icon={<Tags size={20} />}
      onClose={onClose}
      maxWidthClass={DRAWER_WIDTH_FORM}
      footer={
        <FormDrawerFooter
          formId="article-the-loai-form"
          onCancel={onClose}
          isLoading={busy}
          isEdit={isEdit}
          compact
          createIcon={<Tags className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id="article-the-loai-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormSection title={txt('page.articleSettings.detailBasic')} icon={<Tags size={14} />} variant="primary">
          <FormGrid cols={1}>
            <Input
              label={txt('page.articleSettings.formTenTheLoai')}
              icon={<Tags size={12} />}
              {...register('ten_the_loai')}
              error={errors.ten_the_loai?.message}
            />
            <Textarea
              label={txt('page.articleSettings.colMoTa')}
              icon={<FileText size={12} />}
              {...register('mo_ta')}
              rows={3}
            />
            <Controller
              name="don_gia"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label={txt('page.articleSettings.formDonGia')}
                  suffix=""
                  icon={<Banknote size={12} />}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.don_gia?.message}
                />
              )}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default TheLoaiForm;
