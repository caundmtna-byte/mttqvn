import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Award,
  Building2,
  Calendar,
  CalendarRange,
  Coins,
  FileText,
  Hash,
  Landmark,
  ListChecks,
  MapPin,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
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
import { useKhoDonViCuuTroList } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import {
  khenThuongNhaTaiTroSchema,
  khenThuongNhaTaiTroToFormInput,
  type KhenThuongNhaTaiTroFormInput,
  type KhenThuongNhaTaiTroFormValues,
} from '../core/schema';
import {
  KTNT_CAP_KHEN_VALUES,
  KTNT_CAP_KHEN_XA,
  KTNT_NAM_MAX,
  KTNT_NAM_MIN,
} from '../core/constants';
import type { KhenThuongNhaTaiTro } from '../core/types';
import { ktntTrangThaiChonDuoc, ktntTrangThaiKhiTao } from '../utils/luat-trang-thai';
import {
  useCreateKhenThuongNhaTaiTro,
  useUpdateKhenThuongNhaTaiTro,
} from '../hooks/use-khen-thuong-nha-tai-tro';
import { isKtntScopedToXaPhuong, useKtntViewer } from '../hooks/use-ktnt-viewer';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';

const FORM_ID = 'ktnt-form';
const L = (k: string) => txt(`khenThuongNhaTaiTro.store.${k}`);

interface Props {
  initialData?: KhenThuongNhaTaiTro | null;
  onClose: () => void;
}

const KtntForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateKhenThuongNhaTaiTro(onClose);
  const updateMutation = useUpdateKhenThuongNhaTaiTro(onClose);
  const { canApprove } = useResourcePermissions('khenThuongNhaTaiTroList');
  const viewer = useKtntViewer();
  const scopedToXa = isKtntScopedToXaPhuong(viewer);

  const xaPhuongOptions = useNddkXaPhuongOptions(scopedToXa ? viewer.viewerDonViId : null);
  const { data: donViRows = [] } = useKhoDonViCuuTroList();
  const nhaTaiTroOptions = useMemo(
    () => donViRows.map((d) => ({ value: d.id, label: d.ten, subLabel: d.loai_label })),
    [donViRows],
  );
  /**
   * Cán bộ cấp xã chỉ thấy quyết định CẤP XÃ của xã mình, nên chỉ được lập đúng
   * loại đó — lập cấp tỉnh xong là tự mình không nhìn thấy nữa.
   */
  const capKhenOptions = useMemo(
    () =>
      (scopedToXa ? [KTNT_CAP_KHEN_XA] : KTNT_CAP_KHEN_VALUES).map((v) => ({ label: v, value: v })),
    [scopedToXa],
  );
  const trangThaiOptions = useMemo(
    () =>
      (initialData
        ? ktntTrangThaiChonDuoc(initialData.trang_thai, canApprove)
        : ktntTrangThaiKhiTao(canApprove)
      ).map((v) => ({ label: v, value: v })),
    [initialData, canApprove],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<KhenThuongNhaTaiTroFormInput, unknown, KhenThuongNhaTaiTroFormValues>({
    defaultValues: khenThuongNhaTaiTroToFormInput(null, getTodayISODate()),
    resolver: zodResolver(khenThuongNhaTaiTroSchema) as Resolver<
      KhenThuongNhaTaiTroFormInput,
      unknown,
      KhenThuongNhaTaiTroFormValues
    >,
  });

  useEffect(() => {
    const base = khenThuongNhaTaiTroToFormInput(initialData ?? null, getTodayISODate());
    if (!initialData && scopedToXa && viewer.viewerDonViId) {
      reset({ ...base, cap_khen: KTNT_CAP_KHEN_XA, xa_phuong_id: viewer.viewerDonViId });
      return;
    }
    reset(base);
  }, [initialData, reset, scopedToXa, viewer.viewerDonViId]);

  const capKhen = useWatch({ control, name: 'cap_khen' });
  const laCapXa = capKhen === KTNT_CAP_KHEN_XA;

  const onSubmit: SubmitHandler<KhenThuongNhaTaiTroFormValues> = (parsed) => {
    if (scopedToXa) {
      if (!viewer.viewerDonViId || parsed.xa_phuong_id !== viewer.viewerDonViId) {
        toast.error(txt('khenThuongNhaTaiTro.noXaPhuongScopePermission'));
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
      icon={<Award size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('khenThuongNhaTaiTro.form.editSubtitle')} · ${initialData.ten_nha_tai_tro ?? ''}`
          : txt('khenThuongNhaTaiTro.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Award className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('khenThuongNhaTaiTro.form.sectionKhen')} icon={<FileText size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={L('noiDungCol')}
                icon={FileText}
                {...register('noi_dung_khen')}
                error={errors.noi_dung_khen?.message}
                rows={2}
                required
              />
            </div>
            <Input
              label={L('ngayKhenCol')}
              type="date"
              icon={Calendar}
              {...register('ngay_khen')}
              error={errors.ngay_khen?.message}
              required
            />
            <Input
              label={L('soQuyetDinhCol')}
              icon={Hash}
              {...register('so_quyet_dinh')}
              error={errors.so_quyet_dinh?.message}
            />
            <Controller
              name="cap_khen"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={L('capKhenCol')}
                  icon={Landmark}
                  options={capKhenOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.cap_khen?.message}
                  required
                  clearable={false}
                />
              )}
            />
            {laCapXa ? (
              <Controller
                name="xa_phuong_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={L('xaPhuongCol')}
                    icon={MapPin}
                    options={xaPhuongOptions}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v == null ? '' : String(v))}
                    placeholder={txt('common.select')}
                    error={errors.xa_phuong_id?.message}
                    required
                  />
                )}
              />
            ) : (
              <div className="hidden md:block" aria-hidden />
            )}
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={L('donViKhenCol')}
                icon={Building2}
                placeholder={txt('khenThuongNhaTaiTro.form.donViKhenPlaceholder')}
                {...register('don_vi_khen')}
                error={errors.don_vi_khen?.message}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('khenThuongNhaTaiTro.form.sectionNhaTaiTro')} icon={<Award size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="nha_tai_tro_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={L('nhaTaiTroCol')}
                    icon={Award}
                    options={nhaTaiTroOptions}
                    value={field.value ?? ''}
                    onChange={(v) => field.onChange(v == null ? '' : String(v))}
                    placeholder={txt('khenThuongNhaTaiTro.form.nhaTaiTroPlaceholder')}
                    error={errors.nha_tai_tro_id?.message}
                    required
                  />
                )}
              />
            </div>
            <Input
              label={L('namTuCol')}
              type="number"
              min={KTNT_NAM_MIN}
              max={KTNT_NAM_MAX}
              icon={CalendarRange}
              {...register('nam_thanh_tich_tu')}
              error={errors.nam_thanh_tich_tu?.message}
            />
            <Input
              label={L('namDenCol')}
              type="number"
              min={KTNT_NAM_MIN}
              max={KTNT_NAM_MAX}
              icon={CalendarRange}
              {...register('nam_thanh_tich_den')}
              error={errors.nam_thanh_tich_den?.message}
            />
            <p className={`${FORM_GRID_SPAN_FULL} -mt-2 text-xs text-muted-foreground`}>
              {txt('khenThuongNhaTaiTro.form.kyHint')}
            </p>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="gia_tri_dong_gop_khac"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    label={L('giaTriKhacCol')}
                    icon={Coins}
                    suffix="đ"
                    value={field.value === '' || field.value == null ? null : field.value}
                    onChange={(n) => field.onChange(n == null ? '' : String(n))}
                    onBlur={field.onBlur}
                    min={0}
                    error={errors.gia_tri_dong_gop_khac?.message}
                  />
                )}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('khenThuongNhaTaiTro.form.giaTriKhacHint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('khenThuongNhaTaiTro.form.sectionTrangThai')} icon={<ListChecks size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={L('trangThaiCol')}
                  icon={ListChecks}
                  options={trangThaiOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.trang_thai?.message}
                  required
                  clearable={false}
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={L('ghiChuCol')}
                icon={StickyNote}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
                rows={2}
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {txt('khenThuongNhaTaiTro.form.ghiChuHint')}
              </p>
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KtntForm;
