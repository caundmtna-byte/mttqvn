import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, CalendarRange, FileText, Hash, ListChecks, Type, Users } from 'lucide-react';
import { toast } from 'sonner';
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
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import {
  dipThamHoiSchema,
  dipThamHoiToFormInput,
  type DipThamHoiFormInput,
  type DipThamHoiFormValues,
} from '../core/schema';
import { TRANG_THAI_VALUES, DON_VI_TINH_VALUE } from '../core/constants';
import type { DipThamHoi } from '../core/types';
import { useCreateDipThamHoi, useUpdateDipThamHoi } from '../hooks/use-dip-tham-hoi';

const FORM_ID = 'dttg-dip-tham-hoi-form';

interface Props {
  initialData?: DipThamHoi | null;
  onClose: () => void;
}

const DipThamHoiForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');
  const { data: departments = [] } = useDepartments();
  const createMutation = useCreateDipThamHoi(onClose);
  const updateMutation = useUpdateDipThamHoi(onClose);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const donViOptions = useMemo(() => {
    const tinhCap = {
      label: txt('danTocDipThamHoi.store.donViTinhCap'),
      value: DON_VI_TINH_VALUE,
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

  const phongBanOptions = useMemo(
    () =>
      departments.map((p) => ({
        label: p.ten_phong_ban,
        value: String(p.id),
      })),
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
  } = useForm<DipThamHoiFormInput, unknown, DipThamHoiFormValues>({
    resolver: zodResolver(dipThamHoiSchema) as Resolver<DipThamHoiFormInput, unknown, DipThamHoiFormValues>,
    defaultValues: dipThamHoiToFormInput(initialData ?? null),
  });

  useEffect(() => {
    reset(dipThamHoiToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const pending = createMutation.isPending || updateMutation.isPending || isSubmitting;

  const onSubmit: SubmitHandler<DipThamHoiFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else if (nhanVienId) {
      createMutation.mutate({ data, idNguoiTao: nhanVienId });
    } else {
      toast.error(txt('danTocDipThamHoi.service.noEmployeeProfile'));
    }
  };

  return (
    <GenericDrawer
      title={txt('page.danTocTonGiaoDashboard.dipThamHoi')}
      subtitle={isEdit ? txt('danTocDipThamHoi.form.editSubtitle') : txt('danTocDipThamHoi.form.createSubtitle')}
      icon={<CalendarRange size={18} />}
      onClose={onClose}
      maxWidthClass={DRAWER_WIDTH_FORM}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
        />
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <FormSection title={txt('danTocDipThamHoi.form.sectionMain')}>
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('danTocDipThamHoi.form.tenDip')}
                icon={<Type size={14} />}
                {...register('ten_dip')}
                error={errors.ten_dip?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('danTocDipThamHoi.form.moTa')}
                icon={<FileText size={14} />}
                {...register('mo_ta')}
                error={errors.mo_ta?.message}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Input
                label={txt('danTocDipThamHoi.form.thoiGianDuKien')}
                icon={<Calendar size={14} />}
                {...register('thoi_gian_du_kien')}
                error={errors.thoi_gian_du_kien?.message}
              />
              <p className="text-xs text-muted-foreground">{txt('danTocDipThamHoi.form.thoiGianDuKienHint')}</p>
            </div>
            <Input
              label={txt('danTocDipThamHoi.form.thoiGianThucTe')}
              icon={<Calendar size={14} />}
              type="date"
              {...register('thoi_gian_thuc_te')}
              error={errors.thoi_gian_thuc_te?.message}
            />
            <Controller
              name="don_vi_to_chuc_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('danTocDipThamHoi.form.donViToChuc')}
                  options={donViOptions}
                  value={field.value ?? DON_VI_TINH_VALUE}
                  onChange={(v) => field.onChange(v ?? DON_VI_TINH_VALUE)}
                  placeholder={txt('danTocDipThamHoi.form.donViToChucPlaceholder')}
                  error={errors.don_vi_to_chuc_id?.message}
                />
              )}
            />
            <Controller
              name="phong_ban_tham_muu_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('danTocDipThamHoi.form.phongBanThamMuu')}
                  icon={<Users size={14} />}
                  options={phongBanOptions}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v ?? '')}
                  placeholder={txt('danTocDipThamHoi.form.phongBanPlaceholder')}
                  error={errors.phong_ban_tham_muu_id?.message}
                />
              )}
            />
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('danTocDipThamHoi.form.trangThai')}
                  icon={<ListChecks size={14} />}
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.trang_thai?.message}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocDipThamHoi.form.sectionPlan')}>
          <FormGrid>
            <Input
              label={txt('danTocDipThamHoi.form.soLuongToChucDuKien')}
              icon={<Hash size={14} />}
              type="number"
              min={0}
              {...register('so_luong_to_chuc_du_kien')}
              error={errors.so_luong_to_chuc_du_kien?.message}
            />
            <Input
              label={txt('danTocDipThamHoi.form.soLuongCaNhanDuKien')}
              icon={<Hash size={14} />}
              type="number"
              min={0}
              {...register('so_luong_ca_nhan_du_kien')}
              error={errors.so_luong_ca_nhan_du_kien?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocDipThamHoi.form.sectionNote')}>
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('danTocDipThamHoi.form.ghiChu')}
                icon={<FileText size={14} />}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
                rows={3}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default DipThamHoiForm;
