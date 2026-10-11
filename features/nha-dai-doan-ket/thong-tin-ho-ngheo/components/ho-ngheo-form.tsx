import React, { useEffect, useMemo } from 'react';
import { useForm, useWatch, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
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
  Flag,
  Landmark,
  CreditCard,
  StickyNote,
  UserRound,
  Cake,
  Calendar,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  LandPlot,
  CalendarClock,
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
import { applyConstraintErrorToForm } from '@/lib/supabase/constraint-field-error';
import {
  hoNgheoFormSchema,
  hoNgheoToFormInput,
  type HoNgheoFormInput,
  type HoNgheoFormValues,
} from '../core/schema';
import {
  HNGH_DOI_TUONG_VALUES,
  HNGH_GIOI_TINH_VALUES,
  HNGH_NAM_SINH_MAX,
  HNGH_NAM_SINH_MIN,
  HNGH_SO_NHAN_KHAU_MAX,
  HNGH_TINH_TRANG_DAT_VALUES,
  HNGH_TO_CHUC_DEFAULT,
  HNGH_TO_CHUC_VALUES,
  HNGH_TON_GIAO_VALUES,
  HNGH_TRANG_THAI_VALUES,
  HNGH_VIEC_LAM_VALUES,
} from '../core/constants';
import type { HoNgheo } from '../core/types';
import { formatDetailDate } from '@/lib/display-format';
import { useCreateHoNgheo, useHoNgheoFull, useUpdateHoNgheo } from '../hooks/use-ho-ngheo';
import { isHoNgheoScopedToXaPhuong, useHoNgheoViewer } from '../hooks/use-ho-ngheo-viewer';
import { useDanTocOptions } from '../hooks/use-dan-toc-options';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';

const FORM_ID = 'ho-ngheo-form';

interface Props {
  initialData?: HoNgheo | null;
  onClose: () => void;
}

const toOptions = (values: readonly string[]) => values.map((v) => ({ label: v, value: v }));

const HoNgheoForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  /**
   * `initialData` thường là dòng của bảng (RPC phân trang) — thiếu nhân khẩu.
   * Sửa thì phải có bản đầy đủ trước: lưu từ dòng thiếu sẽ ghi rỗng đè lên dữ
   * liệu thật. Chưa tải xong thì khoá nút Lưu.
   */
  const needsFull = isEdit && initialData?.nhan_khau === undefined;
  const { data: fullRow } = useHoNgheoFull(initialData?.id, { enabled: needsFull });
  const sourceRow = needsFull ? (fullRow ?? null) : (initialData ?? null);
  const waitingFull = needsFull && !fullRow;
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
  const toChucOptions = useMemo(() => toOptions(HNGH_TO_CHUC_VALUES), []);
  const trangThaiOptions = useMemo(
    () => HNGH_TRANG_THAI_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );
  const gioiTinhOptions = useMemo(() => toOptions(HNGH_GIOI_TINH_VALUES), []);
  const viecLamOptions = useMemo(() => toOptions(HNGH_VIEC_LAM_VALUES), []);
  const tinhTrangDatOptions = useMemo(() => toOptions(HNGH_TINH_TRANG_DAT_VALUES), []);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<HoNgheoFormInput, unknown, HoNgheoFormValues>({
    defaultValues: hoNgheoToFormInput(null),
    resolver: zodResolver(hoNgheoFormSchema) as Resolver<HoNgheoFormInput, unknown, HoNgheoFormValues>,
  });

  const trangThaiHienTai = useWatch({ control, name: 'trang_thai' });

  useEffect(() => {
    if (isEdit) {
      if (!sourceRow) return;
      // Bản đầy đủ về sau khi người dùng đã gõ: giữ các ô họ đã sửa.
      reset(hoNgheoToFormInput(sourceRow), { keepDirtyValues: true });
      return;
    }
    const base = hoNgheoToFormInput(null);
    // Tạo mới: cán bộ cấp xã nhập hộ của chính xã mình — điền sẵn để khỏi phải
    // chọn lại, và combobox cũng chỉ còn đúng xã đó.
    if (scopedToXa && viewer.viewerDonViId) {
      reset({ ...base, xa_phuong_id: viewer.viewerDonViId });
      return;
    }
    reset(base);
  }, [isEdit, sourceRow, reset, scopedToXa, viewer.viewerDonViId]);

  const onSubmit: SubmitHandler<HoNgheoFormValues> = async (parsed) => {
    if (waitingFull) return;
    if (scopedToXa) {
      const xa = parsed.xa_phuong_id?.trim() ?? '';
      if (!viewer.viewerDonViId || xa !== viewer.viewerDonViId) {
        toast.error(txt('hoNgheo.noXaPhuongScopePermission'));
        return;
      }
    }
    // Trùng / sai định dạng số căn cước ⇒ chữ đỏ dưới đúng ô, không phải toast ở góc.
    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, data: parsed });
      } else {
        await createMutation.mutateAsync({ data: parsed, idNguoiTao: nhanVienId });
      }
    } catch (e) {
      applyConstraintErrorToForm(e, setError);
    }
  };

  const pending =
    isSubmitting || createMutation.isPending || updateMutation.isPending || waitingFull;

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
                maxLength={15}
                placeholder={txt('hoNgheo.form.soCccdPlaceholder')}
                {...register('so_cccd')}
                error={errors.so_cccd?.message}
                required
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
              required
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
                  required
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
                  required
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
            <Controller
              name="to_chuc"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={toChucOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v == null ? HNGH_TO_CHUC_DEFAULT : String(v))}
                  label={txt('hoNgheo.store.toChucCol')}
                  placeholder={txt('hoNgheo.store.toChucCol')}
                  error={errors.to_chuc?.message}
                  icon={<Flag size={14} />}
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

        <FormSection title={txt('hoNgheo.form.sectionNhanKhau')} icon={<UserRound size={14} />}>
          <p className="-mt-1 mb-3 text-xs text-muted-foreground">
            {txt('hoNgheo.form.sectionNhanKhauHint')}
          </p>
          <FormGrid cols={2}>
            <Controller
              name="gioi_tinh"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={gioiTinhOptions}
                  value={field.value === '' ? null : (field.value ?? null)}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  label={txt('hoNgheo.store.gioiTinhCol')}
                  placeholder={txt('hoNgheo.form.chonPlaceholder')}
                  error={errors.gioi_tinh?.message}
                  icon={<UserRound size={14} />}
                  dropdownInPortal
                />
              )}
            />
            <Input
              label={txt('hoNgheo.store.namSinhCol')}
              icon={Cake}
              type="number"
              inputMode="numeric"
              min={HNGH_NAM_SINH_MIN}
              max={HNGH_NAM_SINH_MAX}
              {...register('nam_sinh')}
              error={errors.nam_sinh?.message}
            />
            <Input
              label={txt('hoNgheo.store.ngayCapCccdCol')}
              icon={Calendar}
              type="date"
              {...register('ngay_cap_cccd')}
              error={errors.ngay_cap_cccd?.message}
            />
            <Input
              label={txt('hoNgheo.store.noiCapCccdCol')}
              icon={IdCard}
              {...register('noi_cap_cccd')}
              error={errors.noi_cap_cccd?.message}
            />
            <Input
              label={txt('hoNgheo.store.hoTenVoChongCol')}
              icon={HeartHandshake}
              {...register('ho_ten_vo_chong')}
              error={errors.ho_ten_vo_chong?.message}
            />
            <Input
              label={txt('hoNgheo.store.soNhanKhauCol')}
              icon={Users}
              type="number"
              inputMode="numeric"
              min={0}
              max={HNGH_SO_NHAN_KHAU_MAX}
              {...register('so_nhan_khau')}
              error={errors.so_nhan_khau?.message}
            />
            <Input
              label={txt('hoNgheo.store.ngheNghiepCol')}
              icon={Briefcase}
              {...register('nghe_nghiep')}
              error={errors.nghe_nghiep?.message}
            />
            <Input
              label={txt('hoNgheo.store.trinhDoHocVanCol')}
              icon={GraduationCap}
              {...register('trinh_do_hoc_van')}
              error={errors.trinh_do_hoc_van?.message}
            />
            <Controller
              name="tinh_trang_viec_lam"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={viecLamOptions}
                  value={field.value === '' ? null : (field.value ?? null)}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  label={txt('hoNgheo.store.viecLamCol')}
                  placeholder={txt('hoNgheo.form.chonPlaceholder')}
                  error={errors.tinh_trang_viec_lam?.message}
                  icon={<Briefcase size={14} />}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="tinh_trang_dat"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={tinhTrangDatOptions}
                  value={field.value === '' ? null : (field.value ?? null)}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  label={txt('hoNgheo.store.tinhTrangDatCol')}
                  placeholder={txt('hoNgheo.form.chonPlaceholder')}
                  error={errors.tinh_trang_dat?.message}
                  icon={<LandPlot size={14} />}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('hoNgheo.store.doiTuongUuTienCol')}
                icon={ListChecks}
                placeholder={txt('hoNgheo.form.doiTuongUuTienPlaceholder')}
                {...register('doi_tuong_uu_tien')}
                error={errors.doi_tuong_uu_tien?.message}
              />
            </div>
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
            {/* Ngày trạng thái do trigger `fn_hngh_set_ngay_trang_thai` gán — chỉ hiển thị. */}
            <div>
              <Input
                label={txt('hoNgheo.form.ngayTrangThaiLabel')}
                icon={CalendarClock}
                value={formatDetailDate(sourceRow?.ngay_cap_nhat_trang_thai) ?? ''}
                placeholder={txt('hoNgheo.form.ngayTrangThaiTuGhi')}
                readOnly
                disabled
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {isEdit && sourceRow && trangThaiHienTai !== sourceRow.trang_thai
                  ? txt('hoNgheo.form.ngayTrangThaiSeCapNhat')
                  : txt('hoNgheo.detail.ngayTrangThaiHint')}
              </p>
            </div>
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
