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
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { mttqThietLapSchema, type MttqThietLapFormValues } from '../core/schema';
import type { MttqThietLap, MttqThietLapLoai } from '../core/types';
import { MTTQ_LOAI_TAB_LABEL_KEY } from '../core/types';
import { useCreateMttqThietLap, useUpdateMttqThietLap } from '../hooks/use-mttq-thiet-lap';

interface Props {
  loai: MttqThietLapLoai;
  initialData?: MttqThietLap | null;
  onClose: () => void;
}

const MttqThietLapForm: React.FC<Props> = ({ loai, initialData, onClose }) => {
  const isEdit = !!initialData;
  const createMut = useCreateMttqThietLap(onClose);
  const updateMut = useUpdateMttqThietLap(onClose);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MttqThietLapFormValues>({
    resolver: zodResolver(mttqThietLapSchema) as Resolver<MttqThietLapFormValues>,
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

  const onSubmit = (data: MttqThietLapFormValues) => {
    const payload: MttqThietLapFormValues = {
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

  const tabLabel = txt(MTTQ_LOAI_TAB_LABEL_KEY[loai]);

  return (
    <GenericDrawer
      title={isEdit ? txt('page.matTranThietLap.editItem') : txt('page.matTranThietLap.addItem')}
      subtitle={
        isEdit && initialData
          ? `${txt('page.matTranThietLap.formEditSubtitle')} · ${initialData.ten}`
          : `${txt('page.matTranThietLap.formCreateSubtitle')} · ${tabLabel}`
      }
      icon={<Settings2 size={20} />}
      onClose={onClose}
      maxWidthClass={DRAWER_WIDTH_FORM}
      footer={
        <FormDrawerFooter
          formId="mttq-thiet-lap-form"
          onCancel={onClose}
          isLoading={busy}
          isEdit={isEdit}
          compact
          createIcon={<Settings2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id="mttq-thiet-lap-form" className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <input type="hidden" {...register('loai')} />
        <FormSection title={txt('page.articleSettings.detailBasic')} icon={<Settings2 size={14} />} variant="primary">
          <FormGrid cols={2}>
            <Input
              label={txt('page.articleSettings.formTen')}
              icon={<Settings2 size={12} />}
              {...register('ten')}
              error={errors.ten?.message}
              required
            />
            <Input
              label={txt('page.articleSettings.formThuTu')}
              type="number"
              min={0}
              icon={<ListOrdered size={12} />}
              {...register('thu_tu', { valueAsNumber: true })}
              error={errors.thu_tu?.message}
              required
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea label={txt('page.articleSettings.colMoTa')} icon={<FileText size={12} />} {...register('mo_ta')} rows={2} />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqThietLapForm;
