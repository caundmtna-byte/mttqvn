import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Megaphone,
  FileText,
  Calendar,
  Link2,
  Building2,
  Users,
  ListChecks,
  Percent,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { usePbxhThietLapAll } from '@/features/phan-bien-xa-hoi/thiet-lap-danh-muc/hooks/use-pbxh-thiet-lap';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import {
  thucHienPhanBienSchema,
  thucHienPhanBienToFormInput,
  type ThucHienPhanBienFormInput,
  type ThucHienPhanBienFormValues,
} from '../core/schema';
import { CAP_THUC_HIEN_VALUES, LOAI_HINH_VALUES, TINH_TRANG_VALUES } from '../core/constants';
import type { ThucHienPhanBien } from '../core/types';
import { useCreateThucHienPhanBien, useUpdateThucHienPhanBien } from '../hooks/use-thuc-hien-phan-bien';

const FORM_ID = 'pbxh-thuc-hien-form';

interface Props {
  initialData?: ThucHienPhanBien | null;
  onClose: () => void;
}

const ThucHienPhanBienForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const { data: thietLapAll = [] } = usePbxhThietLapAll();
  const { data: departments = [] } = useDepartments();
  const { data: xaPhuongAll = [] } = useXaPhuongForTab(true, '');

  const createMutation = useCreateThucHienPhanBien(onClose);
  const updateMutation = useUpdateThucHienPhanBien(onClose);

  const doiTuongOptions = useMemo(
    () =>
      thietLapAll
        .filter((r) => r.loai === 'doi_tuong')
        .map((r) => ({ label: r.ten, value: r.id })),
    [thietLapAll],
  );
  const donViChuTriOptions = useMemo(
    () =>
      thietLapAll
        .filter((r) => r.loai === 'don_vi_chu_tri')
        .map((r) => ({ label: r.ten, value: r.id })),
    [thietLapAll],
  );
  const hinhThucOptions = useMemo(
    () =>
      thietLapAll
        .filter((r) => r.loai === 'hinh_thuc')
        .map((r) => ({ label: r.ten, value: r.id })),
    [thietLapAll],
  );
  const phongBanOptions = useMemo(
    () => departments.map((d) => ({ label: d.ten_phong_ban, value: d.id })),
    [departments],
  );
  const xaPhuongOptions = useMemo(
    () => xaPhuongAll.map((x) => ({ label: x.ten, value: x.id })),
    [xaPhuongAll],
  );

  const capOptions = useMemo(() => CAP_THUC_HIEN_VALUES.map((v) => ({ label: v, value: v })), []);
  const loaiHinhOptions = useMemo(() => LOAI_HINH_VALUES.map((v) => ({ label: v, value: v })), []);
  const tinhTrangOptions = useMemo(() => TINH_TRANG_VALUES.map((v) => ({ label: v, value: v })), []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ThucHienPhanBienFormInput>({
    defaultValues: thucHienPhanBienToFormInput(null),
    resolver: zodResolver(thucHienPhanBienSchema) as Resolver<ThucHienPhanBienFormInput>,
  });

  useEffect(() => {
    reset(thucHienPhanBienToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ThucHienPhanBienFormInput> = (data) => {
    const parsed = thucHienPhanBienSchema.parse(data) as ThucHienPhanBienFormValues;
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data: parsed });
    } else {
      createMutation.mutate({ data: parsed, idNguoiTao: nhanVienId });
    }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Megaphone size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('pbxhThucHien.form.editSubtitle')} · ${initialData.noi_dung.slice(0, 40)}`
          : txt('pbxhThucHien.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Megaphone className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('pbxhThucHien.form.sectionMain')} icon={<FileText size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="cap_thuc_hien"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.capThucHienCol')}
                  icon={Building2}
                  options={capOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.cap_thuc_hien?.message}
                  required
                />
              )}
            />
            <Controller
              name="loai_hinh"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.loaiHinhCol')}
                  icon={ListChecks}
                  options={loaiHinhOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.loai_hinh?.message}
                  required
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('pbxhThucHien.store.noiDungCol')}
                icon={FileText}
                {...register('noi_dung')}
                error={errors.noi_dung?.message}
                rows={3}
                required
              />
            </div>
            <Controller
              name="doi_tuong_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.doiTuongCol')}
                  icon={Users}
                  options={doiTuongOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={txt('common.select')}
                />
              )}
            />
            <Controller
              name="hinh_thuc_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.hinhThucCol')}
                  icon={ListChecks}
                  options={hinhThucOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={txt('common.select')}
                />
              )}
            />
            <Controller
              name="tinh_trang"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.tinhTrangCol')}
                  icon={ListChecks}
                  options={tinhTrangOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.tinh_trang?.message}
                  required
                />
              )}
            />
            <Input
              label={txt('pbxhThucHien.store.phanTramCol')}
              type="number"
              min={0}
              max={100}
              icon={Percent}
              {...register('phan_tram_hoan_thanh', { valueAsNumber: true })}
              error={errors.phan_tram_hoan_thanh?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('pbxhThucHien.form.sectionThoiGian')} icon={<Calendar size={14} />}>
          <FormGrid cols={2}>
            <Input
              label={txt('pbxhThucHien.store.ngayBatDauCol')}
              type="date"
              icon={Calendar}
              {...register('ngay_bat_dau')}
            />
            <Input
              label={txt('pbxhThucHien.store.ngayKetThucCol')}
              type="date"
              icon={Calendar}
              {...register('ngay_ket_thuc')}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('pbxhThucHien.store.moTaThoiGianCol')}
                icon={Calendar}
                {...register('mo_ta_thoi_gian')}
                placeholder="Quý III/2026"
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('pbxhThucHien.form.sectionDonVi')} icon={<Building2 size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="don_vi_chu_tri_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.donViChuTriCol')}
                  icon={Building2}
                  options={donViChuTriOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={txt('common.select')}
                />
              )}
            />
            <Controller
              name="phong_ban_tham_muu_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.phongBanCol')}
                  icon={Users}
                  options={phongBanOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={txt('common.select')}
                />
              )}
            />
            <Controller
              name="don_vi_thuc_hien_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('pbxhThucHien.store.donViThucHienCol')}
                  icon={Building2}
                  options={xaPhuongOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={txt('common.select')}
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('pbxhThucHien.store.ketQuaCol')}
                icon={FileText}
                {...register('ket_qua_kien_nghi')}
                rows={2}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('pbxhThucHien.store.linkKetQuaCol')}
                icon={Link2}
                {...register('link_ket_qua')}
                error={errors.link_ket_qua?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default ThucHienPhanBienForm;
