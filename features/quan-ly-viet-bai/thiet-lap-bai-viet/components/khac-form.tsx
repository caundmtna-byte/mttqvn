import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings2, FileText, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid from '@/components/shared/FormGrid';
import { thietLapKhacSchema, type ThietLapKhacFormValues } from '../core/schema';
import type { BaiVietThietLapKhac, BaiVietThietLapKhacLoai } from '../core/types';
import { useCreateThietLapKhac, useUpdateThietLapKhac } from '../hooks/use-thiet-lap-khac';

interface Props {
  loai: BaiVietThietLapKhacLoai;
  initialData?: BaiVietThietLapKhac | null;
  onClose: () => void;
}

const KhacForm: React.FC<Props> = ({ loai, initialData, onClose }) => {
  const isEdit = !!initialData;
  const createMut = useCreateThietLapKhac(onClose);
  const updateMut = useUpdateThietLapKhac(onClose);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ThietLapKhacFormValues>({
    resolver: zodResolver(thietLapKhacSchema) as Resolver<ThietLapKhacFormValues>,
    defaultValues: {
      loai,
      ten: '',
      mo_ta: '',
      thu_tu: 0,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        loai: initialData.loai,
        ten: initialData.ten,
        mo_ta: initialData.mo_ta ?? '',
        thu_tu: initialData.thu_tu,
      });
    } else {
      reset({ loai, ten: '', mo_ta: '', thu_tu: 0 });
    }
  }, [initialData, loai, reset]);

  const onSubmit = (data: ThietLapKhacFormValues) => {
    const payload: ThietLapKhacFormValues = {
      ...data,
      loai,
      mo_ta: data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null,
    };
    if (isEdit && initialData) {
      updateMut.mutate({ id: initialData.id, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  const sectionName =
    loai === 'trang_dang' ? txt('page.articleSettings.sectionTrangDang') : txt('page.articleSettings.sectionNguonDang');

  return (
    <GenericDrawer
      title={isEdit ? txt('page.articleSettings.editKhac') : txt('page.articleSettings.addKhac')}
      subtitle={
        isEdit && initialData
          ? `${txt('page.articleSettings.formKhacEditSubtitle')} · ${initialData.ten}`
          : `${txt('page.articleSettings.formKhacCreateSubtitle')} · ${sectionName}`
      }
      icon={<Settings2 size={20} />}
      onClose={onClose}
      maxWidthClass={DRAWER_WIDTH_FORM}
      footer={
        <FormDrawerFooter
          formId="article-khac-form"
          onCancel={onClose}
          isLoading={busy}
          isEdit={isEdit}
          compact
          createIcon={<Settings2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id="article-khac-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('loai')} />
        <FormSection title={txt('page.articleSettings.detailBasic')} icon={<Settings2 size={14} />} variant="primary">
          <FormGrid cols={1}>
            <Input
              label={txt('page.articleSettings.formTen')}
              icon={<Settings2 size={12} />}
              {...register('ten')}
              error={errors.ten?.message}
            />
            <Textarea label={txt('page.articleSettings.colMoTa')} icon={<FileText size={12} />} {...register('mo_ta')} rows={2} />
            <Input
              label={txt('page.articleSettings.formThuTu')}
              type="number"
              min={0}
              icon={<ListOrdered size={12} />}
              {...register('thu_tu', { valueAsNumber: true })}
              error={errors.thu_tu?.message}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KhacForm;
