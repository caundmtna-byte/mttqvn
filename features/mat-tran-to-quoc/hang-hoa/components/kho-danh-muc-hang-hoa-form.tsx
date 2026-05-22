import React, { useEffect } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FolderOpen, FileText, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import StatusToggle from '@/components/ui/StatusToggle';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import { khoDanhMucHangHoaSchema, type KhoDanhMucHangHoaFormValues } from '../core/schema';
import type { KhoDanhMucHangHoaListRow } from '../core/types';
import { useCreateKhoDanhMucHangHoa, useUpdateKhoDanhMucHangHoa } from '../hooks/use-kho-danh-muc-hang-hoa';
import { nextThuTuDanhMuc } from '../utils/next-thu-tu';

const FORM_ID = 'kho-danh-muc-hang-hoa-form';

const DEFAULT_VALUES: KhoDanhMucHangHoaFormValues = {
  ten_danh_muc: '',
  mo_ta: '',
  thu_tu: 0,
  trang_thai: 'Đang hoạt động',
};

interface Props {
  initialData?: KhoDanhMucHangHoaListRow | null;
  /** Toàn bộ danh mục (cùng cấp) — dùng gợi ý `thu_tu` khi thêm mới */
  allDanhMucRows?: readonly KhoDanhMucHangHoaListRow[];
  onClose: () => void;
}

const KhoDanhMucHangHoaForm: React.FC<Props> = ({ initialData, allDanhMucRows = [], onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateKhoDanhMucHangHoa(onClose);
  const updateMutation = useUpdateKhoDanhMucHangHoa(onClose);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<KhoDanhMucHangHoaFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(khoDanhMucHangHoaSchema) as Resolver<KhoDanhMucHangHoaFormValues>,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ten_danh_muc: initialData.ten_danh_muc,
        mo_ta: initialData.mo_ta ?? '',
        thu_tu: initialData.thu_tu,
        trang_thai: initialData.trang_thai === 'Ngừng hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động',
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (initialData) return;
    setValue('thu_tu', nextThuTuDanhMuc(allDanhMucRows));
  }, [initialData, allDanhMucRows, setValue]);

  const onSubmit: SubmitHandler<KhoDanhMucHangHoaFormValues> = (data) => {
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
      icon={<FolderOpen size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranHangHoa.formDanhMuc.editSubtitle')} · ${initialData.ten_danh_muc}`
          : txt('matTranHangHoa.formDanhMuc.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<FolderOpen className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranHangHoa.formDanhMuc.section')} icon={<FolderOpen size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranHangHoa.store.tenDanhMuc')}
                required
                {...register('ten_danh_muc')}
                error={errors.ten_danh_muc?.message}
                icon={<FolderOpen size={12} />}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranHangHoa.store.moTa')}
                rows={3}
                className="resize-y min-h-[80px]"
                {...register('mo_ta')}
                error={errors.mo_ta?.message}
                icon={<FileText size={12} />}
              />
            </div>
            <div className="space-y-1">
              <Input
                label={txt('matTranHangHoa.store.thuTu')}
                type="number"
                min={0}
                {...register('thu_tu', { valueAsNumber: true })}
                error={errors.thu_tu?.message}
                icon={<ListOrdered size={12} />}
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground leading-snug">{txt('matTranHangHoa.formDanhMuc.thuTuAutoHint')}</p>
              )}
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="trang_thai"
                control={control}
                render={({ field }) => (
                  <StatusToggle
                    label={txt('matTranHangHoa.store.trangThai')}
                    value={field.value}
                    onChange={field.onChange}
                    icon={<ListOrdered size={12} />}
                    activeLabel={TRANG_THAI_HOAT_DONG[1]}
                    inactiveLabel={TRANG_THAI_HOAT_DONG[0]}
                    required
                  />
                )}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KhoDanhMucHangHoaForm;
