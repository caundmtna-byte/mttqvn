import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Calendar,
  FileText,
  Gift,
  Link2,
  ListChecks,
  MapPin,
  Type,
  User,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import MonthYearPicker from '@/components/ui/MonthYearPicker';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import { useTinhThanhList, useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { useThongTinCaNhanTieuBieuList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu/hooks/use-thong-tin-ca-nhan-tieu-bieu';
import {
  thamHoiCaNhanSchema,
  thamHoiCaNhanToFormInput,
  type ThamHoiCaNhanFormInput,
  type ThamHoiCaNhanFormValues,
} from '../core/schema';
import {
  DON_VI_THAM_HOI_CQMTTQ_LABEL,
  DON_VI_THAM_HOI_CQMTTQ_VALUE,
  TRANG_THAI_VALUES,
} from '../core/constants';
import type { ThamHoiCaNhan } from '../core/types';
import { useCreateThamHoiCaNhan, useUpdateThamHoiCaNhan, useThamHoiCaNhanList } from '../hooks/use-tham-hoi-ca-nhan';
import { buildQuaTangOptions } from '../utils/qua-tang-suggestions';

const FORM_ID = 'dttg-tham-hoi-ca-nhan-form';

interface Props {
  initialData?: ThamHoiCaNhan | null;
  onClose: () => void;
}

const ThamHoiCaNhanForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const { data: caNhanList = [] } = useThongTinCaNhanTieuBieuList();
  const { data: departments = [] } = useDepartments();
  const { data: thamHoiList = [] } = useThamHoiCaNhanList();
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');
  const createMutation = useCreateThamHoiCaNhan(onClose);
  const updateMutation = useUpdateThamHoiCaNhan(onClose);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const xaOptions = useMemo(
    () =>
      [...xaList]
        .sort((a, b) => {
          const ta = tinhMap.get(a.id_tinh_thanh) ?? '';
          const tb = tinhMap.get(b.id_tinh_thanh) ?? '';
          if (ta !== tb) return ta.localeCompare(tb, 'vi');
          return a.ten.localeCompare(b.ten, 'vi');
        })
        .map((x) => ({
          label: x.ten,
          value: String(x.id),
          subLabel: tinhMap.get(x.id_tinh_thanh),
        })),
    [xaList, tinhMap],
  );

  const donViThamHoiOptions = useMemo(
    () => [
      { label: DON_VI_THAM_HOI_CQMTTQ_LABEL, value: DON_VI_THAM_HOI_CQMTTQ_VALUE },
      ...xaOptions,
    ],
    [xaOptions],
  );

  const caNhanOptions = useMemo(
    () =>
      [...caNhanList]
        .sort((a, b) => a.ho_va_ten.localeCompare(b.ho_va_ten, 'vi'))
        .map((c) => ({
          label: c.ho_va_ten,
          value: c.id,
          subLabel: [c.doi_tuong, c.chuc_vu_vi_tri].filter(Boolean).join(' · '),
        })),
    [caNhanList],
  );

  const phongBanOptions = useMemo(
    () =>
      [...departments]
        .sort((a, b) => a.ten_phong_ban.localeCompare(b.ten_phong_ban, 'vi'))
        .map((d) => ({ label: d.ten_phong_ban, value: d.id })),
    [departments],
  );

  const trangThaiOptions = useMemo(
    () => TRANG_THAI_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ThamHoiCaNhanFormInput>({
    defaultValues: thamHoiCaNhanToFormInput(null),
    resolver: zodResolver(thamHoiCaNhanSchema) as Resolver<ThamHoiCaNhanFormInput>,
  });

  const quaTangW = useWatch({ control, name: 'qua_tang' }) ?? '';

  const quaTangOptions = useMemo(
    () => buildQuaTangOptions(thamHoiList, quaTangW),
    [thamHoiList, quaTangW],
  );

  useEffect(() => {
    reset(thamHoiCaNhanToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ThamHoiCaNhanFormInput> = (data) => {
    const parsed = thamHoiCaNhanSchema.parse(data) as ThamHoiCaNhanFormValues;
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
      icon={<User size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('danTocThamHoiCaNhan.form.editSubtitle')} · ${initialData.ho_va_ten ?? initialData.dip_tham_hoi}`
          : txt('danTocThamHoiCaNhan.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<User className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('danTocThamHoiCaNhan.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="ca_nhan_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={caNhanOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                    label={txt('danTocThamHoiCaNhan.form.caNhan')}
                    placeholder={txt('danTocThamHoiCaNhan.form.caNhanPlaceholder')}
                    required
                    icon={<User size={14} />}
                    error={errors.ca_nhan_id?.message}
                    dropdownInPortal
                    clearable={false}
                  />
                )}
              />
            </div>
            <Controller
              name="phong_ban_tham_muu_id"
              control={control}
              render={({ field }) => (
                <div className={FORM_GRID_SPAN_FULL}>
                  <Combobox
                    options={phongBanOptions}
                    value={field.value === '' || field.value == null ? null : field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                    label={txt('danTocThamHoiCaNhan.form.phongBanThamMuu')}
                    placeholder={txt('danTocThamHoiCaNhan.form.phongBanPlaceholder')}
                    icon={<Users size={14} />}
                    error={errors.phong_ban_tham_muu_id?.message}
                    dropdownInPortal
                    clearable
                  />
                </div>
              )}
            />
            <Input
              label={txt('danTocThamHoiCaNhan.form.dipThamHoi')}
              required
              icon={Calendar}
              {...register('dip_tham_hoi')}
              error={errors.dip_tham_hoi?.message}
            />
            <Controller
              name="thoi_gian_du_kien"
              control={control}
              render={({ field }) => (
                <MonthYearPicker
                  label={txt('danTocThamHoiCaNhan.form.thoiGianDuKien')}
                  icon={<Calendar size={14} />}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.thoi_gian_du_kien?.message}
                />
              )}
            />
            <Controller
              name="don_vi_tham_hoi_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={donViThamHoiOptions}
                  value={field.value === '' || field.value == null ? DON_VI_THAM_HOI_CQMTTQ_VALUE : field.value}
                  onChange={(v) => {
                    const s = v === '' || v == null ? DON_VI_THAM_HOI_CQMTTQ_VALUE : String(v);
                    field.onChange(s);
                  }}
                  label={txt('danTocThamHoiCaNhan.form.donViThamHoi')}
                  placeholder={txt('danTocThamHoiCaNhan.form.donViThamHoiPlaceholder')}
                  icon={<Building2 size={14} />}
                  error={errors.don_vi_tham_hoi_id?.message}
                  dropdownInPortal
                  clearable={false}
                  searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                />
              )}
            />
            <Controller
              name="xa_phuong_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={xaOptions}
                  value={field.value === '' || field.value == null ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('danTocThamHoiCaNhan.form.donViXaPhuong')}
                  placeholder={txt('danTocThamHoiCaNhan.form.donViXaPhuong')}
                  icon={<MapPin size={14} />}
                  error={errors.xa_phuong_id?.message}
                  dropdownInPortal
                  clearable
                  searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                />
              )}
            />
            <Controller
              name="qua_tang"
              control={control}
              render={({ field }) => (
                <Combobox
                  creatable
                  creatableActionLabel={(s) =>
                    txt('danTocThamHoiCaNhan.form.quaTangCreatableAction', { gift: s })
                  }
                  dropdownInPortal
                  options={quaTangOptions}
                  value={field.value === '' ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('danTocThamHoiCaNhan.form.quaTang')}
                  searchPlaceholder={txt('danTocThamHoiCaNhan.form.quaTangSearchPlaceholder')}
                  icon={<Gift size={14} />}
                  error={errors.qua_tang?.message}
                  clearable
                />
              )}
            />
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  label={txt('danTocThamHoiCaNhan.form.trangThai')}
                  required
                  icon={<ListChecks size={14} />}
                  error={errors.trang_thai?.message}
                  dropdownInPortal
                  clearable={false}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocThamHoiCaNhan.form.sectionResult')} icon={<FileText size={14} />}>
          <FormGrid cols={1}>
            <Textarea
              label={txt('danTocThamHoiCaNhan.form.ketQuaGhiChu')}
              rows={3}
              icon={FileText}
              {...register('ket_qua_ghi_chu')}
              error={errors.ket_qua_ghi_chu?.message}
            />
            <Input
              label={txt('danTocThamHoiCaNhan.form.linkKetQua')}
              icon={Link2}
              {...register('link_ket_qua')}
              error={errors.link_ket_qua?.message}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default ThamHoiCaNhanForm;
