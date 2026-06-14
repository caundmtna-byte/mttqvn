import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  Calendar,
  FileText,
  Gift,
  Link2,
  ListChecks,
  Star,
  Type,
  Users,
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
import { useTinhThanhList, useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { useThongTinToChucQuanTrongList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong/hooks/use-thong-tin-to-chuc-quan-trong';
import { useDipThamHoiOptions } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/hooks/use-dip-tham-hoi';
import { useDipChildFormPrefill } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/hooks/use-dip-child-form-prefill';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import {
  thamHoiToChucSchema,
  thamHoiToChucToFormInput,
  type ThamHoiToChucFormInput,
  type ThamHoiToChucFormValues,
} from '../core/schema';
import { TIEN_DO_VALUES, DON_VI_THAM_HOI_TINH_VALUE } from '../core/constants';
import type { ThamHoiToChuc } from '../core/types';
import { useCreateThamHoiToChuc, useUpdateThamHoiToChuc } from '../hooks/use-tham-hoi-to-chuc';
import { useDttgViewer } from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';

const FORM_ID = 'dttg-tham-hoi-to-chuc-form';

interface Props {
  initialData?: ThamHoiToChuc | null;
  defaultDipId?: string;
  onClose: () => void;
}

const ThamHoiToChucForm: React.FC<Props> = ({ initialData, defaultDipId, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const { data: orgList = [] } = useThongTinToChucQuanTrongList();
  const { data: dipOptions = [] } = useDipThamHoiOptions();
  const { data: departments = [] } = useDepartments();
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');
  const createMutation = useCreateThamHoiToChuc(onClose);
  const updateMutation = useUpdateThamHoiToChuc(onClose);
  const viewer = useDttgViewer('danTocThamHoiToChuc');
  const defaultDonViFromViewer =
    viewer.chucVuCapQuanLy === 'Xã phường' && Boolean(viewer.viewerDonViId);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const donViThamHoiOptions = useMemo(() => {
    const tinhCap = {
      label: txt('danTocThamHoiToChuc.store.donViThamHoiTinhCap'),
      value: DON_VI_THAM_HOI_TINH_VALUE,
    };
    const rest = [...xaList]
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
      }));
    return [tinhCap, ...rest];
  }, [xaList, tinhMap]);

  const dipThamHoiOptions = useMemo(
    () =>
      [...dipOptions]
        .sort((a, b) => a.ten_dip.localeCompare(b.ten_dip, 'vi'))
        .map((d) => ({ label: d.ten_dip, value: d.id })),
    [dipOptions],
  );

  const phongBanOptions = useMemo(
    () =>
      [...departments]
        .sort((a, b) => a.ten_phong_ban.localeCompare(b.ten_phong_ban, 'vi'))
        .map((d) => ({ label: d.ten_phong_ban, value: d.id })),
    [departments],
  );

  const toChucOptions = useMemo(
    () =>
      [...orgList]
        .sort((a, b) => a.ten_co_so.localeCompare(b.ten_co_so, 'vi'))
        .map((o) => ({
          label: o.ten_co_so,
          value: o.id,
          subLabel: o.loai_hinh,
        })),
    [orgList],
  );

  const tienDoOptions = useMemo(
    () => TIEN_DO_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ThamHoiToChucFormInput>({
    defaultValues: thamHoiToChucToFormInput(null),
    resolver: zodResolver(thamHoiToChucSchema) as Resolver<ThamHoiToChucFormInput>,
  });

  useEffect(() => {
    const base = thamHoiToChucToFormInput(initialData ?? null);
    if (!initialData && defaultDipId?.trim()) {
      base.dip_tham_hoi_id = defaultDipId.trim();
    }
    if (!initialData && defaultDonViFromViewer && viewer.viewerDonViId) {
      base.don_vi_tham_hoi_id = viewer.viewerDonViId;
    }
    reset(base);
  }, [initialData, defaultDipId, reset, defaultDonViFromViewer, viewer.viewerDonViId]);

  useDipChildFormPrefill({
    isEdit,
    dipOptions,
    control,
    setValue,
    getValues,
    prefillThoiGianDuKien: true,
  });

  const onSubmit: SubmitHandler<ThamHoiToChucFormInput> = (data) => {
    const parsed = thamHoiToChucSchema.parse(data) as ThamHoiToChucFormValues;
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
      icon={<Building2 size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('danTocThamHoiToChuc.form.editSubtitle')} · ${initialData.dip_tham_hoi}`
          : txt('danTocThamHoiToChuc.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Building2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('danTocThamHoiToChuc.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="to_chuc_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={toChucOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                    label={txt('danTocThamHoiToChuc.form.toChuc')}
                    placeholder={txt('danTocThamHoiToChuc.form.toChucPlaceholder')}
                    required
                    icon={<Star size={14} />}
                    error={errors.to_chuc_id?.message}
                    dropdownInPortal
                    clearable={false}
                  />
                )}
              />
            </div>
            <Controller
              name="dip_tham_hoi_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={dipThamHoiOptions}
                  value={field.value === '' ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('danTocThamHoiToChuc.form.dipThamHoi')}
                  placeholder={txt('danTocThamHoiToChuc.form.dipThamHoiPlaceholder')}
                  required
                  icon={<Calendar size={14} />}
                  error={errors.dip_tham_hoi_id?.message}
                  dropdownInPortal
                  clearable={false}
                />
              )}
            />
            <div className="space-y-1.5">
              <Input
                label={txt('danTocThamHoiToChuc.form.thoiGianDuKien')}
                icon={Calendar}
                {...register('thoi_gian_du_kien')}
                error={errors.thoi_gian_du_kien?.message}
              />
              <p className="text-xs text-muted-foreground">{txt('danTocThamHoiToChuc.form.thoiGianDuKienHint')}</p>
            </div>
            <Input
              label={txt('danTocThamHoiToChuc.form.thoiGianThucTe')}
              icon={Calendar}
              type="date"
              {...register('thoi_gian_thuc_te')}
              error={errors.thoi_gian_thuc_te?.message}
            />
            <Controller
              name="phong_ban_tham_muu_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={phongBanOptions}
                  value={field.value === '' ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('danTocThamHoiToChuc.form.phongBanThamMuu')}
                  placeholder={txt('danTocThamHoiToChuc.form.phongBanPlaceholder')}
                  icon={<Users size={14} />}
                  error={errors.phong_ban_tham_muu_id?.message}
                  dropdownInPortal
                  clearable
                />
              )}
            />
            <Controller
              name="don_vi_tham_hoi_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={donViThamHoiOptions}
                  value={
                    field.value === '' || field.value === undefined
                      ? DON_VI_THAM_HOI_TINH_VALUE
                      : field.value
                  }
                  onChange={(v) => {
                    if (v === '' || v == null || v === DON_VI_THAM_HOI_TINH_VALUE) {
                      field.onChange(DON_VI_THAM_HOI_TINH_VALUE);
                    } else {
                      field.onChange(String(v));
                    }
                  }}
                  label={txt('danTocThamHoiToChuc.form.donViThamHoi')}
                  placeholder={txt('danTocThamHoiToChuc.form.donViThamHoiPlaceholder')}
                  icon={<Building2 size={14} />}
                  error={errors.don_vi_tham_hoi_id?.message}
                  dropdownInPortal
                  clearable={false}
                  searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                />
              )}
            />
            <Controller
              name="tien_do"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={tienDoOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  label={txt('danTocThamHoiToChuc.form.tienDo')}
                  required
                  icon={<ListChecks size={14} />}
                  error={errors.tien_do?.message}
                  dropdownInPortal
                  clearable={false}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocThamHoiToChuc.form.sectionContent')} icon={<FileText size={14} />}>
          <FormGrid cols={1}>
            <Textarea
              label={txt('danTocThamHoiToChuc.form.noiDungThamHoi')}
              rows={3}
              icon={FileText}
              {...register('noi_dung_tham_hoi')}
              error={errors.noi_dung_tham_hoi?.message}
            />
            <Textarea
              label={txt('danTocThamHoiToChuc.form.thanhPhanDoan')}
              rows={2}
              icon={Users}
              {...register('thanh_phan_doan')}
              error={errors.thanh_phan_doan?.message}
            />
            <Input
              label={txt('danTocThamHoiToChuc.form.quaTang')}
              icon={Gift}
              {...register('qua_tang')}
              error={errors.qua_tang?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocThamHoiToChuc.form.sectionResult')} icon={<ListChecks size={14} />}>
          <FormGrid cols={1}>
            <Textarea
              label={txt('danTocThamHoiToChuc.form.ketQuaThucHien')}
              rows={3}
              icon={FileText}
              {...register('ket_qua_thuc_hien')}
              error={errors.ket_qua_thuc_hien?.message}
            />
            <Input
              label={txt('danTocThamHoiToChuc.form.linkKetQua')}
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

export default ThamHoiToChucForm;
