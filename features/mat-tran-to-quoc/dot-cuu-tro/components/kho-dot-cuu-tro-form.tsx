import React, { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Activity,
  CalendarRange,
  CreditCard,
  FileText,
  HandHeart,
  Landmark,
  Link2,
  ListChecks,
  Tag,
  Type,
  Wallet,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import {
  DON_VI_GIOI_THIEU_TINH,
  donViGioiThieuToFormValue,
} from '../../don-vi-cuu-tro/utils/don-vi-gioi-thieu';
import { useDonViGioiThieuOptions } from '../../don-vi-cuu-tro/hooks/use-don-vi-gioi-thieu-options';
import { useDonViGioiThieuScope } from '../../don-vi-cuu-tro/hooks/use-don-vi-gioi-thieu-scope';
import {
  DOT_LOAI_DEFAULT,
  DOT_LOAI_VALUES,
  DOT_TRANG_THAI_DANG_TRIEN_KHAI,
  DOT_TRANG_THAI_VALUES,
} from '../core/constants';
import { khoDotCuuTroSchema, type KhoDotCuuTroFormValues } from '../core/schema';
import type { KhoDotCuuTroDetail } from '../core/types';
import { useCreateKhoDotCuuTro, useUpdateKhoDotCuuTro } from '../hooks/use-kho-dot-cuu-tro';

const FORM_ID = 'kho-dot-cuu-tro-form';

const DEFAULT_VALUES: KhoDotCuuTroFormValues = {
  ten: '',
  loai: DOT_LOAI_DEFAULT,
  don_vi_chu_tri: DON_VI_GIOI_THIEU_TINH,
  tu_ngay: '',
  den_ngay: '',
  tai_khoan_tiep_nhan: '',
  ngan_hang: '',
  trang_thai: DOT_TRANG_THAI_DANG_TRIEN_KHAI,
  tien_do: '',
  mo_ta: '',
  link: '',
};

const LOAI_OPTIONS = DOT_LOAI_VALUES.map((v) => ({ label: v, value: v }));
const TRANG_THAI_OPTIONS = DOT_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v }));

interface Props {
  initialData?: KhoDotCuuTroDetail | null;
  onClose: () => void;
}

const KhoDotCuuTroForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateKhoDotCuuTro(onClose);
  const updateMutation = useUpdateKhoDotCuuTro(onClose);
  // Cán bộ xã: đơn vị chủ trì khoá về xã mình (cùng luật ô Đơn vị giới thiệu của Nhà tài trợ).
  const scope = useDonViGioiThieuScope();
  const { options: tatCaDonVi } = useDonViGioiThieuOptions();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KhoDotCuuTroFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(khoDotCuuTroSchema) as Resolver<KhoDotCuuTroFormValues>,
  });

  const donViChuTri = useWatch({ control, name: 'don_vi_chu_tri' });
  const donViOptions = useMemo(
    () =>
      scope.khoa
        ? tatCaDonVi.filter((o) => o.value === scope.xaPhuongId || o.value === donViChuTri)
        : tatCaDonVi,
    [scope.khoa, scope.xaPhuongId, tatCaDonVi, donViChuTri],
  );

  useEffect(() => {
    if (initialData) {
      reset({
        ten: initialData.ten,
        loai: initialData.loai,
        don_vi_chu_tri: donViGioiThieuToFormValue(initialData.don_vi_chu_tri_loai, initialData.don_vi_chu_tri_id),
        tu_ngay: initialData.tu_ngay ?? '',
        den_ngay: initialData.den_ngay ?? '',
        tai_khoan_tiep_nhan: initialData.tai_khoan_tiep_nhan ?? '',
        ngan_hang: initialData.ngan_hang ?? '',
        trang_thai: initialData.trang_thai,
        tien_do: initialData.tien_do ?? '',
        mo_ta: initialData.mo_ta ?? '',
        link: initialData.link ?? '',
      });
    } else {
      reset(
        scope.khoa && scope.xaPhuongId
          ? { ...DEFAULT_VALUES, don_vi_chu_tri: scope.xaPhuongId }
          : DEFAULT_VALUES,
      );
    }
  }, [initialData, reset, scope.khoa, scope.xaPhuongId]);

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
            <Controller
              name="loai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranDotCuuTro.form.loai')}
                  icon={Tag}
                  options={LOAI_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  clearable={false}
                  required
                  error={errors.loai?.message}
                />
              )}
            />
            <Controller
              name="don_vi_chu_tri"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranDotCuuTro.form.donViChuTri')}
                  icon={<Landmark size={14} />}
                  options={donViOptions}
                  value={field.value === '' ? DON_VI_GIOI_THIEU_TINH : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? DON_VI_GIOI_THIEU_TINH : String(v))}
                  clearable={false}
                  required
                  disabled={scope.khoa}
                  dropdownInPortal
                  searchPlaceholder={txt('matTranDotCuuTro.form.donViChuTri')}
                  error={errors.don_vi_chu_tri?.message}
                />
              )}
            />
            <Input
              type="date"
              label={txt('matTranDotCuuTro.form.tuNgay')}
              icon={CalendarRange}
              {...register('tu_ngay')}
              error={errors.tu_ngay?.message}
            />
            <Input
              type="date"
              label={txt('matTranDotCuuTro.form.denNgay')}
              icon={CalendarRange}
              {...register('den_ngay')}
              error={errors.den_ngay?.message}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranDotCuuTro.form.moTa')}
                rows={3}
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

        <FormSection title={txt('matTranDotCuuTro.form.sectionTiepNhan')} icon={<Wallet size={14} />}>
          <FormGrid cols={2}>
            <Input
              label={txt('matTranDotCuuTro.form.taiKhoan')}
              icon={CreditCard}
              inputMode="numeric"
              {...register('tai_khoan_tiep_nhan')}
              error={errors.tai_khoan_tiep_nhan?.message}
            />
            <Input
              label={txt('matTranDotCuuTro.form.nganHang')}
              icon={Landmark}
              {...register('ngan_hang')}
              error={errors.ngan_hang?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranDotCuuTro.form.sectionTienDo')} icon={<Activity size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranDotCuuTro.form.trangThai')}
                  icon={Activity}
                  options={TRANG_THAI_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  clearable={false}
                  required
                  error={errors.trang_thai?.message}
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranDotCuuTro.form.tienDo')}
                rows={2}
                icon={ListChecks}
                placeholder={txt('matTranDotCuuTro.form.tienDoPlaceholder')}
                {...register('tien_do')}
                error={errors.tien_do?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KhoDotCuuTroForm;
