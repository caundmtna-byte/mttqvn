import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Calculator, Coins, Hash, Package, Ruler, StickyNote } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import NumericFormatInput from '@/components/ui/NumericFormatInput';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { DRAWER_WIDTH_STACKED } from '@/lib/dialog-sizes';
import { formatCurrency, formatDecimal } from '@/lib/utils';
import { nhapXuatKhoCtLineSchema, type NhapXuatKhoCtLineFormValues } from '../core/schema';

export const NHAP_XUAT_KHO_CT_EMPTY_LINE: NhapXuatKhoCtLineFormValues = {
  id: undefined,
  hang_hoa_id: '',
  don_vi_tinh: '',
  so_luong: '',
  don_gia: '',
  ghi_chu: undefined,
};

export interface NhapXuatKhoLineHangHoaOption {
  label: string;
  value: string;
  don_vi_tinh: string;
}

export interface NhapXuatKhoLineTonInfo {
  /** Tồn hiện tại của hang_hoa_id tại kho_xuat đã chọn (chưa trừ dòng đang sửa). */
  available: number;
  /** Số lượng đang được dùng trong các dòng khác của phiếu (cùng hang_hoa_id). */
  usedByOtherLines: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialLine: NhapXuatKhoCtLineFormValues;
  hangHoaOptions: NhapXuatKhoLineHangHoaOption[];
  /** Đơn giá gần nhất theo hang_hoa_id (lần nhập gần nhất). */
  lastDonGia?: Map<string, number>;
  /** Khi loại phiếu = xuất ra ngoài hoặc chuyển kho — kiểm tra tồn kho của kho xuất. */
  needCheckTonKho: boolean;
  /** Lookup tồn kho theo hang_hoa_id (đã trừ usedByOtherLines). Trả null khi chưa biết. */
  getTonInfo?: (hangHoaId: string) => NhapXuatKhoLineTonInfo | null;
  /** Đang tải tồn kho (chưa có data). */
  tonKhoLoading?: boolean;
  isSubmitting?: boolean;
  onSave: (values: NhapXuatKhoCtLineFormValues) => void;
  stackLevel?: number;
}

const FORM_ID = 'kho-nhap-xuat-kho-ct-line-form';

const NhapXuatKhoCtLineDrawer: React.FC<Props> = ({
  open,
  onClose,
  mode,
  initialLine,
  hangHoaOptions,
  lastDonGia,
  needCheckTonKho,
  getTonInfo,
  tonKhoLoading = false,
  onSave,
  isSubmitting = false,
  stackLevel = 1,
}) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NhapXuatKhoCtLineFormValues>({
    resolver: zodResolver(nhapXuatKhoCtLineSchema) as Resolver<NhapXuatKhoCtLineFormValues>,
    defaultValues: NHAP_XUAT_KHO_CT_EMPTY_LINE,
  });

  useEffect(() => {
    if (!open) return;
    reset({
      ...NHAP_XUAT_KHO_CT_EMPTY_LINE,
      ...initialLine,
      id: initialLine.id,
      hang_hoa_id: initialLine.hang_hoa_id ?? '',
      don_vi_tinh: initialLine.don_vi_tinh ?? '',
      so_luong: initialLine.so_luong ?? '',
      don_gia: initialLine.don_gia ?? '',
      ghi_chu: initialLine.ghi_chu,
    });
  }, [open, initialLine, reset]);

  const watchedHangHoaId = watch('hang_hoa_id');
  const watchedSoLuong = watch('so_luong');
  const watchedDonGia = watch('don_gia');

  const autoFilledDonGia = useMemo(() => {
    const id = (watchedHangHoaId ?? '').trim();
    if (!id || !lastDonGia) return false;
    const last = lastDonGia.get(id);
    if (last == null || last <= 0) return false;
    const current = watchedDonGia.trim() === '' ? 0 : Number(watchedDonGia);
    return Number.isFinite(current) && current === last;
  }, [watchedHangHoaId, watchedDonGia, lastDonGia]);

  const thanhTien = useMemo(() => {
    const sl = Number(watchedSoLuong);
    const dg = watchedDonGia.trim() === '' ? 0 : Number(watchedDonGia);
    if (!Number.isFinite(sl) || !Number.isFinite(dg)) return 0;
    return sl * dg;
  }, [watchedSoLuong, watchedDonGia]);

  const tonInfo = useMemo(() => {
    if (!needCheckTonKho || !getTonInfo) return null;
    const id = (watchedHangHoaId ?? '').trim();
    if (!id) return null;
    return getTonInfo(id);
  }, [needCheckTonKho, getTonInfo, watchedHangHoaId]);

  const tonHelper = useMemo(() => {
    if (!needCheckTonKho) return undefined;
    if (tonKhoLoading) return txt('matTranNhapXuatKho.form.tonKhoLoading');
    if (!watchedHangHoaId?.trim()) return txt('matTranNhapXuatKho.form.tonKhoMissing');
    if (tonInfo == null) return txt('matTranNhapXuatKho.form.tonKhoMissing');
    return txt('matTranNhapXuatKho.form.tonKhoCurrent', { value: formatDecimal(tonInfo.available) });
  }, [needCheckTonKho, tonKhoLoading, watchedHangHoaId, tonInfo]);

  const overflow = useMemo(() => {
    if (!needCheckTonKho || !tonInfo) return false;
    const sl = Number(watchedSoLuong);
    if (!Number.isFinite(sl)) return false;
    return sl > tonInfo.available;
  }, [needCheckTonKho, tonInfo, watchedSoLuong]);

  const onSubmit: SubmitHandler<NhapXuatKhoCtLineFormValues> = (data) => {
    onSave(data);
    onClose();
  };

  if (!open) return null;

  return (
    <GenericDrawer
      stackLevel={stackLevel}
      maxWidthClass={DRAWER_WIDTH_STACKED}
      onClose={onClose}
      title={
        mode === 'add'
          ? txt('matTranNhapXuatKho.form.addLine')
          : `${txt('common.edit')} · ${txt('matTranNhapXuatKho.form.hangHoa')}`
      }
      icon={<Package size={18} />}
      subtitle={txt('matTranNhapXuatKho.form.sectionChiTiet')}
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={isSubmitting}
          isEdit={mode === 'edit'}
          compact
          createIcon={<Package className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormSection title={txt('matTranNhapXuatKho.form.sectionChiTiet')} icon={<Package size={14} />} variant="primary">
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="hang_hoa_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranNhapXuatKho.form.hangHoa')}
                    options={hangHoaOptions.map((o) => ({ label: o.label, value: o.value, subLabel: o.don_vi_tinh }))}
                    value={field.value}
                    onChange={(v) => {
                      const id = String(v ?? '');
                      field.onChange(id);
                      const opt = hangHoaOptions.find((o) => o.value === id);
                      if (opt) setValue('don_vi_tinh', opt.don_vi_tinh, { shouldDirty: true, shouldValidate: true });
                      const currentDonGia = watch('don_gia');
                      if ((currentDonGia ?? '').trim() === '' && lastDonGia) {
                        const last = lastDonGia.get(id);
                        if (last != null && last > 0) {
                          setValue('don_gia', String(last), { shouldDirty: true, shouldValidate: true });
                        }
                      }
                    }}
                    error={errors.hang_hoa_id?.message}
                    icon={<Package size={12} />}
                    required
                    dropdownInPortal
                  />
                )}
              />
            </div>
            <Input
              label={txt('matTranNhapXuatKho.form.donViTinh')}
              icon={<Ruler size={12} />}
              {...register('don_vi_tinh')}
              error={errors.don_vi_tinh?.message}
              required
            />
            <div>
              <Controller
                name="so_luong"
                control={control}
                render={({ field }) => (
                  <NumericFormatInput
                    label={txt('matTranNhapXuatKho.form.soLuong')}
                    icon={<Hash size={12} />}
                    value={field.value === '' ? 0 : Number(field.value)}
                    onChange={(n) => field.onChange(n === 0 ? '' : String(n))}
                    onBlur={field.onBlur}
                    decimalScale={3}
                    min={0}
                    required
                    error={
                      errors.so_luong?.message ??
                      (overflow && tonInfo
                        ? txt('matTranNhapXuatKho.form.tonKhoNotEnough', {
                            available: formatDecimal(tonInfo.available),
                          })
                        : undefined)
                    }
                  />
                )}
              />
              {tonHelper ? <p className="mt-1 text-xs text-muted-foreground tabular-nums">{tonHelper}</p> : null}
            </div>
            <Controller
              name="don_gia"
              control={control}
              render={({ field }) => (
                <div>
                  <CurrencyInput
                    label={txt('matTranNhapXuatKho.form.donGia')}
                    icon={<Coins size={12} />}
                    suffix=""
                    value={field.value === '' ? 0 : Number(field.value)}
                    onChange={(n) => field.onChange(n === 0 ? '' : String(n))}
                    error={errors.don_gia?.message}
                  />
                  {autoFilledDonGia ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {txt('matTranNhapXuatKho.form.donGiaAutoHint')}
                    </p>
                  ) : null}
                </div>
              )}
            />
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm">
              <Calculator size={14} className="text-primary/70" aria-hidden />
              <span className="text-muted-foreground">{txt('matTranNhapXuatKho.form.thanhTien')}:</span>
              <span className="ml-auto tabular-nums font-semibold text-foreground">
                {thanhTien > 0 ? formatCurrency(thanhTien) : '—'}
              </span>
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranNhapXuatKho.form.chiTietGhiChu')}
                icon={<StickyNote size={12} />}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
              />
            </div>
            {overflow && tonInfo ? (
              <div className={`${FORM_GRID_SPAN_FULL} flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300`}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden />
                <span>
                  {txt('matTranNhapXuatKho.form.tonKhoNotEnough', { available: formatDecimal(tonInfo.available) })}
                </span>
              </div>
            ) : null}
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default NhapXuatKhoCtLineDrawer;
