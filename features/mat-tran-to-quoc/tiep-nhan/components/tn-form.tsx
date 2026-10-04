import React, { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Building2,
  CalendarDays,
  Coins,
  CreditCard,
  FileText,
  Gift,
  HandCoins,
  HandHeart,
  ListChecks,
  MapPin,
  Package,
  Plus,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import CurrencyInput from '@/components/ui/CurrencyInput';
import CheckboxGroup from '@/components/ui/CheckboxGroup';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useKhoDonViCuuTroList } from '../../don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { useKhoDotCuuTroList } from '../../dot-cuu-tro/hooks/use-kho-dot-cuu-tro';
import { useKhoPhamViViewer } from '../../danh-sach-kho/hooks/use-kho-pham-vi-viewer';
import { chuongTrinhChonDuocChoTiepNhan } from '../../dot-cuu-tro/utils/pham-vi-chuong-trinh';
import { TN_HINH_THUC_VALUES, TN_MUC_DICH, TN_PHU_LUC_MAX } from '../core/constants';
import { tiepNhanSchema, tiepNhanToFormInput, type TiepNhanFormInput, type TiepNhanFormValues } from '../core/schema';
import type { TiepNhanFull } from '../core/types';
import { useLuuTiepNhan, useTnPhieuKho } from '../hooks/use-tiep-nhan';
import { tongGiaTriTiepNhan } from '../utils/tong-gia-tri';
import { formatTnTien } from '../utils/column-display';

const FORM_ID = 'tn-form';
const HINH_THUC_OPTIONS = TN_HINH_THUC_VALUES.map((v) => ({ label: v, value: v }));
const MUC_DICH_OPTIONS = TN_MUC_DICH.map((m) => ({ value: m.value, label: m.label }));
const PHU_LUC_TRONG = { ho_ten: '', dia_chi: '', quan_he: '', noi_dung_gia_tri: '' };

const soTuChuoi = (s: string | undefined) => {
  const n = Number(String(s ?? '').trim());
  return Number.isFinite(n) ? n : 0;
};

interface Props {
  /** Bản đầy đủ khi sửa (đã có mục đích, phụ lục, phiếu kho gắn). */
  initialData?: TiepNhanFull | null;
  onClose: () => void;
}

const TnForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const luu = useLuuTiepNhan(() => onClose());
  const viewer = useKhoPhamViViewer('matTranTiepNhan');

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TiepNhanFormInput, unknown, TiepNhanFormValues>({
    defaultValues: tiepNhanToFormInput(null, getTodayISODate()),
    resolver: zodResolver(tiepNhanSchema) as Resolver<TiepNhanFormInput, unknown, TiepNhanFormValues>,
  });
  const phuLuc = useFieldArray({ control, name: 'phu_luc' });

  useEffect(() => {
    reset(tiepNhanToFormInput(initialData ?? null, getTodayISODate()));
  }, [initialData, reset]);

  const nhaTaiTroId = useWatch({ control, name: 'nha_tai_tro_id' });
  const phieuIds = useWatch({ control, name: 'phieu_ids' });
  const [soTien, gtcg, hvKhac] = useWatch({
    control,
    name: ['so_tien', 'giay_to_co_gia_gia_tri', 'hien_vat_khac_gia_tri'],
  });

  // ----- Danh mục -----
  const { data: nhaTaiTroRows = [] } = useKhoDonViCuuTroList();
  const nhaTaiTroOptions = useMemo(
    () =>
      [...nhaTaiTroRows]
        .sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
        .map((d) => ({ label: d.ten, value: d.id, subLabel: d.loai_label })),
    [nhaTaiTroRows],
  );
  const { data: chuongTrinhRows = [] } = useKhoDotCuuTroList();
  // "Chỉ hiện chương trình đang triển khai do đơn vị mình tạo" — giữ chương trình cũ khi sửa.
  const chuongTrinhOptions = useMemo(
    () =>
      chuongTrinhChonDuocChoTiepNhan(chuongTrinhRows, viewer, initialData?.chuong_trinh_id).map((c) => ({
        label: c.ten,
        value: c.id,
        subLabel: c.don_vi_chu_tri_label,
      })),
    [chuongTrinhRows, viewer, initialData?.chuong_trinh_id],
  );

  // ----- Phiếu nhập kho của nhà tài trợ -----
  const { data: phieuRows = [], isLoading: phieuLoading } = useTnPhieuKho(nhaTaiTroId || null);
  const phieuChonDuoc = useMemo(
    () => phieuRows.filter((p) => !p.tiep_nhan_id || p.tiep_nhan_id === initialData?.id),
    [phieuRows, initialData?.id],
  );
  const phieuDaGanNoiKhac = useMemo(
    () => phieuRows.filter((p) => p.tiep_nhan_id && p.tiep_nhan_id !== initialData?.id),
    [phieuRows, initialData?.id],
  );
  const phieuOptions = useMemo(
    () =>
      phieuChonDuoc.map((p) => ({
        value: p.phieu_id,
        label: [p.so_phieu, p.ngay_phieu.split('-').reverse().join('/'), p.ten_kho, formatTnTien(p.tong_tien)]
          .filter(Boolean)
          .join(' · '),
      })),
    [phieuChonDuoc],
  );
  const giaTriPhieuKho = useMemo(() => {
    const chon = new Set(phieuIds);
    return phieuRows.filter((p) => chon.has(p.phieu_id)).reduce((s, p) => s + p.tong_tien, 0);
  }, [phieuRows, phieuIds]);

  // Giá trị phiếu kho là số tự tính — đưa vào form để zod kiểm "khoản có giá trị".
  useEffect(() => {
    setValue('gia_tri_phieu_kho', giaTriPhieuKho);
  }, [giaTriPhieuKho, setValue]);

  const tong = tongGiaTriTiepNhan({
    so_tien: soTuChuoi(soTien),
    giay_to_co_gia_gia_tri: soTuChuoi(gtcg),
    hien_vat_khac_gia_tri: soTuChuoi(hvKhac),
    gia_tri_phieu_kho: giaTriPhieuKho,
  });

  const onSubmit: SubmitHandler<TiepNhanFormValues> = (data) => {
    luu.mutate({ id: initialData?.id ?? null, data });
  };

  const tienInput = (name: 'so_tien' | 'giay_to_co_gia_gia_tri' | 'hien_vat_khac_gia_tri', label: string) => (
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
          error={errors[name]?.message}
        />
      )}
    />
  );

  const pending = isSubmitting || luu.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<HandCoins size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranTiepNhan.form.editSubtitle')} · ${initialData.so_phieu}`
          : txt('matTranTiepNhan.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<HandCoins className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranTiepNhan.form.sectionChung')} icon={<HandHeart size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="nha_tai_tro_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranTiepNhan.store.nhaTaiTroCol')}
                    icon={Building2}
                    options={nhaTaiTroOptions}
                    value={field.value}
                    onChange={(v) => {
                      const next = v == null ? '' : String(v);
                      // Phiếu kho phải cùng nhà tài trợ — đổi nhà tài trợ thì bỏ phiếu đã chọn.
                      if (next !== field.value) setValue('phieu_ids', [], { shouldDirty: true });
                      field.onChange(next);
                    }}
                    placeholder={txt('matTranTiepNhan.form.nhaTaiTroPlaceholder')}
                    required
                    dropdownInPortal
                    error={errors.nha_tai_tro_id?.message}
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="chuong_trinh_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranTiepNhan.store.chuongTrinhCol')}
                    icon={HandHeart}
                    options={chuongTrinhOptions}
                    value={field.value}
                    onChange={(v) => field.onChange(v == null ? '' : String(v))}
                    required
                    dropdownInPortal
                    error={errors.chuong_trinh_id?.message}
                  />
                )}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {chuongTrinhOptions.length === 0
                  ? txt('matTranTiepNhan.form.chuongTrinhTrong')
                  : txt('matTranTiepNhan.form.chuongTrinhHint')}
              </p>
            </div>
            <Input
              type="date"
              label={txt('matTranTiepNhan.form.ngay')}
              icon={CalendarDays}
              required
              {...register('ngay_tiep_nhan')}
              error={errors.ngay_tiep_nhan?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranTiepNhan.form.sectionTien')} icon={<Coins size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="hinh_thuc"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTiepNhan.form.hinhThuc')}
                  icon={CreditCard}
                  options={HINH_THUC_OPTIONS}
                  value={field.value}
                  onChange={(v) => field.onChange(v == null ? '' : String(v))}
                  required={soTuChuoi(soTien) > 0}
                  error={errors.hinh_thuc?.message}
                />
              )}
            />
            {tienInput('so_tien', txt('matTranTiepNhan.form.soTien'))}
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranTiepNhan.form.sectionHienVat')} icon={<Package size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              {!nhaTaiTroId ? (
                <p className="text-sm text-muted-foreground">{txt('matTranTiepNhan.form.phieuKhoChonNhaTaiTro')}</p>
              ) : phieuLoading ? (
                <p className="text-sm text-muted-foreground">{txt('common.loading')}</p>
              ) : phieuOptions.length === 0 && phieuDaGanNoiKhac.length === 0 ? (
                <p className="text-sm text-muted-foreground">{txt('matTranTiepNhan.form.phieuKhoTrong')}</p>
              ) : (
                <Controller
                  name="phieu_ids"
                  control={control}
                  render={({ field }) => (
                    <CheckboxGroup
                      label={txt('matTranTiepNhan.form.phieuKhoLabel')}
                      labelIcon={<Package size={12} />}
                      options={phieuOptions}
                      value={field.value}
                      onChange={field.onChange}
                      cols={1}
                    />
                  )}
                />
              )}
              {phieuDaGanNoiKhac.length > 0 ? (
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {phieuDaGanNoiKhac.map((p) => (
                    <li key={p.phieu_id} className="line-through decoration-muted-foreground/40">
                      {p.so_phieu} · {formatTnTien(p.tong_tien)} —{' '}
                      <span className="no-underline">
                        {txt('matTranTiepNhan.form.phieuKhoDaGan', { soPhieu: p.so_phieu_tiep_nhan ?? '' })}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="mt-1.5 text-xs text-muted-foreground">
                {giaTriPhieuKho > 0
                  ? txt('matTranTiepNhan.form.phieuKhoTong', { tien: formatTnTien(giaTriPhieuKho) })
                  : txt('matTranTiepNhan.form.phieuKhoHint')}
              </p>
            </div>
            <Input
              label={txt('matTranTiepNhan.form.hienVatKhacMoTa')}
              icon={Gift}
              placeholder={txt('matTranTiepNhan.form.hienVatKhacMoTaPlaceholder')}
              {...register('hien_vat_khac_mo_ta')}
              error={errors.hien_vat_khac_mo_ta?.message}
            />
            {tienInput('hien_vat_khac_gia_tri', txt('matTranTiepNhan.form.hienVatKhacGiaTri'))}
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranTiepNhan.form.sectionGiayTo')} icon={<FileText size={14} />}>
          <FormGrid cols={2}>
            <Input
              label={txt('matTranTiepNhan.form.giayToMoTa')}
              icon={FileText}
              placeholder={txt('matTranTiepNhan.form.giayToMoTaPlaceholder')}
              {...register('giay_to_co_gia_mo_ta')}
              error={errors.giay_to_co_gia_mo_ta?.message}
            />
            {tienInput('giay_to_co_gia_gia_tri', txt('matTranTiepNhan.form.giayToGiaTri'))}
          </FormGrid>
        </FormSection>

        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium">{txt('matTranTiepNhan.form.tongGiaTri')}</span>
          <span className="text-base font-semibold tabular-nums">{formatTnTien(tong) || '0 đ'}</span>
        </div>

        <FormSection title={txt('matTranTiepNhan.form.sectionMucDich')} icon={<ListChecks size={14} />}>
          <Controller
            name="muc_dich"
            control={control}
            render={({ field }) => (
              <CheckboxGroup options={MUC_DICH_OPTIONS} value={field.value} onChange={field.onChange} cols={1} />
            )}
          />
        </FormSection>

        <FormSection title={txt('matTranTiepNhan.form.sectionPhuLuc')} icon={<Users size={14} />}>
          <p className="mb-3 text-xs text-muted-foreground">{txt('matTranTiepNhan.form.phuLucHint')}</p>
          <div className="space-y-3">
            {phuLuc.fields.map((row, i) => (
              <div key={row.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">#{i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => phuLuc.remove(i)}
                    className="h-7 px-2 text-rose-600 hover:bg-rose-50"
                    aria-label={txt('common.delete')}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <FormGrid cols={2}>
                  <Input label={txt('matTranTiepNhan.form.phuLucHoTen')} {...register(`phu_luc.${i}.ho_ten`)} />
                  <Input label={txt('matTranTiepNhan.form.phuLucDiaChi')} {...register(`phu_luc.${i}.dia_chi`)} />
                  <Input label={txt('matTranTiepNhan.form.phuLucQuanHe')} {...register(`phu_luc.${i}.quan_he`)} />
                  <Input label={txt('matTranTiepNhan.form.phuLucNoiDung')} {...register(`phu_luc.${i}.noi_dung_gia_tri`)} />
                </FormGrid>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={phuLuc.fields.length >= TN_PHU_LUC_MAX}
              onClick={() => phuLuc.append({ ...PHU_LUC_TRONG })}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {txt('matTranTiepNhan.form.phuLucThem')}
            </Button>
            {errors.phu_luc?.message ? <p className="text-xs text-destructive">{errors.phu_luc.message}</p> : null}
          </div>
        </FormSection>

        <FormSection title={txt('matTranTiepNhan.form.sectionKhac')} icon={<StickyNote size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input label={txt('matTranTiepNhan.form.diaDiemLap')} icon={MapPin} {...register('dia_diem_lap')} />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea label={txt('matTranTiepNhan.form.ghiChu')} icon={StickyNote} rows={3} {...register('ghi_chu')} />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default TnForm;
