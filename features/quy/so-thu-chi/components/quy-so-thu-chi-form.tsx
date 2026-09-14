import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Calendar,
  FileText,
  MapPin,
  Receipt,
  Tag,
  User,
  Wallet,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import DatePicker from '@/components/ui/DatePicker';
import RadioGroup from '@/components/ui/RadioGroup';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { QUY_LOAI_PHIEU_LABEL, type QuyKey, type QuyLoai } from '../../core/constants';
import { formatTienInput } from '../../utils/quy-tien';
import { useQuyKhoanOptions } from '../../danh-muc-khoan/hooks/use-quy-danh-muc-khoan';
import { useQuyTaiKhoanOptions } from '../../danh-muc-tai-khoan/hooks/use-quy-danh-muc-tai-khoan';
import { quySoThuChiSchema, type QuySoThuChiFormValues } from '../core/schema';
import type { QuySoThuChiListRow } from '../core/types';
import { useCreateQuySoThuChi, useUpdateQuySoThuChi } from '../hooks/use-quy-so-thu-chi';
import { useQuyViewer } from '../../shared/use-quy-viewer';

const FORM_ID = 'quy-so-thu-chi-form';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const LOAI_OPTIONS = [
  {
    value: 'thu' as QuyLoai,
    label: QUY_LOAI_PHIEU_LABEL.thu,
    color: 'emerald' as const,
    icon: <ArrowDownLeft size={14} />,
  },
  {
    value: 'chi' as QuyLoai,
    label: QUY_LOAI_PHIEU_LABEL.chi,
    color: 'rose' as const,
    icon: <ArrowUpRight size={14} />,
  },
];

interface Props {
  quy: QuyKey;
  initialData?: QuySoThuChiListRow | null;
  onClose: () => void;
}

const QuySoThuChiForm: React.FC<Props> = ({ quy, initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateQuySoThuChi(quy, onClose);
  const updateMutation = useUpdateQuySoThuChi(quy, onClose);

  const { data: khoanOptions = [] } = useQuyKhoanOptions(quy);
  const { data: taiKhoanOptions = [] } = useQuyTaiKhoanOptions(quy);
  const { data: xaList = [] } = useXaPhuongForTab(true, '');
  const viewer = useQuyViewer();
  /** Tài khoản cấp Xã phường — điền sẵn "Xã/phường liên quan" khi tạo phiếu (không khóa). */
  const defaultDonViFromViewer =
    viewer.chucVuCapQuanLy === 'Xã phường' && Boolean(viewer.viewerDonViId);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<QuySoThuChiFormValues>({
    defaultValues: {
      loai: 'thu',
      ngay_chung_tu: todayISO(),
      khoan_id: '',
      tai_khoan_id: '',
      so_tien: '',
      noi_dung: '',
      nguoi_nop_nhan: '',
      don_vi_id: '',
      chung_tu_goc: '',
      ghi_chu: '',
    },
    resolver: zodResolver(quySoThuChiSchema) as Resolver<QuySoThuChiFormValues>,
  });

  const loai = watch('loai');
  const khoanId = watch('khoan_id');

  useEffect(() => {
    if (initialData) {
      reset({
        loai: initialData.loai,
        ngay_chung_tu: initialData.ngay_chung_tu || todayISO(),
        khoan_id: initialData.khoan_id,
        tai_khoan_id: initialData.tai_khoan_id,
        so_tien: formatTienInput(initialData.so_tien),
        noi_dung: initialData.noi_dung,
        nguoi_nop_nhan: initialData.nguoi_nop_nhan ?? '',
        don_vi_id: initialData.don_vi_id ?? '',
        chung_tu_goc: initialData.chung_tu_goc ?? '',
        ghi_chu: initialData.ghi_chu ?? '',
      });
    }
  }, [initialData, reset]);

  const donViIdWatch = watch('don_vi_id');
  useEffect(() => {
    if (initialData) return;
    if (defaultDonViFromViewer && viewer.viewerDonViId && !donViIdWatch) {
      setValue('don_vi_id', viewer.viewerDonViId);
    }
  }, [initialData, defaultDonViFromViewer, viewer.viewerDonViId, donViIdWatch, setValue]);

  /**
   * Chỉ hiện khoản mục CÙNG LOẠI với phiếu và đang hoạt động.
   *
   * DB đã chặn bằng khóa ngoại ghép `(khoan_id, loai)`, nhưng chặn ngay ở đây
   * thì cán bộ không bao giờ gặp thông báo từ chối — họ đơn giản là không thấy
   * lựa chọn sai. Khoản mục đã "Ngừng" vẫn giữ lại nếu phiếu cũ đang dùng nó,
   * nếu không mở phiếu cũ ra sẽ thấy ô khoản mục trống trơn.
   */
  const khoanComboOptions = useMemo(() => {
    const cungLoai = khoanOptions.filter((k) => k.loai === loai);
    const dangDung = cungLoai.filter(
      (k) => k.trang_thai === 'Hoạt động' || k.id === initialData?.khoan_id,
    );
    return dangDung.map((k) => ({ label: k.ten, value: k.id }));
  }, [khoanOptions, loai, initialData?.khoan_id]);

  const taiKhoanComboOptions = useMemo(
    () =>
      taiKhoanOptions
        .filter((t) => t.trang_thai === 'Hoạt động' || t.id === initialData?.tai_khoan_id)
        .map((t) => ({
          label: t.ten,
          value: t.id,
          subLabel: [t.so_tai_khoan, t.ngan_hang].filter(Boolean).join(' · ') || undefined,
        })),
    [taiKhoanOptions, initialData?.tai_khoan_id],
  );

  const xaOptions = useMemo(
    () =>
      [...xaList]
        .sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
        .map((x) => ({ label: x.ten, value: String(x.id) })),
    [xaList],
  );

  // Đổi loại phiếu ⇒ khoản mục cũ không còn hợp lệ, phải bỏ chọn thay vì để lại
  // một id thuộc loại kia rồi bị DB từ chối lúc lưu.
  useEffect(() => {
    if (isEdit) return;
    if (!khoanId) return;
    if (khoanComboOptions.some((o) => o.value === khoanId)) return;
    setValue('khoan_id', '', { shouldValidate: false });
  }, [khoanComboOptions, khoanId, isEdit, setValue]);

  const onSubmit: SubmitHandler<QuySoThuChiFormValues> = (data) => {
    if (isEdit && initialData) updateMutation.mutate({ id: initialData.id, data });
    else createMutation.mutate(data);
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;
  const khoanEmptyText =
    loai === 'thu'
      ? txt('quy.soThuChi.form.khoanEmptyThu')
      : txt('quy.soThuChi.form.khoanEmptyChi');

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Receipt size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('quy.soThuChi.form.editSubtitle')} · ${initialData.so_chung_tu}`
          : txt('quy.soThuChi.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Receipt className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection
          title={txt('quy.soThuChi.form.sectionChungTu')}
          icon={<Receipt size={14} />}
        >
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="loai"
                control={control}
                render={({ field }) => (
                  <div className="space-y-1.5">
                    <RadioGroup
                      label={txt('quy.soThuChi.form.loai')}
                      required
                      options={LOAI_OPTIONS}
                      value={field.value}
                      onChange={(v) => field.onChange(String(v))}
                      error={errors.loai?.message}
                      layout="horizontal"
                      disabled={isEdit}
                    />
                    {isEdit ? (
                      <p className="text-xs text-muted-foreground m-0">
                        {txt('quy.soThuChi.form.loaiHintEdit')}
                      </p>
                    ) : null}
                  </div>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Input
                label={txt('quy.soThuChi.form.soChungTu')}
                icon={Receipt}
                value={initialData?.so_chung_tu ?? ''}
                readOnly
                disabled
                placeholder="PT-…"
              />
              <p className="text-xs text-muted-foreground m-0">
                {isEdit
                  ? txt('quy.soThuChi.form.soChungTuHintEdit')
                  : txt('quy.soThuChi.form.soChungTuHintCreate')}
              </p>
            </div>

            <Controller
              name="ngay_chung_tu"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label={txt('quy.soThuChi.form.ngayChungTu')}
                  required
                  icon={<Calendar size={14} />}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  error={errors.ngay_chung_tu?.message}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('quy.soThuChi.form.sectionTien')} icon={<Banknote size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="khoan_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Combobox
                    options={khoanComboOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v == null ? '' : String(v))}
                    label={txt('quy.soThuChi.form.khoan')}
                    placeholder={txt('quy.soThuChi.form.khoan')}
                    error={errors.khoan_id?.message}
                    icon={<Tag size={14} />}
                    required
                    clearable
                    dropdownInPortal
                  />
                  <p className="text-xs text-muted-foreground m-0">
                    {khoanComboOptions.length === 0
                      ? khoanEmptyText
                      : txt('quy.soThuChi.form.khoanHint')}
                  </p>
                </div>
              )}
            />

            <Controller
              name="tai_khoan_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Combobox
                    options={taiKhoanComboOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v == null ? '' : String(v))}
                    label={txt('quy.soThuChi.form.taiKhoan')}
                    placeholder={txt('quy.soThuChi.form.taiKhoan')}
                    error={errors.tai_khoan_id?.message}
                    icon={<Wallet size={14} />}
                    required
                    clearable
                    dropdownInPortal
                  />
                  {taiKhoanComboOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground m-0">
                      {txt('quy.soThuChi.form.taiKhoanEmpty')}
                    </p>
                  ) : null}
                </div>
              )}
            />

            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="so_tien"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    label={txt('quy.soThuChi.form.soTien')}
                    required
                    icon={Banknote}
                    suffix="đ"
                    placeholder="1.500.000"
                    // Schema giữ số tiền dạng chuỗi (service đọc lại bằng
                    // `parseTienInput`), nên trả chuỗi chứ không trả số.
                    value={field.value === '' || field.value == null ? null : field.value}
                    onChange={(n) => field.onChange(n == null ? '' : String(n))}
                    onBlur={field.onBlur}
                    min={0}
                    error={errors.so_tien?.message}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground mt-1 m-0">
                {txt('quy.soThuChi.form.soTienHint')}
              </p>
            </div>

            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('quy.soThuChi.form.noiDung')}
                required
                rows={2}
                icon={FileText}
                {...register('noi_dung')}
                error={errors.noi_dung?.message}
              />
            </div>

            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={
                  loai === 'thu'
                    ? txt('quy.soThuChi.form.nguoiNopNhanThu')
                    : txt('quy.soThuChi.form.nguoiNopNhanChi')
                }
                icon={User}
                {...register('nguoi_nop_nhan')}
                error={errors.nguoi_nop_nhan?.message}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('quy.soThuChi.form.sectionKhac')} icon={<FileText size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5 sm:col-span-2">
                  <Combobox
                    options={xaOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v == null ? '' : String(v))}
                    label={txt('quy.soThuChi.form.donVi')}
                    placeholder={txt('quy.soThuChi.form.donVi')}
                    error={errors.don_vi_id?.message}
                    icon={<MapPin size={14} />}
                    clearable
                    dropdownInPortal
                  />
                  <p className="text-xs text-muted-foreground m-0">
                    {txt('quy.soThuChi.form.donViHint')}
                  </p>
                </div>
              )}
            />

            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('quy.soThuChi.form.chungTuGoc')}
                icon={FileText}
                {...register('chung_tu_goc')}
                error={errors.chung_tu_goc?.message}
              />
              <p className="text-xs text-muted-foreground mt-1 m-0">
                {txt('quy.soThuChi.form.chungTuGocHint')}
              </p>
            </div>

            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('quy.soThuChi.form.ghiChu')}
                rows={3}
                icon={FileText}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default QuySoThuChiForm;
