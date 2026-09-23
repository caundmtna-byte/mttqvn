import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Users,
  IdCard,
  MapPin,
  Home,
  ListChecks,
  Phone,
  Globe2,
  Church,
  Landmark,
  CreditCard,
  StickyNote,
} from 'lucide-react';
import { txt } from '@/lib/text';
import { toast } from 'sonner';
import Input from '@/components/ui/Input';
import PhoneInput from '@/components/ui/PhoneInput';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import {
  hoNgheoSchema,
  hoNgheoToFormInput,
  type HoNgheoFormInput,
  type HoNgheoFormValues,
} from '../core/schema';
import {
  HNGH_DOI_TUONG_VALUES,
  HNGH_TON_GIAO_VALUES,
  HNGH_TRANG_THAI_VALUES,
} from '../core/constants';
import type { HoNgheo } from '../core/types';
import { useCreateHoNgheo, useUpdateHoNgheo } from '../hooks/use-ho-ngheo';
import { isHoNgheoScopedToXaPhuong, useHoNgheoViewer } from '../hooks/use-ho-ngheo-viewer';
import { useDanTocOptions } from '../hooks/use-dan-toc-options';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';

const FORM_ID = 'ho-ngheo-form';

interface Props {
  initialData?: HoNgheo | null;
  onClose: () => void;
}

const HoNgheoForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateHoNgheo(onClose);
  const updateMutation = useUpdateHoNgheo(onClose);
  const viewer = useHoNgheoViewer();
  const scopedToXa = isHoNgheoScopedToXaPhuong(viewer);

  const xaPhuongOptions = useNddkXaPhuongOptions(scopedToXa ? viewer.viewerDonViId : null);
  const danTocOptions = useDanTocOptions();
  const doiTuongOptions = useMemo(
    () => HNGH_DOI_TUONG_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );
  const tonGiaoOptions = useMemo(
    () => HNGH_TON_GIAO_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );
  const trangThaiOptions = useMemo(
    () => HNGH_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HoNgheoFormInput, unknown, HoNgheoFormValues>({
    defaultValues: hoNgheoToFormInput(null),
    resolver: zodResolver(hoNgheoSchema) as Resolver<HoNgheoFormInput, unknown, HoNgheoFormValues>,
  });

  useEffect(() => {
    const base = hoNgheoToFormInput(initialData ?? null);
    if (initialData) {
      reset(base);
      return;
    }
    // Tạo mới: cán bộ cấp xã nhập hộ của chính xã mình — điền sẵn để khỏi phải
    // chọn lại, và combobox cũng chỉ còn đúng xã đó.
    if (scopedToXa && viewer.viewerDonViId) {
      reset({ ...base, xa_phuong_id: viewer.viewerDonViId });
      return;
    }
    reset(base);
  }, [initialData, reset, scopedToXa, viewer.viewerDonViId]);

  const onSubmit: SubmitHandler<HoNgheoFormValues> = (parsed) => {
    if (scopedToXa) {
      const xa = parsed.xa_phuong_id?.trim() ?? '';
      if (!viewer.viewerDonViId || xa !== viewer.viewerDonViId) {
        toast.error(txt('hoNgheo.noXaPhuongScopePermission'));
        return;
      }
    }
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
      isDirty={isDirty}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Users size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('hoNgheo.form.editSubtitle')} · ${initialData.ho_ten_dai_dien}`
          : txt('hoNgheo.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Users className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('hoNgheo.form.sectionHoDan')} icon={<Users size={14} />}>
          <FormGrid cols={2}>
            <Input
              label={txt('hoNgheo.store.hoTenCol')}
              icon={Users}
              {...register('ho_ten_dai_dien')}
              error={errors.ho_ten_dai_dien?.message}
              required
            />
            <div>
              <Input
                label={txt('hoNgheo.store.soCccdCol')}
                icon={IdCard}
                inputMode="numeric"
                placeholder={txt('hoNgheo.form.soCccdPlaceholder')}
                {...register('so_cccd')}
                error={errors.so_cccd?.message}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {txt('hoNgheo.form.soCccdHint')}
              </p>
            </div>
            <Controller
              name="xa_phuong_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={xaPhuongOptions}
                  value={field.value === '' ? null : (field.value ?? null)}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  label={txt('hoNgheo.store.xaPhuongCol')}
                  placeholder={txt('hoNgheo.form.xaPhuongPlaceholder')}
                  error={errors.xa_phuong_id?.message}
                  icon={<MapPin size={14} />}
                  dropdownInPortal
                  searchPlaceholder={txt('hoNgheo.store.xaPhuongCol')}
                />
              )}
            />
            <Input
              label={txt('hoNgheo.store.khoiXomCol')}
              icon={Home}
              {...register('khoi_xom')}
              error={errors.khoi_xom?.message}
            />
            <Controller
              name="doi_tuong"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={doiTuongOptions}
                  value={field.value === '' ? null : (field.value ?? null)}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  label={txt('hoNgheo.store.doiTuongCol')}
                  placeholder={txt('hoNgheo.form.doiTuongPlaceholder')}
                  error={errors.doi_tuong?.message}
                  icon={<ListChecks size={14} />}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="dan_toc_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={danTocOptions}
                  value={field.value === '' ? null : (field.value ?? null)}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  label={txt('hoNgheo.store.danTocCol')}
                  placeholder={txt('hoNgheo.form.danTocPlaceholder')}
                  error={errors.dan_toc_id?.message}
                  icon={<Globe2 size={14} />}
                  dropdownInPortal
                  searchPlaceholder={txt('hoNgheo.store.danTocCol')}
                />
              )}
            />
            <Controller
              name="ton_giao"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={tonGiaoOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v == null ? 'Không' : String(v))}
                  label={txt('hoNgheo.store.tonGiaoCol')}
                  placeholder={txt('hoNgheo.store.tonGiaoCol')}
                  error={errors.ton_giao?.message}
                  icon={<Church size={14} />}
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('hoNgheo.form.sectionLienHe')} icon={<Phone size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="dien_thoai"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  label={txt('hoNgheo.store.dienThoaiCol')}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.dien_thoai?.message}
                />
              )}
            />
            <Input
              label={txt('hoNgheo.store.soTaiKhoanCol')}
              icon={CreditCard}
              inputMode="numeric"
              {...register('so_tai_khoan')}
              error={errors.so_tai_khoan?.message}
            />
            <Input
              label={txt('hoNgheo.store.nganHangCol')}
              icon={Landmark}
              {...register('ngan_hang')}
              error={errors.ngan_hang?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('hoNgheo.form.sectionTrangThai')} icon={<ListChecks size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v == null ? 'Đang khó khăn' : String(v))}
                  label={txt('hoNgheo.store.trangThaiCol')}
                  placeholder={txt('hoNgheo.store.trangThaiCol')}
                  error={errors.trang_thai?.message}
                  icon={<ListChecks size={14} />}
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('hoNgheo.store.ghiChuCol')}
                rows={3}
                icon={StickyNote}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {txt('hoNgheo.form.ghiChuHint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default HoNgheoForm;
