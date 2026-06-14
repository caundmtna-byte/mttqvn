import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useForm,
  Controller,
  useFieldArray,
  useWatch,
  type Resolver,
  type SubmitHandler,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  Calendar,
  Calculator,
  Coins,
  Edit,
  FileText,
  HandHeart,
  Hash,
  Package,
  Plus,
  Ruler,
  StickyNote,
  Tag,
  Trash2,
  User,
  Warehouse,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import Button from '@/components/ui/Button';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { TableRowIconButton } from '@/components/shared/row-actions';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE } from '@/lib/button-labels';
import { formatCurrency, formatDecimal } from '@/lib/utils';
import { useCan } from '@/hooks/use-can';
import { useKhoDanhSachKhoList } from '@/features/mat-tran-to-quoc/danh-sach-kho/hooks/use-kho-danh-sach-kho';
import { useKhoDonViCuuTroList } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { useKhoDotCuuTroList } from '@/features/mat-tran-to-quoc/dot-cuu-tro/hooks/use-kho-dot-cuu-tro';
import { useKhoDanhSachHangHoaList } from '@/features/mat-tran-to-quoc/hang-hoa/hooks/use-kho-danh-sach-hang-hoa';
import { nhapXuatKhoFormSchema, type NhapXuatKhoCtLineFormValues, type NhapXuatKhoFormValues } from '../core/schema';
import { NHAP_XUAT_KHO_LOAI_PHIEU, type NhapXuatKhoLoaiPhieu } from '../core/constants';
import type { NhapXuatKhoDetail } from '../core/types';
import { useCreateNhapXuatKho, useUpdateNhapXuatKho, useTonKhoByKho, useLastDonGiaMap } from '../hooks/use-kho-nhap-xuat-kho';
import NhapXuatKhoCtLineDrawer, {
  NHAP_XUAT_KHO_CT_EMPTY_LINE,
  type NhapXuatKhoLineHangHoaOption,
} from './kho-nhap-xuat-kho-ct-line-drawer';

const FORM_ID = 'kho-nhap-xuat-kho-form';

const DEFAULT_VALUES: NhapXuatKhoFormValues = {
  loai_phieu: 'nhap_ngoai',
  ngay_phieu: new Date().toISOString().slice(0, 10),
  kho_xuat_id: undefined,
  kho_nhap_id: undefined,
  don_vi_cuu_tro_id: undefined,
  dot_cuu_tro_id: undefined,
  ghi_chu: undefined,
  nguoi_giao_nhan: undefined,
  bo_phan: undefined,
  chung_tu_goc: undefined,
  chi_tiet: [],
};

interface Props {
  initialData?: NhapXuatKhoDetail | null;
  onClose: () => void;
}

type LineDrawerState = null | { mode: 'add' } | { mode: 'edit'; index: number };

interface ChiTietGridRow extends NhapXuatKhoCtLineFormValues {
  rowIndex: number;
  rowKey: string;
  tenHangHoa: string;
}

const CHI_TIET_TABLE_CLASS = 'min-w-[60rem]';
const CELL_NOWRAP = 'whitespace-nowrap align-top';

function chiTietCellClass(extra: string) {
  return `${CELL_NOWRAP} ${extra}`;
}

const NhapXuatKhoForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const confirm = useConfirmStore((s) => s.confirm);
  const createMutation = useCreateNhapXuatKho(onClose);
  const updateMutation = useUpdateNhapXuatKho(onClose);

  const canViewKho = useCan('view', 'matTranReliefWarehouseList');
  const canViewDvi = useCan('view', 'matTranReliefSupportUnits');
  const canViewDot = useCan('view', 'matTranReliefCampaign');
  const canViewHh = useCan('view', 'matTranReliefGoods');

  const { data: khoRows = [] } = useKhoDanhSachKhoList({ enabled: canViewKho });
  const { data: dviRows = [] } = useKhoDonViCuuTroList({ enabled: canViewDvi });
  const { data: dotRows = [] } = useKhoDotCuuTroList({ enabled: canViewDot });
  const { data: hhRows = [] } = useKhoDanhSachHangHoaList({ enabled: canViewHh });
  const { data: lastDonGiaMap } = useLastDonGiaMap();

  const [lineDrawer, setLineDrawer] = useState<LineDrawerState>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<NhapXuatKhoFormValues>({
    resolver: zodResolver(nhapXuatKhoFormSchema) as Resolver<NhapXuatKhoFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'chi_tiet' });
  const watchedChiTiet = useWatch({ control, name: 'chi_tiet' }) ?? [];
  const watchedLoaiPhieu = useWatch({ control, name: 'loai_phieu' });
  const watchedKhoXuatId = useWatch({ control, name: 'kho_xuat_id' });

  /** Khi đổi loại phiếu — clear các trường không hợp lệ với loại đó (giữ chi tiết). */
  useEffect(() => {
    switch (watchedLoaiPhieu) {
      case 'nhap_ngoai':
        setValue('kho_xuat_id', undefined);
        setValue('dot_cuu_tro_id', undefined);
        break;
      case 'xuat_ngoai':
        setValue('kho_nhap_id', undefined);
        setValue('don_vi_cuu_tro_id', undefined);
        break;
      case 'chuyen_kho':
        setValue('don_vi_cuu_tro_id', undefined);
        setValue('dot_cuu_tro_id', undefined);
        break;
    }
  }, [watchedLoaiPhieu, setValue]);

  const needCheckTonKho = watchedLoaiPhieu === 'xuat_ngoai' || watchedLoaiPhieu === 'chuyen_kho';
  const tonKhoQuery = useTonKhoByKho(watchedKhoXuatId ?? null, { enabled: needCheckTonKho });
  const tonKhoMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of tonKhoQuery.data ?? []) map.set(r.hang_hoa_id, r.ton_kho);
    return map;
  }, [tonKhoQuery.data]);

  useEffect(() => {
    if (initialData) {
      reset({
        loai_phieu: initialData.loai_phieu,
        ngay_phieu: initialData.ngay_phieu,
        kho_xuat_id: initialData.kho_xuat_id ?? undefined,
        kho_nhap_id: initialData.kho_nhap_id ?? undefined,
        don_vi_cuu_tro_id: initialData.don_vi_cuu_tro_id ?? undefined,
        dot_cuu_tro_id: initialData.dot_cuu_tro_id ?? undefined,
        ghi_chu: initialData.ghi_chu ?? undefined,
        nguoi_giao_nhan: initialData.nguoi_giao_nhan ?? undefined,
        bo_phan: initialData.bo_phan ?? undefined,
        chung_tu_goc: initialData.chung_tu_goc ?? undefined,
        chi_tiet: initialData.chi_tiet.map((c) => ({
          id: c.id,
          hang_hoa_id: c.hang_hoa_id,
          don_vi_tinh: c.don_vi_tinh,
          so_luong: String(c.so_luong),
          don_gia: String(c.don_gia),
          ghi_chu: c.ghi_chu ?? undefined,
        })),
      });
    } else {
      reset({ ...DEFAULT_VALUES });
    }
  }, [initialData, reset]);

  // ----- Lookup options (memoized, sorted) -----
  const loaiOpts = useMemo(
    () =>
      NHAP_XUAT_KHO_LOAI_PHIEU.map((v) => ({
        label: txt(`matTranNhapXuatKho.loaiPhieu.${v}`),
        value: v,
      })),
    [],
  );

  const khoOpts = useMemo(
    () =>
      [...khoRows]
        .sort((a, b) => a.ten_kho.localeCompare(b.ten_kho, 'vi'))
        .map((k) => ({ label: k.ten_kho, value: k.id, subLabel: k.ten_don_vi ?? undefined })),
    [khoRows],
  );

  const dviOpts = useMemo(
    () =>
      [...dviRows]
        .sort((a, b) => a.ten.localeCompare(b.ten, 'vi'))
        .map((d) => ({ label: d.ten, value: d.id, subLabel: d.loai_label })),
    [dviRows],
  );

  const dotOpts = useMemo(
    () => [...dotRows].sort((a, b) => a.ten.localeCompare(b.ten, 'vi')).map((d) => ({ label: d.ten, value: d.id })),
    [dotRows],
  );

  const hangHoaOptions = useMemo<NhapXuatKhoLineHangHoaOption[]>(
    () =>
      [...hhRows]
        .filter((h) => h.trang_thai !== 'Ngừng hoạt động')
        .sort((a, b) => a.ten_hang_hoa.localeCompare(b.ten_hang_hoa, 'vi'))
        .map((h) => ({
          label: `${h.ten_danh_muc_nhom} · ${h.ten_hang_hoa}`,
          value: h.id,
          don_vi_tinh: h.don_vi_tinh,
        })),
    [hhRows],
  );

  const loaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      nhap_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.nhap_ngoai'), color: 'emerald' },
      xuat_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.xuat_ngoai'), color: 'rose' },
      chuyen_kho: { label: txt('matTranNhapXuatKho.loaiPhieu.chuyen_kho'), color: 'sky' },
    };
  }, []);

  // ----- Grid rows -----
  const gridRows: ChiTietGridRow[] = useMemo(
    () =>
      fields.map((field, i) => {
        const line = watchedChiTiet[i] ?? NHAP_XUAT_KHO_CT_EMPTY_LINE;
        const opt = hangHoaOptions.find((o) => o.value === (line.hang_hoa_id ?? ''));
        const tenHangHoa = opt?.label ?? (line.hang_hoa_id ? `#${line.hang_hoa_id}` : txt('common.emptyCell'));
        return {
          ...line,
          rowIndex: i,
          rowKey: field.id,
          tenHangHoa,
        };
      }),
    [fields, watchedChiTiet, hangHoaOptions],
  );

  /** Tổng thành tiền + số dòng vượt tồn kho. */
  const totals = useMemo(() => {
    let tongTien = 0;
    let overflows = 0;
    for (const r of watchedChiTiet) {
      const sl = Number(r?.so_luong ?? 0);
      const dg = (r?.don_gia ?? '').trim() === '' ? 0 : Number(r.don_gia);
      if (Number.isFinite(sl) && Number.isFinite(dg)) tongTien += sl * dg;
      if (needCheckTonKho && r?.hang_hoa_id) {
        const ton = tonKhoMap.get(r.hang_hoa_id);
        if (ton != null && Number.isFinite(sl) && sl > ton) overflows += 1;
      }
    }
    return { tongTien, overflows };
  }, [watchedChiTiet, needCheckTonKho, tonKhoMap]);

  // ----- Handlers -----
  const openAddLine = useCallback(() => setLineDrawer({ mode: 'add' }), []);
  const openEditLine = useCallback((index: number) => setLineDrawer({ mode: 'edit', index }), []);

  const handleRemoveLine = useCallback(
    (index: number) => {
      if (fields.length <= 1) {
        toast.warning(txt('matTranNhapXuatKho.form.cannotDeleteLast'));
        return;
      }
      confirm({
        title: txt('matTranNhapXuatKho.form.deleteLineTitle'),
        message: txt('matTranNhapXuatKho.form.deleteLineMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: () => remove(index),
      });
    },
    [confirm, fields.length, remove],
  );

  const handleLineDrawerSave = useCallback(
    (values: NhapXuatKhoCtLineFormValues) => {
      if (!lineDrawer) return;
      if (lineDrawer.mode === 'add') append(values);
      else update(lineDrawer.index, values);
    },
    [append, update, lineDrawer],
  );

  const lineDrawerInitial = useMemo(() => {
    if (!lineDrawer) return NHAP_XUAT_KHO_CT_EMPTY_LINE;
    if (lineDrawer.mode === 'add') return NHAP_XUAT_KHO_CT_EMPTY_LINE;
    const row = watchedChiTiet[lineDrawer.index];
    return row ? { ...NHAP_XUAT_KHO_CT_EMPTY_LINE, ...row } : NHAP_XUAT_KHO_CT_EMPTY_LINE;
  }, [lineDrawer, watchedChiTiet]);

  const getTonInfoForLine = useCallback(
    (hangHoaId: string) => {
      if (!needCheckTonKho) return null;
      const total = tonKhoMap.get(hangHoaId);
      if (total == null) return null;
      const editingIndex = lineDrawer?.mode === 'edit' ? lineDrawer.index : -1;
      let usedByOtherLines = 0;
      watchedChiTiet.forEach((line, i) => {
        if (!line || i === editingIndex) return;
        if (line.hang_hoa_id !== hangHoaId) return;
        const sl = Number(line.so_luong ?? 0);
        if (Number.isFinite(sl)) usedByOtherLines += sl;
      });
      return { available: total - usedByOtherLines, usedByOtherLines };
    },
    [needCheckTonKho, tonKhoMap, watchedChiTiet, lineDrawer],
  );

  const onSubmit: SubmitHandler<NhapXuatKhoFormValues> = (data) => {
    if (totals.overflows > 0) {
      toast.error(txt('matTranNhapXuatKho.service.tonKhoKhongDu'));
      return;
    }
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;
  const chiErrors = errors.chi_tiet;

  return (
    <>
      <GenericDrawer
        onClose={onClose}
        title={isEdit ? txt('common.edit') : txt('common.create')}
        maxWidthClass={DRAWER_WIDTH_FORM}
        icon={<ArrowLeftRight size={18} />}
        subtitle={
          isEdit && initialData
            ? `${txt('matTranNhapXuatKho.form.editSubtitle')} · ${initialData.so_phieu}`
            : txt('matTranNhapXuatKho.form.createSubtitle')
        }
        footer={
          <FormDrawerFooter
            formId={FORM_ID}
            onCancel={onClose}
            isLoading={pending}
            isEdit={isEdit}
            compact
            createIcon={<ArrowLeftRight className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
          />
        }
        footerCompact
      >
        <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Loại phiếu */}
          <FormSection title={txt('matTranNhapXuatKho.form.sectionLoai')} icon={<Tag size={14} />} variant="primary">
            <FormGrid>
              <Controller
                name="loai_phieu"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranNhapXuatKho.form.sectionLoai')}
                    options={loaiOpts}
                    value={field.value}
                    onChange={(v) => field.onChange(String(v) as NhapXuatKhoLoaiPhieu)}
                    error={errors.loai_phieu?.message}
                    icon={<Tag size={12} />}
                    required
                    clearable={false}
                    dropdownInPortal
                  />
                )}
              />
              <Input
                label={txt('matTranNhapXuatKho.form.ngayPhieu')}
                type="date"
                icon={<Calendar size={12} />}
                {...register('ngay_phieu')}
                error={errors.ngay_phieu?.message}
                required
              />
              <div className={FORM_GRID_SPAN_FULL}>
                <p className="text-xs text-muted-foreground">
                  <EnumBadge value={watchedLoaiPhieu} config={loaiBadge} shape="pill" />{' '}
                  {isEdit && initialData
                    ? `· ${txt('matTranNhapXuatKho.form.soPhieu')}: ${initialData.so_phieu}`
                    : `· ${txt('matTranNhapXuatKho.form.soPhieuHintAuto')}`}
                </p>
              </div>
            </FormGrid>
          </FormSection>

          {/* Conditional fields theo loai_phieu */}
          <FormSection
            title={txt('matTranNhapXuatKho.form.sectionMain')}
            icon={<FileText size={14} />}
            variant="primary"
          >
            <FormGrid>
              {(watchedLoaiPhieu === 'nhap_ngoai') && (
                <Controller
                  name="don_vi_cuu_tro_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      label={txt('matTranNhapXuatKho.form.donViCuuTro')}
                      options={dviOpts}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                      error={errors.don_vi_cuu_tro_id?.message}
                      icon={<Building2 size={12} />}
                      required
                      dropdownInPortal
                    />
                  )}
                />
              )}
              {(watchedLoaiPhieu === 'xuat_ngoai' || watchedLoaiPhieu === 'chuyen_kho') && (
                <Controller
                  name="kho_xuat_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      label={txt('matTranNhapXuatKho.form.khoXuat')}
                      options={khoOpts}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                      error={errors.kho_xuat_id?.message}
                      icon={<Warehouse size={12} />}
                      required
                      dropdownInPortal
                    />
                  )}
                />
              )}
              {(watchedLoaiPhieu === 'nhap_ngoai' || watchedLoaiPhieu === 'chuyen_kho') && (
                <Controller
                  name="kho_nhap_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      label={txt('matTranNhapXuatKho.form.khoNhap')}
                      options={khoOpts}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                      error={errors.kho_nhap_id?.message}
                      icon={<Warehouse size={12} />}
                      required
                      dropdownInPortal
                    />
                  )}
                />
              )}
              {watchedLoaiPhieu === 'xuat_ngoai' && (
                <Controller
                  name="dot_cuu_tro_id"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      label={txt('matTranNhapXuatKho.form.dotCuuTro')}
                      options={dotOpts}
                      value={field.value ?? ''}
                      onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                      error={errors.dot_cuu_tro_id?.message}
                      icon={<HandHeart size={12} />}
                      required
                      dropdownInPortal
                    />
                  )}
                />
              )}
            </FormGrid>
          </FormSection>

          {/* Chi tiết hàng hóa */}
          <FormSection
            title={txt('matTranNhapXuatKho.form.sectionChiTiet')}
            icon={<Package size={14} />}
            variant="primary"
            headerRight={
              <Button type="button" variant="outline" size="sm" onClick={openAddLine} className="gap-1">
                <Plus className="w-4 h-4" />
                {txt('matTranNhapXuatKho.form.addLine')}
              </Button>
            }
          >
            {typeof chiErrors?.message === 'string' ? (
              <p className="text-sm text-destructive mb-2">{chiErrors.message}</p>
            ) : null}

            {gridRows.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-3">{txt('matTranNhapXuatKho.form.chiTietEmptyHint')}</p>
            ) : null}

            {needCheckTonKho && totals.overflows > 0 ? (
              <div className="flex items-center gap-2 mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle size={14} className="shrink-0" aria-hidden />
                <span>
                  {txt('matTranNhapXuatKho.service.tonKhoKhongDu')} ({totals.overflows} dòng)
                </span>
              </div>
            ) : null}

            <EmbeddedChildDataGrid<ChiTietGridRow>
              rows={gridRows}
              getRowKey={(r) => r.rowKey}
              maxVisibleBodyRows={8}
              tableClassName={CHI_TIET_TABLE_CLASS}
              onRowClick={(r) => openEditLine(r.rowIndex)}
              labelColumn={{
                minWidthClass: 'min-w-[16rem] w-[16rem]',
                header: (
                  <span className="inline-flex items-center gap-1.5">
                    <Package size={12} className="shrink-0 opacity-90" aria-hidden />
                    {txt('matTranNhapXuatKho.form.hangHoa')}
                  </span>
                ),
                renderCell: (r) => (
                  <span className={`inline-flex items-center gap-2 min-w-0 ${CELL_NOWRAP}`}>
                    <Package size={14} className="shrink-0 text-primary/70" aria-hidden />
                    <span className="font-medium text-foreground truncate">{r.tenHangHoa}</span>
                  </span>
                ),
                cellClassName: CELL_NOWRAP,
              }}
              columns={[
                {
                  id: 'don_vi_tinh',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Ruler size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranNhapXuatKho.form.donViTinh')}
                    </span>
                  ),
                  headerClassName: 'min-w-[5rem]',
                  cellClassName: chiTietCellClass('min-w-[5rem]'),
                  renderCell: (r) => (r.don_vi_tinh ? r.don_vi_tinh : txt('common.emptyCell')),
                },
                {
                  id: 'so_luong',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Hash size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranNhapXuatKho.form.soLuong')}
                    </span>
                  ),
                  headerClassName: 'min-w-[7rem] text-right',
                  cellClassName: chiTietCellClass('min-w-[7rem] text-right tabular-nums'),
                  renderCell: (r) => {
                    const sl = Number(r.so_luong);
                    const ton = needCheckTonKho && r.hang_hoa_id ? tonKhoMap.get(r.hang_hoa_id) : undefined;
                    const overflow = ton != null && Number.isFinite(sl) && sl > ton;
                    return (
                      <span className={overflow ? 'text-rose-600 font-semibold dark:text-rose-400' : ''}>
                        {Number.isFinite(sl) ? formatDecimal(sl) : '—'}
                        {overflow ? (
                          <AlertTriangle size={12} className="inline ml-1 -mt-0.5" aria-hidden />
                        ) : null}
                      </span>
                    );
                  },
                },
                {
                  id: 'don_gia',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Coins size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranNhapXuatKho.form.donGia')}
                    </span>
                  ),
                  headerClassName: 'min-w-[8rem] text-right',
                  cellClassName: chiTietCellClass('min-w-[8rem] text-right tabular-nums'),
                  renderCell: (r) => {
                    const dg = r.don_gia.trim() === '' ? 0 : Number(r.don_gia);
                    return Number.isFinite(dg) && dg > 0 ? formatCurrency(dg) : txt('common.emptyCell');
                  },
                },
                {
                  id: 'thanh_tien',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Calculator size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranNhapXuatKho.form.thanhTien')}
                    </span>
                  ),
                  headerClassName: 'min-w-[9rem] text-right',
                  cellClassName: chiTietCellClass('min-w-[9rem] text-right tabular-nums font-medium'),
                  renderCell: (r) => {
                    const sl = Number(r.so_luong);
                    const dg = r.don_gia.trim() === '' ? 0 : Number(r.don_gia);
                    if (!Number.isFinite(sl) || !Number.isFinite(dg)) return txt('common.emptyCell');
                    const v = sl * dg;
                    return v > 0 ? formatCurrency(v) : txt('common.emptyCell');
                  },
                },
                {
                  id: 'ghi_chu',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <StickyNote size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranNhapXuatKho.form.chiTietGhiChu')}
                    </span>
                  ),
                  headerClassName: 'min-w-[10rem]',
                  cellClassName: chiTietCellClass('min-w-[10rem]'),
                  renderCell: (r) => (r.ghi_chu?.trim() ? r.ghi_chu : txt('common.emptyCell')),
                },
              ]}
              actionsColumn={{
                header: txt('common.actions'),
                widthClass: 'w-[5.5rem] min-w-[5.5rem]',
                renderCell: (r) => (
                  <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <TableRowIconButton
                      icon={Edit}
                      label={txt('common.edit')}
                      size="compact"
                      variant="primary"
                      onClick={() => openEditLine(r.rowIndex)}
                    />
                    <TableRowIconButton
                      icon={Trash2}
                      label={txt('common.delete')}
                      size="compact"
                      variant="danger"
                      disabled={fields.length <= 1}
                      onClick={() => handleRemoveLine(r.rowIndex)}
                    />
                  </div>
                ),
              }}
            />

            {gridRows.length > 0 ? (
              <div className="mt-3 flex items-center justify-end gap-2 text-sm">
                <span className="text-muted-foreground">{txt('matTranNhapXuatKho.detail.tongTien')}:</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {totals.tongTien > 0 ? formatCurrency(totals.tongTien) : '—'}
                </span>
              </div>
            ) : null}
          </FormSection>

          <FormSection
            title={txt('matTranNhapXuatKho.form.sectionChungTu')}
            icon={<FileText size={14} />}
            variant="primary"
          >
            <FormGrid>
              <Input
                label={
                  watchedLoaiPhieu === 'xuat_ngoai'
                    ? txt('matTranNhapXuatKho.form.nguoiNhanHang')
                    : txt('matTranNhapXuatKho.form.nguoiGiaoHang')
                }
                icon={<User size={12} />}
                {...register('nguoi_giao_nhan')}
                error={errors.nguoi_giao_nhan?.message}
              />
              <Input
                label={txt('matTranNhapXuatKho.form.boPhan')}
                icon={<Building2 size={12} />}
                {...register('bo_phan')}
                error={errors.bo_phan?.message}
              />
              <div className={FORM_GRID_SPAN_FULL}>
                <Input
                  label={txt('matTranNhapXuatKho.form.chungTuGoc')}
                  icon={<FileText size={12} />}
                  {...register('chung_tu_goc')}
                  error={errors.chung_tu_goc?.message}
                />
              </div>
            </FormGrid>
          </FormSection>

          {/* Ghi chú */}
          <FormSection
            title={txt('matTranNhapXuatKho.form.sectionGhiChu')}
            icon={<StickyNote size={14} />}
            variant="primary"
          >
            <FormGrid>
              <div className={FORM_GRID_SPAN_FULL}>
                <Textarea
                  label={txt('matTranNhapXuatKho.form.ghiChu')}
                  rows={3}
                  icon={<StickyNote size={12} />}
                  {...register('ghi_chu')}
                  error={errors.ghi_chu?.message}
                />
              </div>
            </FormGrid>
          </FormSection>
        </form>
      </GenericDrawer>

      {lineDrawer ? (
        <NhapXuatKhoCtLineDrawer
          key={lineDrawer.mode === 'edit' ? `e-${lineDrawer.index}` : 'add'}
          open
          onClose={() => setLineDrawer(null)}
          mode={lineDrawer.mode}
          initialLine={lineDrawerInitial}
          hangHoaOptions={hangHoaOptions}
          lastDonGia={lastDonGiaMap}
          needCheckTonKho={needCheckTonKho}
          getTonInfo={getTonInfoForLine}
          tonKhoLoading={tonKhoQuery.isLoading}
          onSave={handleLineDrawerSave}
        />
      ) : null}
    </>
  );
};

export default NhapXuatKhoForm;
