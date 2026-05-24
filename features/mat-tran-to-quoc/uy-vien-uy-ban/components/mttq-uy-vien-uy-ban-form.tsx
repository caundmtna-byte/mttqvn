import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  BookOpen,
  Building2,
  Briefcase,
  Calendar,
  Flag,
  Home,
  Landmark,
  Layers,
  MapPin,
  Phone,
  StickyNote,
  Type,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import CanBoCombobox from '@/features/mat-tran-to-quoc/danh-sach-can-bo/components/can-bo-combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useMttqNhiemKyList } from '@/features/mat-tran-to-quoc/nhiem-ky/hooks/use-mttq-nhiem-ky';
import { useTinhThanhList } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import MttqCanBoInlineEditor, {
  type MttqCanBoInlineEditorHandle,
} from '@/features/mat-tran-to-quoc/danh-sach-can-bo/components/mttq-can-bo-inline-editor';
import { useMttqCanBoDetail, useMttqCanBoList, useUpdateMttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import {
  mttqUyVienUyBanSchema,
  mttqUyVienUyBanToFormInput,
  type MttqUyVienUyBanFormInput,
  type MttqUyVienUyBanFormValues,
} from '../core/schema';
import type { MttqUyVienUyBan } from '../core/types';
import { useCreateMttqUyVienUyBan, useUpdateMttqUyVienUyBan } from '../hooks/use-mttq-uy-vien-uy-ban';
import { useMttqUyVienUyBanViewer } from '../hooks/use-mttq-uy-vien-uy-ban-viewer';
import { buildUyVienCanBoOptions } from '../utils/can-bo-options-for-uy-vien';
import { formatTenPhongBanHienThi } from '../utils/phong-ban-hien-thi';

const FORM_ID = 'mttq-uy-vien-uy-ban-form';

const TINH_CAP_VALUE = '__tinh_cap__';

interface Props {
  initialData?: MttqUyVienUyBan | null;
  onClose: () => void;
  defaultNhiemKyId?: string;
}

interface CanBoSnap {
  ho_va_ten: string;
  ngay_sinh: string;
  gioi_tinh: string;
  dan_toc: string;
  ton_giao: string;
  dang_vien: boolean;
  dien_thoai: string;
  dia_chi: string;
  ten_to_chuc: string;
  ten_phong_ban: string;
  ten_chuc_vu: string;
  ten_don_vi: string;
  ten_trinh_do: string;
  ten_llct: string;
  ten_trang_thai: string;
  ngay_nhap_trang_thai: string;
  van_hoa: string;
  ngay_vao_dang: string;
  que_quan: string;
  noi_o_hien_nay: string;
}

function canBoDisplayFromCanBo(c: MttqCanBo | undefined): CanBoSnap {
  if (!c) {
    return {
      ho_va_ten: '',
      ngay_sinh: '',
      gioi_tinh: '',
      dan_toc: '',
      ton_giao: '',
      dang_vien: false,
      dien_thoai: '',
      dia_chi: '',
      ten_to_chuc: '',
      ten_phong_ban: '',
      ten_chuc_vu: '',
      ten_don_vi: '',
      ten_trinh_do: '',
      ten_llct: '',
      ten_trang_thai: '',
      ngay_nhap_trang_thai: '',
      van_hoa: '',
      ngay_vao_dang: '',
      que_quan: '',
      noi_o_hien_nay: '',
    };
  }
  return {
    ho_va_ten: c.ho_ten.trim(),
    ngay_sinh: c.ngay_sinh?.trim() ?? '',
    gioi_tinh: c.gioi_tinh?.trim() ?? '',
    dan_toc: (c.ten_dan_toc ?? '').trim(),
    ton_giao: (c.ton_giao ?? '').trim(),
    dang_vien: c.dang_vien,
    dien_thoai: (c.dien_thoai ?? '').trim(),
    dia_chi: (c.dia_chi ?? '').trim(),
    ten_to_chuc: (c.ten_to_chuc ?? '').trim(),
    ten_phong_ban: formatTenPhongBanHienThi(c.ten_phong_ban, c.ten_bo_phan)?.trim() ?? '',
    ten_chuc_vu: (c.ten_chuc_vu ?? '').trim(),
    ten_don_vi: (c.ten_don_vi ?? '').trim(),
    ten_trinh_do: (c.ten_trinh_do ?? '').trim(),
    ten_llct: (c.ten_ly_luan_chinh_tri ?? '').trim(),
    ten_trang_thai: (c.ten_trang_thai ?? '').trim(),
    ngay_nhap_trang_thai: (c.ngay_nhap_trang_thai ?? '').trim().slice(0, 10),
    van_hoa: (c.van_hoa ?? '').trim(),
    ngay_vao_dang: (c.ngay_vao_dang ?? '').trim().slice(0, 10),
    que_quan: (c.que_quan ?? '').trim(),
    noi_o_hien_nay: (c.noi_o_hien_nay ?? '').trim(),
  };
}

/** Khi embed cán bộ chưa load nhưng đã có bản ghi flatten (sửa từ cache). */
function canBoDisplayFromUyRow(d: MttqUyVienUyBan): CanBoSnap {
  return {
    ho_va_ten: (d.ho_va_ten ?? '').trim(),
    ngay_sinh: (d.ngay_sinh ?? '').trim(),
    gioi_tinh: (d.gioi_tinh ?? '').trim(),
    dan_toc: (d.dan_toc ?? '').trim(),
    ton_giao: (d.ton_giao ?? '').trim(),
    dang_vien: d.dang_vien,
    dien_thoai: (d.so_dien_thoai ?? '').trim(),
    dia_chi: (d.dia_chi_can_bo ?? '').trim(),
    ten_to_chuc: (d.ten_to_chuc ?? '').trim(),
    ten_phong_ban: (d.ten_phong_ban_hien_thi ?? '').trim(),
    ten_chuc_vu: (d.chuc_vu_don_vi ?? '').trim(),
    ten_don_vi: (d.ten_don_vi_can_bo ?? '').trim(),
    ten_trinh_do: (d.trinh_do_cm ?? '').trim(),
    ten_llct: (d.trinh_do_llct ?? '').trim(),
    ten_trang_thai: (d.ten_trang_thai_can_bo ?? '').trim(),
    ngay_nhap_trang_thai: (d.ngay_nhap_trang_thai ?? '').trim().slice(0, 10),
    van_hoa: (d.van_hoa ?? '').trim(),
    ngay_vao_dang: (d.ngay_vao_dang ?? '').trim().slice(0, 10),
    que_quan: (d.que_quan ?? '').trim(),
    noi_o_hien_nay: (d.noi_o_hien_nay ?? '').trim(),
  };
}

const MttqUyVienUyBanForm: React.FC<Props> = ({ initialData, onClose, defaultNhiemKyId }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const canViewNhiemKy = useCan('view', 'matTranTerm');
  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const canEditCanBo = useCan('edit', 'matTranOfficerList');
  const { data: nhiemKyList = [] } = useMttqNhiemKyList({ enabled: canViewNhiemKy });
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });
  const viewer = useMttqUyVienUyBanViewer();
  const isXaPhuongViewer = viewer.chucVuCapQuanLy === 'Xã phường';
  const viewerDonViId = viewer.viewerDonViId;
  const lockDonViToViewer = isXaPhuongViewer && Boolean(viewerDonViId);

  const createMutation = useCreateMttqUyVienUyBan(onClose);
  const updateMutation = useUpdateMttqUyVienUyBan(onClose);
  const updateCanBoMutation = useUpdateMttqCanBo();
  const canBoEditorRef = useRef<MttqCanBoInlineEditorHandle | null>(null);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const nhiemKyOptions = useMemo(
    () =>
      [...nhiemKyList]
        .sort((a, b) => a.ten_nhiem_ky.localeCompare(b.ten_nhiem_ky, 'vi'))
        .map((n) => ({ label: n.ten_nhiem_ky, value: String(n.id) })),
    [nhiemKyList],
  );

  const xaOptions = useMemo(() => {
    if (lockDonViToViewer && viewerDonViId) {
      const x = xaList.find((item) => String(item.id) === viewerDonViId);
      if (x) {
        return [
          {
            label: x.ten,
            value: String(x.id),
            subLabel: tinhMap.get(x.id_tinh_thanh),
          },
        ];
      }
      return [{ label: viewerDonViId, value: viewerDonViId }];
    }
    const tinhCap = {
      label: `${txt('matTranUyVienUyBan.tinhCap')} (${txt('matTranUyVienUyBan.form.donViPlaceholder')})`,
      value: TINH_CAP_VALUE,
    };
    const rest = [...xaList]
      .sort((a, b) => {
        const ta = tinhMap.get(a.id_tinh_thanh) ?? '';
        const tb = tinhMap.get(b.id_tinh_thanh) ?? '';
        if (ta !== tb) return ta.localeCompare(tb, 'vi');
        return a.ten.localeCompare(b.ten, 'vi');
      })
      .map((x) => ({
        label: x.ten,
        value: String(x.id),
        subLabel: tinhMap.get(x.id_tinh_thanh),
      }));
    return [tinhCap, ...rest];
  }, [xaList, tinhMap, lockDonViToViewer, viewerDonViId]);

  const canBoMap = useMemo(() => {
    const m = new Map<string, MttqCanBo>();
    for (const c of canBoList) m.set(String(c.id), c);
    return m;
  }, [canBoList]);

  const canBoOptions = useMemo(
    () =>
      buildUyVienCanBoOptions({
        viewer,
        canBoList,
        ensureCanBoId: initialData?.can_bo_id,
        ensureCanBoLabel: initialData?.ho_va_ten,
      }),
    [viewer, canBoList, initialData?.can_bo_id, initialData?.ho_va_ten],
  );

  const defaultValues = useMemo(() => {
    const base = mttqUyVienUyBanToFormInput(initialData ?? null);
    let next = base;
    if (!initialData && defaultNhiemKyId?.trim()) {
      next = { ...next, nhiem_ky_id: defaultNhiemKyId.trim() };
    }
    if (!initialData && lockDonViToViewer && viewerDonViId) {
      next = { ...next, don_vi_id: viewerDonViId };
    }
    return next;
  }, [initialData, defaultNhiemKyId, lockDonViToViewer, viewerDonViId]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MttqUyVienUyBanFormInput, unknown, MttqUyVienUyBanFormValues>({
    defaultValues,
    resolver: zodResolver(mttqUyVienUyBanSchema) as Resolver<MttqUyVienUyBanFormInput, unknown, MttqUyVienUyBanFormValues>,
  });

  const watchedCanBoId = useWatch({ control, name: 'can_bo_id' });
  const snap = useMemo(
    () => canBoDisplayFromCanBo(canBoMap.get(String(watchedCanBoId ?? '').trim())),
    [watchedCanBoId, canBoMap],
  );

  const displaySnap = useMemo(() => {
    const id = String(watchedCanBoId ?? '').trim();
    if (!id) return snap;
    if (canBoMap.has(id)) return snap;
    if (isEdit && initialData && id === String(initialData.can_bo_id).trim()) return canBoDisplayFromUyRow(initialData);
    return snap;
  }, [watchedCanBoId, snap, canBoMap, isEdit, initialData]);

  const canBoIdTrim = String(watchedCanBoId ?? '').trim();
  const fetchCanBoDetailId =
    canEditCanBo && canBoIdTrim && !canBoMap.has(canBoIdTrim) ? canBoIdTrim : null;
  const { data: canBoDetail, isPending: canBoDetailPending } = useMttqCanBoDetail(fetchCanBoDetailId);
  const canBoRowForEditor = useMemo((): MttqCanBo | null => {
    if (!canBoIdTrim || !canEditCanBo) return null;
    return canBoMap.get(canBoIdTrim) ?? canBoDetail ?? null;
  }, [canBoIdTrim, canEditCanBo, canBoMap, canBoDetail]);

  useEffect(() => {
    const base = mttqUyVienUyBanToFormInput(initialData ?? null);
    let next = base;
    if (!initialData && defaultNhiemKyId?.trim()) {
      next = { ...next, nhiem_ky_id: defaultNhiemKyId.trim() };
    }
    if (!initialData && lockDonViToViewer && viewerDonViId) {
      next = { ...next, don_vi_id: viewerDonViId };
    }
    reset(next);
  }, [initialData, defaultNhiemKyId, reset, lockDonViToViewer, viewerDonViId]);

  useEffect(() => {
    if (!lockDonViToViewer) return;
    const id = String(watchedCanBoId ?? '').trim();
    if (!id) return;
    const c = canBoMap.get(id);
    const dv = c?.don_vi_id != null ? String(c.don_vi_id).trim() : '';
    if (dv) setValue('don_vi_id', dv);
    else if (viewerDonViId) setValue('don_vi_id', viewerDonViId);
  }, [watchedCanBoId, lockDonViToViewer, canBoMap, viewerDonViId, setValue]);

  const persistCanBoIfNeeded = useCallback(
    async (canBoId: string) => {
      const editor = canBoEditorRef.current;
      if (!editor) return true;
      const canBoForm = await editor.validateAndGet();
      if (canBoForm == null) return false;
      await updateCanBoMutation.mutateAsync({ id: canBoId, data: canBoForm });
      return true;
    },
    [updateCanBoMutation],
  );

  const onSubmit: SubmitHandler<MttqUyVienUyBanFormValues> = async (data) => {
    const cbId = String(data.can_bo_id).trim();
    if (canEditCanBo && canBoRowForEditor && cbId) {
      const ok = await persistCanBoIfNeeded(cbId);
      if (!ok) return;
    }

    if (!isEdit) {
      if (!idNguoiTao) {
        toast.error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));
        return;
      }
      createMutation.mutate({ data, idNguoiTao });
      return;
    }
    if (!initialData) return;
    updateMutation.mutate({ id: initialData.id, data });
  };

  const pending =
    isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending ||
    updateCanBoMutation.isPending ||
    (Boolean(fetchCanBoDetailId) && canBoDetailPending);

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Users size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranUyVienUyBan.form.editSubtitle')} · ${initialData.ho_va_ten}`
          : txt('matTranUyVienUyBan.form.createSubtitle')
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
        <FormSection title={txt('matTranUyVienUyBan.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid>
            <Controller
              name="can_bo_id"
              control={control}
              render={({ field }) => (
                <CanBoCombobox
                  createFormStackLevel={1}
                  options={canBoOptions}
                  value={field.value === '' ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('matTranUyVienUyBan.form.canBo')}
                  placeholder={txt('common.select')}
                  error={errors.can_bo_id?.message}
                  icon={<Users size={12} />}
                  required
                  dropdownInPortal
                  disabled={!canViewCanBo || canBoOptions.length === 0}
                />
              )}
            />
            <Controller
              name="ma_uv"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  label={txt('matTranUyVienUyBan.form.maUv')}
                  error={errors.ma_uv?.message}
                  icon={User}
                />
              )}
            />
            <Controller
              name="nhiem_ky_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={nhiemKyOptions}
                  value={field.value === '' ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('matTranUyVienUyBan.form.nhiemKy')}
                  placeholder={txt('matTranUyVienUyBan.form.nhiemKy')}
                  error={errors.nhiem_ky_id?.message}
                  icon={<Calendar size={12} />}
                  required
                  clearable={false}
                  dropdownInPortal
                  disabled={!canViewNhiemKy || nhiemKyOptions.length === 0}
                />
              )}
            />
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={xaOptions}
                  value={
                    field.value === '' || field.value === undefined
                      ? TINH_CAP_VALUE
                      : field.value === TINH_CAP_VALUE
                        ? TINH_CAP_VALUE
                        : field.value
                  }
                  onChange={(v) => {
                    if (v === '' || v == null || v === TINH_CAP_VALUE) field.onChange('');
                    else field.onChange(String(v));
                  }}
                  label={txt('matTranUyVienUyBan.form.donVi')}
                  placeholder={txt('matTranUyVienUyBan.form.donViPlaceholder')}
                  error={errors.don_vi_id?.message as string | undefined}
                  icon={<MapPin size={14} />}
                  dropdownInPortal
                  disabled={lockDonViToViewer}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionCanBo')} icon={<User size={14} />} variant="primary">
          <FormGrid>
            <p className={`${FORM_GRID_SPAN_FULL} text-xs text-muted-foreground m-0`}>
              {canEditCanBo && canBoRowForEditor
                ? txt('matTranUyVienUyBan.form.snapshotEditableHint')
                : txt('matTranUyVienUyBan.form.snapshotHint')}
            </p>
            {canEditCanBo && fetchCanBoDetailId && canBoDetailPending ? (
              <p className={`${FORM_GRID_SPAN_FULL} text-sm text-muted-foreground m-0`}>
                {txt('matTranUyVienUyBan.form.canBoProfileLoading')}
              </p>
            ) : canEditCanBo && canBoRowForEditor ? (
              <div className={FORM_GRID_SPAN_FULL}>
                <MttqCanBoInlineEditor ref={canBoEditorRef} key={canBoRowForEditor.id} row={canBoRowForEditor} />
              </div>
            ) : (
              <>
                <div className={FORM_GRID_SPAN_FULL}>
                  <Input
                    readOnly
                    tabIndex={-1}
                    label={txt('matTranUyVienUyBan.form.hoVaTen')}
                    icon={Users}
                    value={displaySnap.ho_va_ten.trim() ? displaySnap.ho_va_ten : '—'}
                    className="cursor-default"
                  />
                </div>
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.toChuc')}
                  icon={Building2}
                  value={displaySnap.ten_to_chuc.trim() ? displaySnap.ten_to_chuc : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.phongBan')}
                  icon={Layers}
                  value={displaySnap.ten_phong_ban.trim() ? displaySnap.ten_phong_ban : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.chucVu')}
                  icon={Briefcase}
                  value={displaySnap.ten_chuc_vu.trim() ? displaySnap.ten_chuc_vu : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.diaChiCanBo')}
                  icon={<MapPin size={12} />}
                  value={displaySnap.dia_chi.trim() ? displaySnap.dia_chi : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.donVi')}
                  icon={<MapPin size={12} />}
                  value={displaySnap.ten_don_vi.trim() ? displaySnap.ten_don_vi : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.ngaySinh')}
                  type="date"
                  icon={<Calendar size={12} />}
                  value={displaySnap.ngay_sinh}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.gioiTinh')}
                  icon={<User size={12} />}
                  value={displaySnap.gioi_tinh.trim() ? displaySnap.gioi_tinh : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.danToc')}
                  icon={<Flag size={12} />}
                  value={displaySnap.dan_toc.trim() ? displaySnap.dan_toc : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.tonGiao')}
                  icon={<Landmark size={12} />}
                  value={displaySnap.ton_giao.trim() ? displaySnap.ton_giao : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.trinhDoCm')}
                  icon={<BookOpen size={12} />}
                  value={displaySnap.ten_trinh_do.trim() ? displaySnap.ten_trinh_do : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.trinhDoLlct')}
                  icon={<BookOpen size={12} />}
                  value={displaySnap.ten_llct.trim() ? displaySnap.ten_llct : '—'}
                  className="cursor-default"
                />
                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-default">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary accent-primary pointer-events-none"
                      checked={displaySnap.dang_vien}
                      readOnly
                      tabIndex={-1}
                    />
                    {txt('matTranUyVienUyBan.form.dangVien')}
                  </label>
                </div>
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.trangThai')}
                  icon={<Activity size={12} />}
                  value={displaySnap.ten_trang_thai.trim() ? displaySnap.ten_trang_thai : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.ngayNhapTrangThai')}
                  type="date"
                  icon={<Calendar size={12} />}
                  value={displaySnap.ngay_nhap_trang_thai}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.vanHoa')}
                  icon={<BookOpen size={12} />}
                  value={displaySnap.van_hoa.trim() ? displaySnap.van_hoa : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.ngayVaoDang')}
                  type="date"
                  icon={<Calendar size={12} />}
                  value={displaySnap.ngay_vao_dang}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.queQuan')}
                  icon={<MapPin size={12} />}
                  value={displaySnap.que_quan.trim() ? displaySnap.que_quan : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranCanBo.form.noiOHienNay')}
                  icon={<Home size={12} />}
                  value={displaySnap.noi_o_hien_nay.trim() ? displaySnap.noi_o_hien_nay : '—'}
                  className="cursor-default"
                />
                <Input
                  readOnly
                  tabIndex={-1}
                  label={txt('matTranUyVienUyBan.form.soDienThoai')}
                  icon={<Phone size={12} />}
                  value={displaySnap.dien_thoai.trim() ? displaySnap.dien_thoai : '—'}
                  className="cursor-default"
                />
              </>
            )}
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionCaNhan')} icon={<Activity size={14} />}>
          <FormGrid>
            <Input
              label={txt('matTranUyVienUyBan.form.trangThamGia')}
              icon={<Activity size={12} />}
              {...register('trang_thai_tham_gia')}
              error={errors.trang_thai_tham_gia?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranUyVienUyBan.form.sectionGhiChu')} icon={<StickyNote size={14} />}>
          <Textarea
            label={txt('matTranUyVienUyBan.form.ghiChu')}
            icon={<StickyNote size={12} />}
            {...register('ghi_chu')}
            rows={3}
            error={errors.ghi_chu?.message}
          />
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqUyVienUyBanForm;
