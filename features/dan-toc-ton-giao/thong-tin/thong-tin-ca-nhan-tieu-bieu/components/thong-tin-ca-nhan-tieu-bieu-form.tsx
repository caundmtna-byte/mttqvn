import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  FileText,
  MapPin,
  Phone,
  Power,
  Star,
  Type,
  User,
  UserRound,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import StatusToggle from '@/components/ui/StatusToggle';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useTinhThanhList, useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import {
  thongTinCaNhanTieuBieuSchema,
  thongTinCaNhanTieuBieuToFormInput,
  type ThongTinCaNhanTieuBieuFormInput,
  type ThongTinCaNhanTieuBieuFormValues,
} from '../core/schema';
import { DOI_TUONG_VALUES } from '../core/constants';
import type { ThongTinCaNhanTieuBieu } from '../core/types';
import { useCreateThongTinCaNhanTieuBieu, useUpdateThongTinCaNhanTieuBieu } from '../hooks/use-thong-tin-ca-nhan-tieu-bieu';

const FORM_ID = 'dttg-thong-tin-ca-nhan-tieu-bieu-form';

interface Props {
  initialData?: ThongTinCaNhanTieuBieu | null;
  onClose: () => void;
}

const ThongTinCaNhanTieuBieuForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');

  const createMutation = useCreateThongTinCaNhanTieuBieu(onClose);
  const updateMutation = useUpdateThongTinCaNhanTieuBieu(onClose);

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

  const doiTuongOptions = useMemo(
    () => DOI_TUONG_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ThongTinCaNhanTieuBieuFormInput>({
    defaultValues: thongTinCaNhanTieuBieuToFormInput(null),
    resolver: zodResolver(thongTinCaNhanTieuBieuSchema) as Resolver<ThongTinCaNhanTieuBieuFormInput>,
  });

  useEffect(() => {
    reset(thongTinCaNhanTieuBieuToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ThongTinCaNhanTieuBieuFormInput> = (data) => {
    const parsed = thongTinCaNhanTieuBieuSchema.parse(data) as ThongTinCaNhanTieuBieuFormValues;
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
      icon={<UserRound size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('danTocCaNhanTieuBieu.form.editSubtitle')} · ${initialData.ho_va_ten}`
          : txt('danTocCaNhanTieuBieu.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<UserRound className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('danTocCaNhanTieuBieu.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('danTocCaNhanTieuBieu.form.hoVaTen')}
                required
                icon={User}
                {...register('ho_va_ten')}
                error={errors.ho_va_ten?.message}
              />
            </div>
            <Input
              label={txt('danTocCaNhanTieuBieu.form.ngaySinh')}
              type="date"
              icon={Calendar}
              {...register('ngay_sinh')}
              error={errors.ngay_sinh?.message}
            />
            <Controller
              name="doi_tuong"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={doiTuongOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  label={txt('danTocCaNhanTieuBieu.form.doiTuong')}
                  required
                  icon={<Users size={14} />}
                  error={errors.doi_tuong?.message}
                  dropdownInPortal
                />
              )}
            />
            <Input
              label={txt('danTocCaNhanTieuBieu.form.chucVuViTri')}
              icon={Star}
              {...register('chuc_vu_vi_tri')}
              error={errors.chuc_vu_vi_tri?.message}
            />
            <Input
              label={txt('danTocCaNhanTieuBieu.form.tonGiaoDanToc')}
              icon={Users}
              {...register('ton_giao_dan_toc')}
              error={errors.ton_giao_dan_toc?.message}
            />
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <StatusToggle
                  label={txt('danTocCaNhanTieuBieu.form.trangThai')}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<Power size={12} />}
                  activeLabel="Đang hoạt động"
                  inactiveLabel="Ngừng hoạt động"
                  error={errors.trang_thai?.message}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocCaNhanTieuBieu.form.sectionContact')} icon={<MapPin size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('danTocCaNhanTieuBieu.form.diaChi')}
                icon={MapPin}
                {...register('dia_chi')}
                error={errors.dia_chi?.message}
              />
            </div>
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5 sm:col-span-2">
                  <Combobox
                    options={xaOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                    label={txt('danTocCaNhanTieuBieu.form.donVi')}
                    placeholder={txt('danTocCaNhanTieuBieu.form.donVi')}
                    error={errors.don_vi_id?.message}
                    icon={<MapPin size={14} />}
                    clearable
                    dropdownInPortal
                    searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                  />
                  <p className="text-xs text-muted-foreground m-0">{txt('danTocCaNhanTieuBieu.form.donViHint')}</p>
                </div>
              )}
            />
            <Input
              label={txt('danTocCaNhanTieuBieu.form.soDienThoai')}
              icon={Phone}
              {...register('so_dien_thoai')}
              error={errors.so_dien_thoai?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocCaNhanTieuBieu.form.sectionContribution')} icon={<FileText size={14} />}>
          <FormGrid cols={1}>
            <Textarea
              label={txt('danTocCaNhanTieuBieu.form.dongGopNoiBat')}
              rows={5}
              icon={FileText}
              {...register('dong_gop_noi_bat')}
              error={errors.dong_gop_noi_bat?.message}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default ThongTinCaNhanTieuBieuForm;
