import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Calendar, CalendarRange, FileText, Tag } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import { CHUONG_TRINH_NAM_TRANG_THAI } from '../core/constants';
import { chuongTrinhNamSchema, chuongTrinhNamRowToFormValues, type ChuongTrinhNamFormValues } from '../core/schema';
import type { ChuongTrinhNam } from '../core/types';
import { useCreateChuongTrinhNam, useUpdateChuongTrinhNam } from '../hooks/use-chuong-trinh-nam';

const DEFAULT_VALUES: ChuongTrinhNamFormValues = {
  ten_chuong_trinh: '',
  mo_ta: undefined,
  ghi_chu: undefined,
  ngay_bat_dau: '',
  ngay_ket_thuc: '',
  trang_thai: CHUONG_TRINH_NAM_TRANG_THAI[0],
  id_phong_ban: null,
};

interface Props {
  initialData?: ChuongTrinhNam | null;
  onClose: () => void;
}

const ChuongTrinhNamForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateChuongTrinhNam(onClose);
  const updateMutation = useUpdateChuongTrinhNam(onClose);

  const { data: departments = [] } = useDepartments();

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((d) => d.trang_thai === 'Đang hoạt động')
        .map((d) => ({ label: d.ten_phong_ban, value: d.id })),
    [departments],
  );

  const trangThaiOptions = useMemo(
    () => CHUONG_TRINH_NAM_TRANG_THAI.map((t) => ({ label: t, value: t })),
    [],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<ChuongTrinhNamFormValues>({
    resolver: zodResolver(chuongTrinhNamSchema) as Resolver<ChuongTrinhNamFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (initialData) {
      reset(chuongTrinhNamRowToFormValues(initialData));
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ChuongTrinhNamFormValues> = (data) => {
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
      icon={<CalendarRange size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('chuongTrinhNam.form.editSubtitle')} · ${initialData.ten_chuong_trinh}`
          : txt('chuongTrinhNam.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId="chuong-trinh-nam-form"
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<CalendarRange className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      {!isEdit && !idNguoiTao ? (
        <p className="text-sm text-destructive mb-4">{txt('chuongTrinhNam.service.noEmployeeProfile')}</p>
      ) : null}
      <form id="chuong-trinh-nam-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('chuongTrinhNam.form.sectionMain')} icon={<FileText size={14} />} variant="primary">
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('chuongTrinhNam.form.ten')}
                required
                icon={<CalendarRange size={12} />}
                {...register('ten_chuong_trinh')}
                error={errors.ten_chuong_trinh?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('chuongTrinhNam.form.moTa')}
                rows={4}
                icon={<FileText size={12} />}
                {...register('mo_ta')}
                error={errors.mo_ta?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('chuongTrinhNam.form.ghiChu')}
                rows={3}
                icon={<FileText size={12} />}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('chuongTrinhNam.form.sectionSchedule')} icon={<Calendar size={14} />} variant="muted">
          <FormGrid cols={2}>
            <Input
              label={txt('chuongTrinhNam.form.ngayBatDau')}
              type="date"
              required
              icon={<Calendar size={12} />}
              {...register('ngay_bat_dau')}
              error={errors.ngay_bat_dau?.message}
            />
            <Input
              label={txt('chuongTrinhNam.form.ngayKetThuc')}
              type="date"
              required
              icon={<Calendar size={12} />}
              {...register('ngay_ket_thuc')}
              error={errors.ngay_ket_thuc?.message}
            />
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('chuongTrinhNam.form.trangThai')}
                  icon={<Tag size={12} />}
                  required
                  clearable={false}
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.trang_thai?.message}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="id_phong_ban"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('chuongTrinhNam.form.phongBan')}
                  placeholder={txt('chuongTrinhNam.form.phongBanPlaceholder')}
                  icon={<Building2 size={12} />}
                  options={departmentOptions}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? null : String(v))}
                  error={errors.id_phong_ban?.message}
                  dropdownInPortal
                />
              )}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default ChuongTrinhNamForm;
