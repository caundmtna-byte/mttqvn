import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlignLeft,
  Award,
  Building2,
  Calendar,
  Edit,
  FileText,
  Landmark,
  Link2,
  ListChecks,
  Medal,
  Plus,
  StickyNote,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { TableRowIconButton } from '@/components/shared/row-actions';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE } from '@/lib/button-labels';
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import { mttqKhenThuongSchema, type MttqKhenThuongFormValues, type MttqKhenThuongChiTietLineFormValues } from '../core/schema';
import {
  MTTQ_KHEN_THUONG_CAP,
  MTTQ_KHEN_THUONG_DANH_HIEU,
  MTTQ_KHEN_THUONG_HINH_THUC,
  MTTQ_KHEN_THUONG_TRANG_THAI,
} from '../core/constants';
import type { MttqKhenThuong } from '../core/types';
import { useCreateMttqKhenThuong, useUpdateMttqKhenThuong } from '../hooks/use-mttq-khen-thuong';
import { useMttqKhenThuongViewer } from '../hooks/use-mttq-khen-thuong-viewer';
import { buildKhenThuongCanBoOptions } from '../utils/can-bo-options-for-khen-thuong';
import MttqKhenThuongChiTietLineDrawer, {
  MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE,
} from './mttq-khen-thuong-chi-tiet-line-drawer';
import {
  getKhenThuongCapBadgeConfig,
  getKhenThuongDanhHieuBadgeConfig,
  getKhenThuongHinhThucBadgeConfig,
} from '../utils/display-format';

const DEFAULT_VALUES: MttqKhenThuongFormValues = {
  so_qd: '',
  ngay_khen_thuong: '',
  don_vi_de_xuat: undefined,
  ghi_chu: undefined,
  trang_thai: 'Mới',
  chi_tiet: [],
};

type LineDrawerState = null | { mode: 'add' } | { mode: 'edit'; index: number };

type ChiTietGridRow = MttqKhenThuongChiTietLineFormValues & {
  rowIndex: number;
  rowKey: string;
  tenCanBo: string;
};

const CHI_TIET_TABLE_CLASS = 'min-w-[64rem]';
const CELL_NOWRAP = 'whitespace-nowrap align-top';

function chiTietCellClass(extra: string) {
  return `${CELL_NOWRAP} ${extra}`;
}

interface Props {
  initialData?: MttqKhenThuong | null;
  onClose: () => void;
}

const MttqKhenThuongForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const confirm = useConfirmStore((s) => s.confirm);

  const createMutation = useCreateMttqKhenThuong(onClose);
  const updateMutation = useUpdateMttqKhenThuong(onClose);

  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });
  const viewer = useMttqKhenThuongViewer();

  const [lineDrawer, setLineDrawer] = useState<LineDrawerState>(null);

  const hinhThucOpts = useMemo(
    () => MTTQ_KHEN_THUONG_HINH_THUC.map((v) => ({ label: v, value: v })),
    [],
  );
  const danhHieuOpts = useMemo(
    () => MTTQ_KHEN_THUONG_DANH_HIEU.map((v) => ({ label: v, value: v })),
    [],
  );
  const capKhenThuongOpts = useMemo(
    () => MTTQ_KHEN_THUONG_CAP.map((v) => ({ label: v, value: v })),
    [],
  );
  const hinhThucBadgeConfig = useMemo(() => getKhenThuongHinhThucBadgeConfig(), []);
  const danhHieuBadgeConfig = useMemo(() => getKhenThuongDanhHieuBadgeConfig(), []);
  const capKhenThuongBadgeConfig = useMemo(() => getKhenThuongCapBadgeConfig(), []);
  const trangThaiOpts = useMemo(
    () => MTTQ_KHEN_THUONG_TRANG_THAI.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<MttqKhenThuongFormValues>({
    resolver: zodResolver(mttqKhenThuongSchema) as Resolver<MttqKhenThuongFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'chi_tiet' });
  const watchedChiTiet = useWatch({ control, name: 'chi_tiet' }) ?? [];

  const canBoOptions = useMemo(
    () =>
      buildKhenThuongCanBoOptions({
        viewer,
        canBoList,
        ensureCanBoId: lineDrawer?.mode === 'edit' ? watchedChiTiet[lineDrawer.index]?.can_bo_id : undefined,
      }),
    [viewer, canBoList, lineDrawer, watchedChiTiet],
  );

  const gridRows: ChiTietGridRow[] = useMemo(
    () =>
      fields.map((field, i) => {
        const line = watchedChiTiet[i] ?? MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE;
        const idStr = (line.can_bo_id ?? '').trim();
        const label = canBoOptions.find((o) => o.value === idStr)?.label?.trim();
        const tenCanBo =
          label && label !== '' ? label : idStr !== '' ? `#${idStr}` : txt('common.emptyCell');
        return {
          ...line,
          rowIndex: i,
          rowKey: field.id,
          tenCanBo,
        };
      }),
    [fields, watchedChiTiet, canBoOptions],
  );

  useEffect(() => {
    if (initialData) {
      reset({
        so_qd: initialData.so_qd,
        ngay_khen_thuong: initialData.ngay_khen_thuong,
        don_vi_de_xuat: initialData.don_vi_de_xuat ?? undefined,
        ghi_chu: initialData.ghi_chu ?? undefined,
        trang_thai: initialData.trang_thai,
        chi_tiet:
          initialData.chi_tiet.length > 0
            ? initialData.chi_tiet.map((c) => ({
                id: c.id,
                can_bo_id: c.can_bo_id,
                cap_khen_thuong: c.cap_khen_thuong,
                hinh_thuc_khen: c.hinh_thuc_khen,
                danh_hieu: c.danh_hieu,
                noi_dung_khen: c.noi_dung_khen ?? undefined,
                ho_so_khen: c.ho_so_khen ?? undefined,
              }))
            : [],
      });
    } else {
      reset({ ...DEFAULT_VALUES });
    }
  }, [initialData, reset]);

  const openAddLine = useCallback(() => {
    setLineDrawer({ mode: 'add' });
  }, []);

  const openEditLine = useCallback((index: number) => {
    setLineDrawer({ mode: 'edit', index });
  }, []);

  const handleRemoveLine = useCallback(
    (index: number) => {
      if (fields.length <= 1) {
        toast.warning(txt('matTranKhenThuong.chiTietDrawer.cannotDeleteLast'));
        return;
      }
      confirm({
        title: txt('matTranKhenThuong.chiTietDrawer.deleteLineTitle'),
        message: txt('matTranKhenThuong.chiTietDrawer.deleteLineMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: () => remove(index),
      });
    },
    [confirm, fields.length, remove],
  );

  const handleLineDrawerSave = useCallback(
    (values: MttqKhenThuongChiTietLineFormValues) => {
      if (!lineDrawer) return;
      if (lineDrawer.mode === 'add') {
        append(values);
      } else {
        update(lineDrawer.index, values);
      }
    },
    [append, lineDrawer, update],
  );

  const lineDrawerInitial = useMemo(() => {
    if (!lineDrawer) return MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE;
    if (lineDrawer.mode === 'add') return MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE;
    const row = watchedChiTiet[lineDrawer.index];
    return row ? { ...MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE, ...row } : MTTQ_KHEN_THUONG_CHI_TIET_EMPTY_LINE;
  }, [lineDrawer, watchedChiTiet]);

  const onSubmit: SubmitHandler<MttqKhenThuongFormValues> = (data) => {
    if (!isEdit && !idNguoiTao) {
      toast.error(txt('matTranKhenThuong.service.noEmployeeProfile'));
      return;
    }
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate({ data, idNguoiTao });
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
        icon={<Award size={18} />}
        subtitle={
          isEdit && initialData
            ? `${txt('matTranKhenThuong.form.editSubtitle')} · ${initialData.so_qd}`
            : txt('matTranKhenThuong.form.createSubtitle')
        }
        footer={
          <FormDrawerFooter
            formId="mttq-khen-thuong-form"
            onCancel={onClose}
            isLoading={pending}
            isEdit={isEdit}
            compact
            createIcon={<Award className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
          />
        }
        footerCompact
      >
        <form id="mttq-khen-thuong-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection
            title={txt('matTranKhenThuong.form.sectionHeader')}
            icon={<FileText size={14} />}
            variant="primary"
          >
            <FormGrid>
              <Input
                label={txt('matTranKhenThuong.form.soQd')}
                icon={<FileText size={12} />}
                {...register('so_qd')}
                error={errors.so_qd?.message}
                required
              />
              <Input
                label={txt('matTranKhenThuong.form.ngayKhenThuong')}
                type="date"
                icon={<Calendar size={12} />}
                {...register('ngay_khen_thuong')}
                error={errors.ngay_khen_thuong?.message}
                required
              />
              <div className={FORM_GRID_SPAN_FULL}>
                <Input
                  label={txt('matTranKhenThuong.form.donViDeXuat')}
                  icon={<Building2 size={12} />}
                  {...register('don_vi_de_xuat')}
                  error={errors.don_vi_de_xuat?.message}
                />
              </div>
              <Controller
                name="trang_thai"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranKhenThuong.form.trangThai')}
                    options={trangThaiOpts}
                    value={field.value}
                    onChange={(v) => field.onChange(String(v))}
                    error={errors.trang_thai?.message}
                    icon={<Tag size={12} />}
                    required
                    clearable={false}
                    dropdownInPortal
                  />
                )}
              />
              <div className={FORM_GRID_SPAN_FULL}>
                <Textarea
                  label={txt('matTranKhenThuong.form.ghiChu')}
                  icon={<StickyNote size={12} />}
                  {...register('ghi_chu')}
                  rows={2}
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection
            title={txt('matTranKhenThuong.form.sectionChiTiet')}
            icon={<Users size={14} />}
            variant="primary"
            headerRight={
              <Button type="button" variant="outline" size="sm" onClick={openAddLine} className="gap-1">
                <Plus className="w-4 h-4" />
                {txt('matTranKhenThuong.form.addLine')}
              </Button>
            }
          >
            {typeof chiErrors?.message === 'string' ? (
              <p className="text-sm text-destructive mb-2">{chiErrors.message}</p>
            ) : null}
            {gridRows.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-3">{txt('matTranKhenThuong.form.chiTietEmptyHint')}</p>
            ) : null}
            <EmbeddedChildDataGrid<ChiTietGridRow>
              rows={gridRows}
              getRowKey={(r) => r.rowKey}
              maxVisibleBodyRows={8}
              tableClassName={CHI_TIET_TABLE_CLASS}
              onRowClick={(r) => openEditLine(r.rowIndex)}
              labelColumn={{
                minWidthClass: 'min-w-[12rem] w-[12rem]',
                header: (
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={12} className="shrink-0 opacity-90" aria-hidden />
                    {txt('matTranKhenThuong.form.canBo')}
                  </span>
                ),
                renderCell: (r) => (
                  <span className={`inline-flex items-center gap-2 min-w-0 ${CELL_NOWRAP}`}>
                    <Users size={14} className="shrink-0 text-primary/70" aria-hidden />
                    <span className="font-medium text-foreground">{r.tenCanBo}</span>
                  </span>
                ),
                cellClassName: CELL_NOWRAP,
              }}
              columns={[
                {
                  id: 'cap_khen_thuong',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Landmark size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranKhenThuong.form.capKhenThuong')}
                    </span>
                  ),
                  headerClassName: 'min-w-[7.5rem]',
                  cellClassName: chiTietCellClass('min-w-[7.5rem]'),
                  renderCell: (r) => (
                    <EnumBadge
                      value={r.cap_khen_thuong}
                      config={capKhenThuongBadgeConfig}
                      shape="rounded"
                      truncate
                    />
                  ),
                },
                {
                  id: 'hinh_thuc',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranKhenThuong.form.hinhThuc')}
                    </span>
                  ),
                  headerClassName: 'min-w-[8.5rem]',
                  cellClassName: chiTietCellClass('min-w-[8.5rem]'),
                  renderCell: (r) => (
                    <EnumBadge
                      value={r.hinh_thuc_khen}
                      config={hinhThucBadgeConfig}
                      shape="rounded"
                      truncate
                    />
                  ),
                },
                {
                  id: 'danh_hieu',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Medal size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranKhenThuong.form.danhHieu')}
                    </span>
                  ),
                  headerClassName: 'min-w-[7.5rem]',
                  cellClassName: chiTietCellClass('min-w-[7.5rem]'),
                  renderCell: (r) => (
                    <EnumBadge value={r.danh_hieu} config={danhHieuBadgeConfig} shape="rounded" truncate />
                  ),
                },
                {
                  id: 'noi_dung',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <AlignLeft size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranKhenThuong.form.noiDung')}
                    </span>
                  ),
                  headerClassName: 'min-w-[16rem]',
                  cellClassName: chiTietCellClass('min-w-[16rem]'),
                  renderCell: (r) =>
                    r.noi_dung_khen?.trim() ? r.noi_dung_khen : txt('common.emptyCell'),
                },
                {
                  id: 'ho_so',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Link2 size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranKhenThuong.form.hoSo')}
                    </span>
                  ),
                  headerClassName: 'min-w-[12rem]',
                  cellClassName: chiTietCellClass('min-w-[12rem]'),
                  renderCell: (r) => (r.ho_so_khen?.trim() ? r.ho_so_khen : txt('common.emptyCell')),
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
          </FormSection>
        </form>
      </GenericDrawer>

      {lineDrawer ? (
        <MttqKhenThuongChiTietLineDrawer
          key={lineDrawer.mode === 'edit' ? `e-${lineDrawer.index}` : 'add'}
          open
          onClose={() => setLineDrawer(null)}
          mode={lineDrawer.mode}
          initialLine={lineDrawerInitial}
          canBoOptions={canBoOptions}
          capKhenThuongOpts={capKhenThuongOpts}
          hinhThucOpts={hinhThucOpts}
          danhHieuOpts={danhHieuOpts}
          onSave={handleLineDrawerSave}
        />
      ) : null}
    </>
  );
};

export default MttqKhenThuongForm;
