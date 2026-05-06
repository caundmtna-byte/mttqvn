import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Banknote, Calendar, Link2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useTheLoais } from '../../thiet-lap-bai-viet/hooks/use-the-loai';
import { useThietLapKhacAll } from '../../thiet-lap-bai-viet/hooks/use-thiet-lap-khac';
import { baiVietDanhSachSchema, type BaiVietDanhSachFormValues } from '../core/schema';
import type { BaiVietDanhSach } from '../core/types';
import { useCreateBaiVietDanhSach, useUpdateBaiVietDanhSach } from '../hooks/use-bai-viet-danh-sach';

const DEFAULT_VALUES: BaiVietDanhSachFormValues = {
  ten_bai: '',
  id_the_loai: '',
  don_gia: 0,
  ngay_dang: '',
  id_nguon_dang: '',
  id_trang_dang: '',
  link: '',
};

interface Props {
  initialData?: BaiVietDanhSach | null;
  onClose: () => void;
}

const BaiVietForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateBaiVietDanhSach(onClose);
  const updateMutation = useUpdateBaiVietDanhSach(onClose);

  const { data: theLoais = [] } = useTheLoais();
  const { data: khacRows = [] } = useThietLapKhacAll();

  const trangDangOptions = useMemo(
    () =>
      khacRows
        .filter((r) => r.loai === 'trang_dang')
        .map((r) => ({ label: r.ten, value: String(r.id) })),
    [khacRows],
  );

  const nguonDangOptions = useMemo(
    () =>
      khacRows
        .filter((r) => r.loai === 'nguon_dang')
        .map((r) => ({ label: r.ten, value: String(r.id) })),
    [khacRows],
  );

  const theLoaiOptions = useMemo(
    () => theLoais.map((t) => ({ label: t.ten_the_loai, value: String(t.id) })),
    [theLoais],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<BaiVietDanhSachFormValues>({
    resolver: zodResolver(baiVietDanhSachSchema) as Resolver<BaiVietDanhSachFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const watchedTheLoai = watch('id_the_loai');

  useEffect(() => {
    if (initialData) {
      reset({
        ten_bai: initialData.ten_bai,
        id_the_loai: initialData.id_the_loai,
        don_gia: initialData.don_gia,
        ngay_dang: initialData.ngay_dang.slice(0, 10),
        id_nguon_dang: initialData.id_nguon_dang,
        id_trang_dang: initialData.id_trang_dang,
        link: initialData.link,
      });
    } else {
      reset({
        ...DEFAULT_VALUES,
        ngay_dang: new Date().toISOString().slice(0, 10),
      });
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (isEdit) return;
    if (!watchedTheLoai) return;
    const tl = theLoais.find((t) => String(t.id) === watchedTheLoai);
    if (!tl) return;
    setValue('don_gia', typeof tl.don_gia === 'number' ? tl.don_gia : Number(tl.don_gia) || 0);
  }, [watchedTheLoai, theLoais, isEdit, setValue]);

  const onSubmit: SubmitHandler<BaiVietDanhSachFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate({ data, idNguoiTao });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<FileText size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('articleList.form.editSubtitle')} · ${initialData.ten_bai}`
          : txt('articleList.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId="bai-viet-danh-sach-form"
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<FileText className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      {!isEdit && !idNguoiTao ? (
        <p className="text-sm text-destructive mb-4">{txt('articleList.service.noEmployeeProfile')}</p>
      ) : null}
      <form id="bai-viet-danh-sach-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('articleList.detail.sectionInfo')} icon={<FileText size={14} />} variant="primary">
          <FormGrid cols={1}>
            <Input
              label={txt('articleList.form.tenBai')}
              required
              icon={<FileText size={12} />}
              {...register('ten_bai')}
              error={errors.ten_bai?.message}
            />
            <Controller
              name="id_the_loai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('articleList.form.theLoai')}
                  required
                  clearable={false}
                  options={theLoaiOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.id_the_loai?.message}
                />
              )}
            />
            <Controller
              name="don_gia"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label={txt('articleList.form.donGia')}
                  required
                  suffix=""
                  icon={<Banknote size={12} />}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.don_gia?.message}
                />
              )}
            />
            <Input
              label={txt('articleList.form.ngayDang')}
              type="date"
              required
              icon={<Calendar size={12} />}
              {...register('ngay_dang')}
              error={errors.ngay_dang?.message}
            />
            <Controller
              name="id_trang_dang"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('articleList.form.trangDang')}
                  required
                  clearable={false}
                  options={trangDangOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.id_trang_dang?.message}
                />
              )}
            />
            <Controller
              name="id_nguon_dang"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('articleList.form.nguonDang')}
                  required
                  clearable={false}
                  options={nguonDangOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.id_nguon_dang?.message}
                />
              )}
            />
            <Input
              label={txt('articleList.form.link')}
              required
              icon={<Link2 size={12} />}
              placeholder="https://"
              {...register('link')}
              error={errors.link?.message}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default BaiVietForm;
