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
  Building2,
  CalendarDays,
  Edit,
  FileText,
  GraduationCap,
  IdCard,
  ListChecks,
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
import {
  mttqTapHuanSchema,
  type MttqTapHuanChiTietLineFormValues,
  type MttqTapHuanFormValues,
} from '../core/schema';
import { MTTQ_TAP_HUAN_CAP, MTTQ_TAP_HUAN_THUOC_DIEN } from '../core/constants';
import type { MttqLopTapHuan } from '../core/types';
import { useCreateMttqLopTapHuan, useUpdateMttqLopTapHuan } from '../hooks/use-mttq-tap-huan';
import MttqTapHuanChiTietLineDrawer, {
  MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE,
} from './mttq-tap-huan-chi-tiet-line-drawer';
import { getTapHuanThuocDienBadgeConfig } from '../utils/display-format';

const DEFAULT_VALUES: MttqTapHuanFormValues = {
  ten_lop_tap_huan: '',
  nam_tap_huan: new Date().getFullYear(),
  cap_tap_huan: 'Cấp tỉnh',
  ghi_chu: undefined,
  chi_tiet: [],
};

type LineDrawerState = null | { mode: 'add' } | { mode: 'edit'; index: number };

type ChiTietGridRow = MttqTapHuanChiTietLineFormValues & {
  rowIndex: number;
  rowKey: string;
  tenCanBo: string;
  tenChucVu: string;
  tenDonVi: string;
  tenCapQuanLy: string;
};

const CHI_TIET_TABLE_CLASS = 'min-w-[64rem]';
const CELL_NOWRAP = 'whitespace-nowrap align-top';

function chiTietCellClass(extra: string) {
  return `${CELL_NOWRAP} ${extra}`;
}

interface Props {
  initialData?: MttqLopTapHuan | null;
  onClose: () => void;
}

const MttqLopTapHuanForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const confirm = useConfirmStore((s) => s.confirm);

  const createMutation = useCreateMttqLopTapHuan(onClose);
  const updateMutation = useUpdateMttqLopTapHuan(onClose);

  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });

  const [lineDrawer, setLineDrawer] = useState<LineDrawerState>(null);

  const canBoOptions = useMemo(
    () =>
      [...canBoList]
        .sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, 'vi'))
        .map((c) => ({ label: c.ho_ten, value: String(c.id) })),
    [canBoList],
  );

  const canBoMap = useMemo(() => {
    const m = new Map<string, (typeof canBoList)[number]>();
    for (const c of canBoList) m.set(String(c.id), c);
    return m;
  }, [canBoList]);

  const resolveFromCanBo = useCallback(
    (canBoId: string) => {
      const c = canBoMap.get(canBoId.trim());
      return {
        chuc_vu: (c?.ten_chuc_vu ?? '').trim(),
        don_vi_cong_tac: (c?.ten_to_chuc ?? '').trim(),
      };
    },
    [canBoMap],
  );

  const capOpts = useMemo(
    () => MTTQ_TAP_HUAN_CAP.map((v) => ({ label: v, value: v })),
    [],
  );
  const thuocDienOpts = useMemo(
    () => MTTQ_TAP_HUAN_THUOC_DIEN.map((v) => ({ label: v, value: v })),
    [],
  );
  const thuocDienBadgeConfig = useMemo(() => getTapHuanThuocDienBadgeConfig(), []);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<MttqTapHuanFormValues>({
    resolver: zodResolver(mttqTapHuanSchema) as Resolver<MttqTapHuanFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, update } = useFieldArray({ control, name: 'chi_tiet' });
  const watchedChiTiet = useWatch({ control, name: 'chi_tiet' }) ?? [];

  const gridRows: ChiTietGridRow[] = useMemo(
    () =>
      fields.map((field, i) => {
        const line = watchedChiTiet[i] ?? MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE;
        const idStr = (line.can_bo_id ?? '').trim();
        const canBo = canBoMap.get(idStr);
        const tenCanBo =
          canBo?.ho_ten?.trim() ?? (idStr !== '' ? `#${idStr}` : txt('common.emptyCell'));
        const tenChucVu =
          (line.chuc_vu ?? '').trim() || (canBo?.ten_chuc_vu ?? '').trim() || '';
        const tenDonVi =
          (line.don_vi_cong_tac ?? '').trim() || (canBo?.ten_to_chuc ?? '').trim() || '';
        const tenCapQuanLy = canBo?.ten_cap_quan_ly?.trim() ?? '';
        return {
          ...line,
          rowIndex: i,
          rowKey: field.id,
          tenCanBo,
          tenChucVu,
          tenDonVi,
          tenCapQuanLy,
        };
      }),
    [fields, watchedChiTiet, canBoMap],
  );

  useEffect(() => {
    if (initialData) {
      reset({
        ten_lop_tap_huan: initialData.ten_lop_tap_huan,
        nam_tap_huan: initialData.nam_tap_huan,
        cap_tap_huan: initialData.cap_tap_huan,
        ghi_chu: initialData.ghi_chu ?? undefined,
        chi_tiet:
          initialData.chi_tiet.length > 0
            ? initialData.chi_tiet.map((c) => ({
                id: c.id,
                can_bo_id: c.can_bo_id,
                chuc_vu: c.chuc_vu ?? '',
                don_vi_cong_tac: c.don_vi_cong_tac ?? '',
                thuoc_dien: c.thuoc_dien,
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
        toast.warning(txt('matTranTapHuan.chiTietDrawer.cannotDeleteLast'));
        return;
      }
      confirm({
        title: txt('matTranTapHuan.chiTietDrawer.deleteLineTitle'),
        message: txt('matTranTapHuan.chiTietDrawer.deleteLineMessage'),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: () => remove(index),
      });
    },
    [confirm, fields.length, remove],
  );

  const handleLineDrawerSave = useCallback(
    (values: MttqTapHuanChiTietLineFormValues) => {
      if (!lineDrawer) return;
      if (lineDrawer.mode === 'add') {
        const dup = watchedChiTiet.some((r) => r?.can_bo_id === values.can_bo_id);
        if (dup) {
          toast.warning(txt('matTranTapHuan.validation.canBoRequired'));
        }
        append(values);
      } else {
        update(lineDrawer.index, values);
      }
    },
    [append, lineDrawer, update, watchedChiTiet],
  );

  const lineDrawerInitial = useMemo(() => {
    if (!lineDrawer) return MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE;
    if (lineDrawer.mode === 'add') return MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE;
    const row = watchedChiTiet[lineDrawer.index];
    return row
      ? { ...MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE, ...row }
      : MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE;
  }, [lineDrawer, watchedChiTiet]);

  const onSubmit: SubmitHandler<MttqTapHuanFormValues> = (data) => {
    if (!isEdit && !idNguoiTao) {
      toast.error(txt('matTranTapHuan.service.noEmployeeProfile'));
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
        icon={<GraduationCap size={18} />}
        subtitle={
          isEdit && initialData
            ? `${txt('matTranTapHuan.form.editSubtitle')} · ${initialData.ten_lop_tap_huan}`
            : txt('matTranTapHuan.form.createSubtitle')
        }
        footer={
          <FormDrawerFooter
            formId="mttq-lop-tap-huan-form"
            onCancel={onClose}
            isLoading={pending}
            isEdit={isEdit}
            compact
            createIcon={<GraduationCap className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
          />
        }
        footerCompact
      >
        <form id="mttq-lop-tap-huan-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection
            title={txt('matTranTapHuan.form.sectionHeader')}
            icon={<FileText size={14} />}
            variant="primary"
          >
            <FormGrid>
              <div className={FORM_GRID_SPAN_FULL}>
                <Input
                  label={txt('matTranTapHuan.form.tenLop')}
                  icon={<GraduationCap size={12} />}
                  {...register('ten_lop_tap_huan')}
                  error={errors.ten_lop_tap_huan?.message}
                  required
                />
              </div>
              <Input
                label={txt('matTranTapHuan.form.namTapHuan')}
                type="number"
                icon={<CalendarDays size={12} />}
                {...register('nam_tap_huan')}
                error={errors.nam_tap_huan?.message}
                required
              />
              <Controller
                name="cap_tap_huan"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranTapHuan.form.capTapHuan')}
                    options={capOpts}
                    value={field.value}
                    onChange={(v) => field.onChange(String(v))}
                    error={errors.cap_tap_huan?.message}
                    icon={<Tag size={12} />}
                    required
                    clearable={false}
                    dropdownInPortal
                  />
                )}
              />
              <div className={FORM_GRID_SPAN_FULL}>
                <Textarea
                  label={txt('matTranTapHuan.form.ghiChu')}
                  icon={<StickyNote size={12} />}
                  {...register('ghi_chu')}
                  rows={2}
                />
              </div>
            </FormGrid>
          </FormSection>

          <FormSection
            title={txt('matTranTapHuan.form.sectionChiTiet')}
            icon={<Users size={14} />}
            variant="primary"
            headerRight={
              <Button type="button" variant="outline" size="sm" onClick={openAddLine} className="gap-1">
                <Plus className="w-4 h-4" />
                {txt('matTranTapHuan.form.addLine')}
              </Button>
            }
          >
            {typeof chiErrors?.message === 'string' ? (
              <p className="text-sm text-destructive mb-2">{chiErrors.message}</p>
            ) : null}
            {gridRows.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-3">
                {txt('matTranTapHuan.form.chiTietEmptyHint')}
              </p>
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
                    {txt('matTranTapHuan.form.hoVaTen')}
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
                  id: 'chuc_vu',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <IdCard size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranTapHuan.form.chucVu')}
                    </span>
                  ),
                  headerClassName: 'min-w-[10rem]',
                  cellClassName: chiTietCellClass('min-w-[10rem]'),
                  renderCell: (r) =>
                    r.tenChucVu?.trim() ? r.tenChucVu : txt('common.emptyCell'),
                },
                {
                  id: 'don_vi',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranTapHuan.form.donViCongTac')}
                    </span>
                  ),
                  headerClassName: 'min-w-[14rem]',
                  cellClassName: chiTietCellClass('min-w-[14rem]'),
                  renderCell: (r) => (r.tenDonVi?.trim() ? r.tenDonVi : txt('common.emptyCell')),
                },
                {
                  id: 'cap_quan_ly',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <Tag size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranTapHuan.form.capQuanLy')}
                    </span>
                  ),
                  headerClassName: 'min-w-[10rem]',
                  cellClassName: chiTietCellClass('min-w-[10rem]'),
                  renderCell: (r) =>
                    r.tenCapQuanLy?.trim() ? r.tenCapQuanLy : txt('common.emptyCell'),
                },
                {
                  id: 'thuoc_dien',
                  header: (
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks size={12} className="shrink-0 opacity-90" aria-hidden />
                      {txt('matTranTapHuan.form.thuocDien')}
                    </span>
                  ),
                  headerClassName: 'min-w-[9rem]',
                  cellClassName: chiTietCellClass('min-w-[9rem]'),
                  renderCell: (r) => (
                    <EnumBadge
                      value={r.thuoc_dien}
                      config={thuocDienBadgeConfig}
                      shape="rounded"
                      truncate
                    />
                  ),
                },
              ]}
              actionsColumn={{
                header: txt('common.actions'),
                widthClass: 'w-[5.5rem] min-w-[5.5rem]',
                renderCell: (r) => (
                  <div
                    className="flex items-center justify-end gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
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
        <MttqTapHuanChiTietLineDrawer
          key={lineDrawer.mode === 'edit' ? `e-${lineDrawer.index}` : 'add'}
          open
          onClose={() => setLineDrawer(null)}
          mode={lineDrawer.mode}
          initialLine={lineDrawerInitial}
          canBoOptions={canBoOptions}
          thuocDienOpts={thuocDienOpts}
          resolveFromCanBo={resolveFromCanBo}
          onSave={handleLineDrawerSave}
        />
      ) : null}
    </>
  );
};

export default MttqLopTapHuanForm;
