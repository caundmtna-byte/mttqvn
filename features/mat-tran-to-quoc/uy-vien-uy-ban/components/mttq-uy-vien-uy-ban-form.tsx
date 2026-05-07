import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Building2, Flag, MapPin, StickyNote, Type, User, Users } from 'lucide-react';
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
import { useCan } from '@/hooks/use-can';
import { useMttqNhiemKyList } from '@/features/mat-tran-to-quoc/nhiem-ky/hooks/use-mttq-nhiem-ky';
import { useTinhThanhList } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import {
  mttqUyVienUyBanSchema,
  mttqUyVienUyBanToFormInput,
  type MttqUyVienUyBanFormInput,
  type MttqUyVienUyBanFormValues,
} from '../core/schema';
import type { MttqUyVienUyBan } from '../core/types';
import { useCreateMttqUyVienUyBan, useUpdateMttqUyVienUyBan } from '../hooks/use-mttq-uy-vien-uy-ban';

const FORM_ID = 'mttq-uy-vien-uy-ban-form';

const TINH_CAP_VALUE = '__tinh_cap__';

interface Props {
  initialData?: MttqUyVienUyBan | null;
  onClose: () => void;
}

const MttqUyVienUyBanForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const canViewNhiemKy = useCan('view', 'matTranTerm');
  const { data: nhiemKyList = [] } = useMttqNhiemKyList({ enabled: canViewNhiemKy });
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');

  const createMutation = useCreateMttqUyVienUyBan(onClose);
  const updateMutation = useUpdateMttqUyVienUyBan(onClose);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const nhiemKyOptions = useMemo(
    () =>
      [...nhiemKyList]
        .sort((a, b) => a.ten_nhiem_ky.localeCompare(b.ten_nhiem_ky, 'vi'))
        .map((n) => ({ label: n.ten_nhiem_ky, value: String(n.id) })),
    [nhiemKyList],
  );

  const xaOptions = useMemo(() => {
    const tinhCap = {
      label: `${txt('matTranUyVienUyBan.tinhCap')} (${txt('matTranUyVienUyBan.form.donViPlaceholder')})`,
      value: TINH_CAP_VALUE,
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

  const defaultValues = useMemo(() => mttqUyVienUyBanToFormInput(initialData ?? null), [initialData]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MttqUyVienUyBanFormInput, unknown, MttqUyVienUyBanFormValues>({
    defaultValues,
    resolver: zodResolver(mttqUyVienUyBanSchema) as Resolver<MttqUyVienUyBanFormInput, unknown, MttqUyVienUyBanFormValues>,
  });

  useEffect(() => {
    reset(mttqUyVienUyBanToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<MttqUyVienUyBanFormValues> = (data) => {
    if (!isEdit) {
      if (!idNguoiTao) {
        toast.error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));
        return;
      }
      createMutation.mutate({ data, idNguoiTao });
      return;
    }
    if (!initialData) return;
    updateMutation.mutate({ id: initialData.id, data });
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Users size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranUyVienUyBan.form.editSubtitle')} · ${initialData.ho_va_ten}`
          : txt('matTranUyVienUyBan.form.createSubtitle')
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
        <FormSection title={txt('matTranUyVienUyBan.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid>
            <Controller
              name="ma_uv"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  label={txt('matTranUyVienUyBan.form.maUv')}
                  error={errors.ma_uv?.message}
                  icon={User}
                />
              )}
            />
            <Controller
              name="nhiem_ky_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={nhiemKyOptions}
                  value={field.value === '' ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('matTranUyVienUyBan.form.nhiemKy')}
                  placeholder={txt('matTranUyVienUyBan.form.nhiemKy')}
                  error={errors.nhiem_ky_id?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                  disabled={!canViewNhiemKy || nhiemKyOptions.length === 0}
                />
              )}
            />
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={xaOptions}
                  value={
                    field.value === '' || field.value === undefined
                      ? TINH_CAP_VALUE
                      : field.value === TINH_CAP_VALUE
                        ? TINH_CAP_VALUE
                        : field.value
                  }
                  onChange={(v) => {
                    if (v === '' || v == null || v === TINH_CAP_VALUE) field.onChange('');
                    else field.onChange(String(v));
                  }}
                  label={txt('matTranUyVienUyBan.form.donVi')}
                  placeholder={txt('matTranUyVienUyBan.form.donViPlaceholder')}
                  error={errors.don_vi_id?.message as string | undefined}
                  icon={<MapPin size={14} />}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranUyVienUyBan.form.hoVaTen')}
                required
                icon={Users}
                {...register('ho_va_ten')}
                error={errors.ho_va_ten?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranUyVienUyBan.form.chucVuDonVi')}
                icon={Building2}
                {...register('chuc_vu_don_vi')}
                error={errors.chuc_vu_don_vi?.message}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionCaNhan')} icon={<User size={14} />}>
          <FormGrid>
            <Input label={txt('matTranUyVienUyBan.form.ngaySinh')} type="date" {...register('ngay_sinh')} error={errors.ngay_sinh?.message} />
            <Input label={txt('matTranUyVienUyBan.form.gioiTinh')} {...register('gioi_tinh')} error={errors.gioi_tinh?.message} />
            <Input label={txt('matTranUyVienUyBan.form.trangThamGia')} {...register('trang_thai_tham_gia')} error={errors.trang_thai_tham_gia?.message} />
            <Input
              label={txt('matTranUyVienUyBan.form.ngayNhapTrangThai')}
              type="date"
              {...register('ngay_nhap_trang_thai')}
              error={errors.ngay_nhap_trang_thai?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionHocVan')} icon={<BookOpen size={14} />}>
          <FormGrid>
            <Input label={txt('matTranUyVienUyBan.form.vanHoa')} {...register('van_hoa')} error={errors.van_hoa?.message} />
            <Input label={txt('matTranUyVienUyBan.form.trinhDoCm')} {...register('trinh_do_cm')} error={errors.trinh_do_cm?.message} />
            <Input label={txt('matTranUyVienUyBan.form.trinhDoLlct')} {...register('trinh_do_llct')} error={errors.trinh_do_llct?.message} />
            <Input label={txt('matTranUyVienUyBan.form.danToc')} {...register('dan_toc')} error={errors.dan_toc?.message} />
            <Input label={txt('matTranUyVienUyBan.form.tonGiao')} {...register('ton_giao')} error={errors.ton_giao?.message} />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionDang')} icon={<Flag size={14} />}>
          <FormGrid cols={2}>
            <div className="flex items-center gap-2 pt-6">
              <Controller
                name="dang_vien"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary accent-primary"
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    {txt('matTranUyVienUyBan.form.dangVien')}
                  </label>
                )}
              />
            </div>
            <Input label={txt('matTranUyVienUyBan.form.ngayVaoDang')} type="date" {...register('ngay_vao_dang')} error={errors.ngay_vao_dang?.message} />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionLienHe')} icon={<MapPin size={14} />}>
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea label={txt('matTranUyVienUyBan.form.queQuan')} {...register('que_quan')} rows={2} error={errors.que_quan?.message} />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea label={txt('matTranUyVienUyBan.form.noiOHienNay')} {...register('noi_o_hien_nay')} rows={2} error={errors.noi_o_hien_nay?.message} />
            </div>
            <Input label={txt('matTranUyVienUyBan.form.soDienThoai')} {...register('so_dien_thoai')} error={errors.so_dien_thoai?.message} />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionGhiChu')} icon={<StickyNote size={14} />}>
          <Textarea label={txt('matTranUyVienUyBan.form.ghiChu')} {...register('ghi_chu')} rows={3} error={errors.ghi_chu?.message} />
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqUyVienUyBanForm;
