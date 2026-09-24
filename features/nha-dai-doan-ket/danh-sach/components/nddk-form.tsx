import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Home,
  FileText,
  CalendarRange,
  Coins,
  Hammer,
  ListChecks,
  MapPin,
  Users,
  StickyNote,
  UserSearch,
} from 'lucide-react';
import { txt } from '@/lib/text';
import { toast } from 'sonner';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import {
  nhaDaiDoanKetSchema,
  nhaDaiDoanKetToFormInput,
  type NhaDaiDoanKetFormInput,
  type NhaDaiDoanKetFormValues,
} from '../core/schema';
import {
  NDDK_DOI_TUONG_VALUES,
  NDDK_LOAI_HINH_VALUES,
  NDDK_NAM_MAX,
  NDDK_NAM_MIN,
  NDDK_NGUON_HO_TRO_VALUES,
  NDDK_NGUON_VALUES,
} from '../core/constants';
import { nddkTrangThaiChonDuoc } from '../core/quyen-trang-thai';
import type { NhaDaiDoanKet } from '../core/types';
import { useCreateNhaDaiDoanKet, useUpdateNhaDaiDoanKet } from '../hooks/use-nha-dai-doan-ket';
import { isNddkScopedToXaPhuong, useNddkViewer } from '../hooks/use-nddk-viewer';
import { useNddkXaPhuongOptions } from '../hooks/use-nddk-xa-phuong-options';
import { useVnnHoNgheoOptions } from '../../vi-nguoi-ngheo/hooks/use-vi-nguoi-ngheo';

const FORM_ID = 'nddk-form';

interface Props {
  initialData?: NhaDaiDoanKet | null;
  onClose: () => void;
  /** Tạo mới từ chi tiết hộ nghèo: hộ đang xem được chọn sẵn. */
  prefill?: Partial<NhaDaiDoanKetFormInput>;
}

const NddkForm: React.FC<Props> = ({ initialData, onClose, prefill }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateNhaDaiDoanKet(onClose);
  const updateMutation = useUpdateNhaDaiDoanKet(onClose);
  const viewer = useNddkViewer();
  const scopedToXa = isNddkScopedToXaPhuong(viewer);
  const { canApprove } = useResourcePermissions('nhaDaiDoanKetList');

  const scopedXaId = scopedToXa ? viewer.viewerDonViId : null;
  const xaPhuongOptions = useNddkXaPhuongOptions();
  const tenXaById = useMemo(
    () => new Map(xaPhuongOptions.map((o) => [o.value, o.label])),
    [xaPhuongOptions],
  );

  // Nhà đại đoàn kết BẮT BUỘC gắn một hộ; cán bộ cấp xã chỉ thấy hộ của xã mình.
  const { data: hoNgheoRows = [], isLoading: hoNgheoLoading } = useVnnHoNgheoOptions(scopedXaId);
  const hoNgheoById = useMemo(() => new Map(hoNgheoRows.map((h) => [h.id, h])), [hoNgheoRows]);
  const hoNgheoOptions = useMemo(
    () =>
      hoNgheoRows.map((h) => ({
        value: h.id,
        label: h.ho_ten_dai_dien,
        subLabel: [h.so_cccd, h.xa_phuong_id ? tenXaById.get(h.xa_phuong_id) : null]
          .filter(Boolean)
          .join(' · '),
      })),
    [hoNgheoRows, tenXaById],
  );
  const nguonOptions = useMemo(() => NDDK_NGUON_VALUES.map((v) => ({ label: v, value: v })), []);
  const nguonHoTroOptions = useMemo(
    () => NDDK_NGUON_HO_TRO_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );
  const doiTuongOptions = useMemo(
    () => NDDK_DOI_TUONG_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );
  const loaiHinhOptions = useMemo(
    () => NDDK_LOAI_HINH_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );
  /**
   * Ô Trạng thái trên form sửa cũng phải lọc theo quyền Duyệt, không chỉ hộp
   * thoại "Chuyển trạng thái": để nguyên cả 5 lựa chọn thì người không có quyền
   * vẫn chọn được "Đã phê duyệt" rồi mới ăn lỗi từ DB khi bấm Lưu.
   */
  const trangThaiOptions = useMemo(
    () =>
      nddkTrangThaiChonDuoc(initialData?.trang_thai, canApprove).map((v) => ({
        label: v,
        value: v,
      })),
    [initialData?.trang_thai, canApprove],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<NhaDaiDoanKetFormInput, unknown, NhaDaiDoanKetFormValues>({
    defaultValues: nhaDaiDoanKetToFormInput(null),
    resolver: zodResolver(nhaDaiDoanKetSchema) as Resolver<
      NhaDaiDoanKetFormInput,
      unknown,
      NhaDaiDoanKetFormValues
    >,
  });

  useEffect(() => {
    const base = nhaDaiDoanKetToFormInput(initialData ?? null);
    reset(initialData ? base : { ...base, ...prefill });
  }, [initialData, prefill, reset]);

  /**
   * Chọn hộ ⇒ điền họ tên / xã / khối xóm / đối tượng theo hộ. Bốn ô đó khoá
   * lại: dưới DB trigger `fn_nddk_dong_bo_tu_ho_ngheo` cũng chép từ hộ, sửa tay
   * ở đây sẽ bị ghi đè.
   */
  const handlePickHoNgheo = (id: string) => {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue('ho_ngheo_id', id, opts);
    const ho = hoNgheoById.get(id);
    if (!ho) return;
    setValue('ho_ten_chu_ho', ho.ho_ten_dai_dien, opts);
    setValue('xa_phuong_id', ho.xa_phuong_id ?? '', opts);
    setValue('khoi_xom', ho.khoi_xom ?? '', opts);
    setValue('doi_tuong', ho.doi_tuong ?? '', opts);
  };

  const onSubmit: SubmitHandler<NhaDaiDoanKetFormValues> = (parsed) => {
    if (scopedToXa) {
      const xa = parsed.xa_phuong_id?.trim() ?? '';
      if (!viewer.viewerDonViId || xa !== viewer.viewerDonViId) {
        toast.error(txt('nhaDaiDoanKet.noXaPhuongScopePermission'));
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
      icon={<Home size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('nhaDaiDoanKet.form.editSubtitle')} · ${initialData.ho_ten_chu_ho}`
          : txt('nhaDaiDoanKet.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Home className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('nhaDaiDoanKet.form.sectionHoDan')} icon={<Users size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="ho_ngheo_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('nhaDaiDoanKet.form.hoNgheoLabel')}
                    icon={UserSearch}
                    options={hoNgheoOptions}
                    value={field.value ?? ''}
                    onChange={(v) => {
                      const id = v == null ? '' : String(v);
                      if (id) handlePickHoNgheo(id);
                      else field.onChange('');
                    }}
                    placeholder={
                      hoNgheoLoading ? txt('common.loading') : txt('nhaDaiDoanKet.form.hoNgheoPlaceholder')
                    }
                    hint={txt('nhaDaiDoanKet.form.hoNgheoHint')}
                    error={errors.ho_ngheo_id?.message}
                    required
                  />
                )}
              />
            </div>
            <Input
              label={txt('nhaDaiDoanKet.store.chuHoCol')}
              icon={Users}
              {...register('ho_ten_chu_ho')}
              error={errors.ho_ten_chu_ho?.message}
              readOnly
              className="bg-muted cursor-not-allowed"
            />
            <Controller
              name="doi_tuong"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('nhaDaiDoanKet.store.doiTuongCol')}
                  icon={Users}
                  options={doiTuongOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={txt('common.emptyCell')}
                  disabled
                />
              )}
            />
            <Controller
              name="xa_phuong_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('nhaDaiDoanKet.store.xaPhuongCol')}
                  icon={MapPin}
                  options={xaPhuongOptions}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  placeholder={txt('common.emptyCell')}
                  disabled
                />
              )}
            />
            <Input
              label={txt('nhaDaiDoanKet.store.khoiXomCol')}
              icon={MapPin}
              {...register('khoi_xom')}
              readOnly
              className="bg-muted cursor-not-allowed"
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('nhaDaiDoanKet.form.sectionHoTro')} icon={<FileText size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('nhaDaiDoanKet.store.noiDungCol')}
                icon={FileText}
                {...register('noi_dung_ho_tro')}
                error={errors.noi_dung_ho_tro?.message}
                rows={2}
                required
              />
            </div>
            <Input
              label={txt('nhaDaiDoanKet.store.namCol')}
              type="number"
              min={NDDK_NAM_MIN}
              max={NDDK_NAM_MAX}
              icon={CalendarRange}
              {...register('nam', { valueAsNumber: true })}
              error={errors.nam?.message}
              required
            />
            <Controller
              name="loai_hinh_ho_tro"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('nhaDaiDoanKet.store.loaiHinhCol')}
                  icon={Hammer}
                  options={loaiHinhOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.loai_hinh_ho_tro?.message}
                  required
                />
              )}
            />
            <Controller
              name="nguon"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('nhaDaiDoanKet.store.nguonCol')}
                  icon={Coins}
                  options={nguonOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.nguon?.message}
                  required
                />
              )}
            />
            <Controller
              name="nguon_ho_tro"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('nhaDaiDoanKet.store.nguonHoTroCol')}
                  icon={Coins}
                  options={nguonHoTroOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.nguon_ho_tro?.message}
                  required
                />
              )}
            />
            <Controller
              name="so_tien"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label={txt('nhaDaiDoanKet.store.soTienCol')}
                  icon={Coins}
                  suffix="đ"
                  placeholder={txt('nhaDaiDoanKet.form.soTienPlaceholder')}
                  // Form giữ số tiền dạng chuỗi; ô trống là hợp lệ (hồ sơ đang
                  // khảo sát thì chưa chốt mức hỗ trợ) nên phải giữ '' chứ
                  // không quy về 0.
                  value={field.value === '' || field.value == null ? null : field.value}
                  onChange={(n) => field.onChange(n == null ? '' : String(n))}
                  onBlur={field.onBlur}
                  min={0}
                  error={errors.so_tien?.message}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection
          title={txt('nhaDaiDoanKet.form.sectionTrangThai')}
          icon={<ListChecks size={14} />}
        >
          <FormGrid cols={2}>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('nhaDaiDoanKet.store.trangThaiCol')}
                  icon={ListChecks}
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.trang_thai?.message}
                  required
                />
              )}
            />
            {/*
              Không có ô "Ngày cập nhật trạng thái": trigger DB gán khi trạng
              thái đổi. Cho nhập tay là mở đường cho ngày lệch với trạng thái.
            */}
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('nhaDaiDoanKet.store.ghiChuCol')}
                icon={StickyNote}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
                rows={2}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('nhaDaiDoanKet.form.ghiChuHint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default NddkForm;
