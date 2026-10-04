import React, { useEffect, useMemo } from 'react';
import { useForm, useWatch, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  HandHeart,
  FileText,
  CalendarRange,
  Coins,
  Gift,
  Package,
  Layers,
  ListChecks,
  MapPin,
  Users,
  UserSearch,
  Building2,
  StickyNote,
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
import { useKhoDonViCuuTroList } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import {
  viNguoiNgheoSchema,
  viNguoiNgheoToFormInput,
  type ViNguoiNgheoFormInput,
  type ViNguoiNgheoFormValues,
} from '../core/schema';
import {
  VNN_DOI_TUONG_VALUES,
  VNN_HINH_THUC_VALUES,
  vnnCoHienVat,
  VNN_LINH_VUC_VALUES,
  VNN_NAM_MAX,
  VNN_NAM_MIN,
  VNN_NGUON_HO_TRO_VALUES,
  VNN_NGUON_VALUES,
  VNN_TRANG_THAI_VALUES,
} from '../core/constants';
import { canNhaTaiTro } from '../../danh-sach/core/luat-so-tien';
import type { ViNguoiNgheo } from '../core/types';
import {
  useCreateViNguoiNgheo,
  useUpdateViNguoiNgheo,
  useViNguoiNgheoFull,
  useVnnHoNgheoOptions,
} from '../hooks/use-vi-nguoi-ngheo';
import { vnnLoaiPhieu } from '../core/phieu-khao-sat';
import VnnPhieuKhaoSatSection from './phieu-khao-sat/vnn-phieu-khao-sat-section';
import VnnBienBanBanGiaoSection from './bien-ban-ban-giao/vnn-bien-ban-ban-giao-section';
import { isVnnScopedToXaPhuong, useVnnViewer } from '../hooks/use-vnn-viewer';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';

const FORM_ID = 'vnn-form';

const toOptions = (values: readonly string[]) => values.map((v) => ({ label: v, value: v }));

interface Props {
  initialData?: ViNguoiNgheo | null;
  /**
   * Điền sẵn khi TẠO MỚI — màn chi tiết hộ nghèo mở form với hộ đang xem đã
   * được chọn. Bỏ qua khi sửa.
   */
  prefill?: Partial<ViNguoiNgheoFormInput>;
  onClose: () => void;
}

const VnnForm: React.FC<Props> = ({ initialData, prefill, onClose }) => {
  const isEdit = Boolean(initialData);
  /**
   * `initialData` thường là dòng của bảng (RPC phân trang) — thiếu jsonb phiếu
   * khảo sát và biên bản bàn giao. Sửa thì phải có bản đầy đủ trước: lưu từ dòng thiếu sẽ ghi rỗng
   * đè lên dữ liệu thật. Chưa tải xong thì khoá nút Lưu.
   */
  const needsFull =
    isEdit &&
    (initialData?.phieu_khao_sat === undefined || initialData?.bien_ban_ban_giao === undefined);
  const { data: fullRow } = useViNguoiNgheoFull(initialData?.id, { enabled: needsFull });
  const sourceRow = needsFull ? (fullRow ?? null) : (initialData ?? null);
  const waitingFull = needsFull && !fullRow;
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateViNguoiNgheo(onClose);
  const updateMutation = useUpdateViNguoiNgheo(onClose);
  const viewer = useVnnViewer();
  const scopedToXa = isVnnScopedToXaPhuong(viewer);
  const scopedXaId = scopedToXa ? viewer.viewerDonViId : null;

  const xaPhuongOptions = useNddkXaPhuongOptions(scopedXaId);
  const xaPhuongAllOptions = useNddkXaPhuongOptions();
  const tenXaById = useMemo(
    () => new Map(xaPhuongAllOptions.map((o) => [o.value, o.label])),
    [xaPhuongAllOptions],
  );

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

  const { data: donViRows = [] } = useKhoDonViCuuTroList();
  const donViOptions = useMemo(
    () => donViRows.map((d) => ({ value: d.id, label: d.ten, subLabel: d.loai_label })),
    [donViRows],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ViNguoiNgheoFormInput, unknown, ViNguoiNgheoFormValues>({
    defaultValues: viNguoiNgheoToFormInput(null),
    resolver: zodResolver(viNguoiNgheoSchema) as Resolver<
      ViNguoiNgheoFormInput,
      unknown,
      ViNguoiNgheoFormValues
    >,
  });

  const hinhThuc = useWatch({ control, name: 'hinh_thuc_ho_tro' });
  const coHienVat = vnnCoHienVat(hinhThuc);
  const canNtt = canNhaTaiTro(useWatch({ control, name: 'nguon_ho_tro' }));
  const linhVuc = useWatch({ control, name: 'linh_vuc_ho_tro' });
  const loaiPhieu = vnnLoaiPhieu(linhVuc);
  const daGanHo = Boolean(useWatch({ control, name: 'ho_ngheo_id' }));

  /** Ô trống giữ '' chứ không quy về 0 — để zod báo "bắt buộc" đúng ô. */
  const tienInput = (
    name: 'tong_tien_quy_doi' | 'tong_tien_ban_giao',
    label: string,
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <CurrencyInput
          label={label}
          icon={Coins}
          suffix="đ"
          value={field.value === '' || field.value == null ? null : field.value}
          onChange={(n) => field.onChange(n == null ? '' : String(n))}
          onBlur={field.onBlur}
          min={0}
          // Đánh dấu theo luật tiền (core/luat-so-tien.ts); zod mới là nơi kiểm.
          required={name === 'tong_tien_quy_doi'}
          error={errors[name]?.message}
        />
      )}
    />
  );

  useEffect(() => {
    if (initialData) {
      // Bản đầy đủ về sau khi người dùng đã gõ: giữ các ô họ đã sửa.
      reset(viNguoiNgheoToFormInput(sourceRow ?? initialData), { keepDirtyValues: true });
      return;
    }
    const base = viNguoiNgheoToFormInput(null);
    // Tạo mới: cán bộ cấp xã nhập khoản của chính xã mình — điền sẵn xã.
    const xa = scopedToXa && viewer.viewerDonViId ? { xa_phuong_id: viewer.viewerDonViId } : {};
    reset({ ...base, ...xa, ...prefill });
  }, [initialData, sourceRow, prefill, reset, scopedToXa, viewer.viewerDonViId]);

  /**
   * Chọn hộ ⇒ ghi đè họ tên / xã / khối xóm / đối tượng bằng dữ liệu của hộ.
   * Bỏ chọn ⇒ giữ nguyên các ô đã điền để người dùng sửa tay tiếp.
   */
  const handlePickHoNgheo = (id: string) => {
    setValue('ho_ngheo_id', id, { shouldDirty: true });
    const ho = hoNgheoById.get(id);
    if (!ho) return;
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    setValue('ho_ten_nguoi_nhan', ho.ho_ten_dai_dien, opts);
    setValue('xa_phuong_id', ho.xa_phuong_id ?? '', opts);
    setValue('khoi_xom', ho.khoi_xom ?? '', opts);
    setValue('doi_tuong', ho.doi_tuong ?? '', opts);
  };

  const onSubmit: SubmitHandler<ViNguoiNgheoFormValues> = (parsed) => {
    if (waitingFull) return;
    if (scopedToXa) {
      const xa = parsed.xa_phuong_id?.trim() ?? '';
      if (!viewer.viewerDonViId || xa !== viewer.viewerDonViId) {
        toast.error(txt('viNguoiNgheo.noXaPhuongScopePermission'));
        return;
      }
    }
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data: parsed });
    } else {
      createMutation.mutate({ data: parsed, idNguoiTao: nhanVienId });
    }
  };

  const pending =
    isSubmitting || createMutation.isPending || updateMutation.isPending || waitingFull;

  const enumCombobox = (
    name: 'linh_vuc_ho_tro' | 'nguon' | 'nguon_ho_tro' | 'hinh_thuc_ho_tro' | 'trang_thai',
    label: string,
    icon: typeof Coins,
    values: readonly string[],
  ) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <Combobox
          label={label}
          icon={icon}
          options={toOptions(values)}
          value={field.value}
          onChange={field.onChange}
          error={errors[name]?.message}
          required
          clearable={false}
        />
      )}
    />
  );

  return (
    <GenericDrawer
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<HandHeart size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('viNguoiNgheo.form.editSubtitle')} · ${initialData.ho_ten_nguoi_nhan}`
          : txt('viNguoiNgheo.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<HandHeart className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('viNguoiNgheo.form.sectionNguoiNhan')} icon={<Users size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="ho_ngheo_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('viNguoiNgheo.form.hoNgheoLabel')}
                    icon={UserSearch}
                    options={hoNgheoOptions}
                    value={field.value ?? ''}
                    onChange={(v) => {
                      const id = v == null ? '' : String(v);
                      if (id) handlePickHoNgheo(id);
                      else {
                        field.onChange('');
                        setValue('ho_ten_nguoi_nhan', '', { shouldDirty: true });
                      }
                    }}
                    placeholder={
                      hoNgheoLoading ? txt('common.loading') : txt('viNguoiNgheo.form.hoNgheoPlaceholder')
                    }
                    hint={txt('viNguoiNgheo.form.hoNgheoHint')}
                    error={errors.ho_ngheo_id?.message}
                    required
                  />
                )}
              />
            </div>
            {/* Họ tên lấy theo hộ nghèo đã chọn — không nhập tay. */}
            <Input
              label={txt('viNguoiNgheo.store.nguoiNhanCol')}
              icon={Users}
              {...register('ho_ten_nguoi_nhan')}
              readOnly
              tabIndex={-1}
              className="bg-muted/40 cursor-default focus-visible:ring-0 focus-visible:border-border"
              placeholder={txt('viNguoiNgheo.form.hoTenTuHoNgheo')}
              error={daGanHo ? errors.ho_ten_nguoi_nhan?.message : undefined}
              required
            />
            <Controller
              name="doi_tuong"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('viNguoiNgheo.store.doiTuongCol')}
                  icon={Users}
                  options={toOptions(VNN_DOI_TUONG_VALUES)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={txt('common.select')}
                  error={errors.doi_tuong?.message}
                />
              )}
            />
            <Controller
              name="xa_phuong_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('viNguoiNgheo.store.xaPhuongCol')}
                  icon={MapPin}
                  options={xaPhuongOptions}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  placeholder={txt('common.select')}
                />
              )}
            />
            <Input
              label={txt('viNguoiNgheo.store.khoiXomCol')}
              icon={MapPin}
              {...register('khoi_xom')}
              error={errors.khoi_xom?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('viNguoiNgheo.form.sectionHoTro')} icon={<FileText size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('viNguoiNgheo.store.noiDungCol')}
                icon={FileText}
                {...register('noi_dung_ho_tro')}
                error={errors.noi_dung_ho_tro?.message}
                rows={2}
                required
              />
            </div>
            <Input
              label={txt('viNguoiNgheo.store.namCol')}
              type="number"
              min={VNN_NAM_MIN}
              max={VNN_NAM_MAX}
              icon={CalendarRange}
              {...register('nam', { valueAsNumber: true })}
              error={errors.nam?.message}
              required
            />
            {enumCombobox('linh_vuc_ho_tro', txt('viNguoiNgheo.store.linhVucCol'), Layers, VNN_LINH_VUC_VALUES)}
            {enumCombobox('nguon', txt('viNguoiNgheo.store.nguonCol'), Coins, VNN_NGUON_VALUES)}
            {enumCombobox('nguon_ho_tro', txt('viNguoiNgheo.store.nguonHoTroCol'), Coins, VNN_NGUON_HO_TRO_VALUES)}
            {enumCombobox('hinh_thuc_ho_tro', txt('viNguoiNgheo.store.hinhThucCol'), Gift, VNN_HINH_THUC_VALUES)}
            <Controller
              name="so_tien"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label={txt('viNguoiNgheo.store.soTienCol')}
                  icon={Coins}
                  suffix="đ"
                  // Chỉ "Hiện vật" mới được để trống; giữ '' chứ không quy về 0.
                  placeholder={hinhThuc === 'Hiện vật' ? txt('viNguoiNgheo.form.soTienPlaceholder') : undefined}
                  value={field.value === '' || field.value == null ? null : field.value}
                  onChange={(n) => field.onChange(n == null ? '' : String(n))}
                  onBlur={field.onBlur}
                  min={0}
                  required={hinhThuc !== 'Hiện vật'}
                  error={errors.so_tien?.message}
                />
              )}
            />
            {coHienVat ? (
              <>
                <Input
                  label={txt('viNguoiNgheo.store.soLuongCol')}
                  icon={Package}
                  inputMode="numeric"
                  {...register('so_luong')}
                  error={errors.so_luong?.message}
                />
                {tienInput('tong_tien_quy_doi', txt('viNguoiNgheo.store.tongTienQuyDoiCol'))}
                {tienInput('tong_tien_ban_giao', txt('viNguoiNgheo.store.tongTienBanGiaoCol'))}
              </>
            ) : null}
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="don_vi_ho_tro_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('viNguoiNgheo.store.donViHoTroCol')}
                    icon={Building2}
                    options={donViOptions}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v == null ? '' : String(v))}
                    placeholder={txt('viNguoiNgheo.form.donViHoTroPlaceholder')}
                    required={canNtt}
                    error={errors.don_vi_ho_tro_id?.message}
                  />
                )}
              />
            </div>
          </FormGrid>
        </FormSection>

        {loaiPhieu ? (
          <VnnPhieuKhaoSatSection
            control={control}
            loai={loaiPhieu}
            linhVuc={linhVuc}
            daGanHo={daGanHo}
            dangTai={waitingFull}
          />
        ) : null}

        <VnnBienBanBanGiaoSection control={control} linhVuc={linhVuc} dangTai={waitingFull} />

        <FormSection title={txt('viNguoiNgheo.form.sectionTrangThai')} icon={<ListChecks size={14} />}>
          <FormGrid cols={2}>
            {enumCombobox('trang_thai', txt('viNguoiNgheo.store.trangThaiCol'), ListChecks, VNN_TRANG_THAI_VALUES)}
            {/* Không có ô "Ngày cập nhật trạng thái": trigger DB gán khi trạng thái đổi. */}
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('viNguoiNgheo.store.ghiChuCol')}
                icon={StickyNote}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
                rows={2}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('viNguoiNgheo.form.ghiChuHint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default VnnForm;
