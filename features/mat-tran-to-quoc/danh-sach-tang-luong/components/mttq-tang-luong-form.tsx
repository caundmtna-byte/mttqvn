import React, { useEffect, useMemo, useRef } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  FileText,
  Layers,
  StickyNote,
  TrendingUp,
  User,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { formatDateShort } from '@/lib/utils';
import Input from '@/components/ui/Input';
import NumericFormatInput from '@/components/ui/NumericFormatInput';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useConfirmStore } from '@/store/useConfirmStore';
import CanBoCombobox from '@/features/mat-tran-to-quoc/danh-sach-can-bo/components/can-bo-combobox';
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import { useLuongThietLapNgachList } from '@/features/mat-tran-to-quoc/thiet-lap-luong/hooks/use-luong-thiet-lap-ngach';
import { useLuongThietLapBacByNgach } from '@/features/mat-tran-to-quoc/thiet-lap-luong/hooks/use-luong-thiet-lap-bac';
import { useLuongThietLapCauHinh } from '@/features/mat-tran-to-quoc/thiet-lap-luong/hooks/use-luong-thiet-lap-cau-hinh';
import {
  mttqTangLuongSchema,
  tangLuongToFormInput,
  type MttqTangLuongFormValues,
} from '../core/schema';
import {
  canViewTangLuongRow,
  isTangLuongScopedToXaPhuong,
  useMttqTangLuongViewer,
} from '../hooks/use-mttq-tang-luong-viewer';
import { buildTangLuongCanBoOptions } from '../utils/can-bo-options-for-tang-luong';
import { MTTQ_TANG_LUONG_LOAI_KY_OPTIONS } from '../core/constants';
import type { MttqTangLuongListRow } from '../core/types';
import {
  useCreateMttqTangLuong,
  useMttqTangLuongList,
  useUpdateMttqTangLuong,
} from '../hooks/use-mttq-tang-luong';
import { computeNgayDenHanGoc, getLatestRecordForCanBo } from '../utils/tang-luong-cycle';
import { checkConsecutiveEarlyAdvance, validateNgayTruocHan } from '../utils/tang-luong-validation';
import { computeLuongFromMlcsAndHeSo } from '../utils/compute-luong-snapshot';

const FORM_ID = 'mttq-tang-luong-form';

interface Props {
  initialData?: MttqTangLuongListRow | null;
  onClose: () => void;
  defaultCanBoId?: string;
  defaultNgachMoiId?: string;
  defaultBacMoiId?: string;
}

const MttqTangLuongForm: React.FC<Props> = ({
  initialData,
  onClose,
  defaultCanBoId,
  defaultNgachMoiId,
  defaultBacMoiId,
}) => {
  const isEdit = Boolean(initialData);
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const viewer = useMttqTangLuongViewer();
  const { data: canBoList = [] } = useMttqCanBoList();
  const { data: ngachList = [] } = useLuongThietLapNgachList();
  const { data: allHistory = [] } = useMttqTangLuongList();
  const { data: cauHinh } = useLuongThietLapCauHinh();

  const viewableHistory = useMemo(
    () => allHistory.filter((r) => canViewTangLuongRow(viewer, r)),
    [allHistory, viewer],
  );

  const formSchema = useMemo(
    () =>
      mttqTangLuongSchema.superRefine((data, ctx) => {
        if (!isTangLuongScopedToXaPhuong(viewer)) return;
        const dv = viewer.viewerDonViId;
        if (!dv) {
          ctx.addIssue({
            code: 'custom',
            message: txt('matTranTangLuong.validation.canBoNotInDonVi'),
            path: ['can_bo_id'],
          });
          return;
        }
        const cb = canBoList.find((c) => String(c.id) === data.can_bo_id.trim());
        const cbDv = String(cb?.don_vi_id ?? '').trim();
        if (!cbDv || cbDv !== dv) {
          ctx.addIssue({
            code: 'custom',
            message: txt('matTranTangLuong.validation.canBoNotInDonVi'),
            path: ['can_bo_id'],
          });
        }
      }),
    [viewer, canBoList],
  );

  const createMutation = useCreateMttqTangLuong(onClose);
  const updateMutation = useUpdateMttqTangLuong(onClose);

  const defaultValues = useMemo(
    () =>
      tangLuongToFormInput(initialData ?? null, {
        can_bo_id: defaultCanBoId,
        ngach_luong_id_moi: defaultNgachMoiId,
        bac_luong_id_moi: defaultBacMoiId,
      }),
    [initialData, defaultCanBoId, defaultNgachMoiId, defaultBacMoiId],
  );

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MttqTangLuongFormValues>({
    defaultValues,
    resolver: zodResolver(formSchema) as Resolver<MttqTangLuongFormValues>,
  });

  const prevBacForLuongRef = useRef<string | null>(null);

  useEffect(() => {
    reset(defaultValues);
    prevBacForLuongRef.current = defaultValues.bac_luong_id_moi?.trim() || null;
  }, [defaultValues, reset]);

  const canBoId = watch('can_bo_id');
  const ngachMoiId = watch('ngach_luong_id_moi');
  const ngachCuId = watch('ngach_luong_id_cu');
  const bacMoiId = watch('bac_luong_id_moi');
  const luongValue = watch('luong');

  const { data: bacList = [] } = useLuongThietLapBacByNgach(ngachMoiId || null);
  const { data: bacCuList = [] } = useLuongThietLapBacByNgach(ngachCuId || null);

  const canBoOptions = useMemo(
    () =>
      buildTangLuongCanBoOptions({
        viewer,
        canBoList,
        ensureCanBoId: initialData?.can_bo_id,
        ensureCanBoLabel: initialData?.ho_ten_can_bo,
      }),
    [canBoList, initialData?.can_bo_id, initialData?.ho_ten_can_bo, viewer],
  );

  const ngachOptions = useMemo(
    () =>
      ngachList.map((n) => ({
        label: n.ma ? `${n.ten} (${n.ma})` : n.ten,
        value: n.id,
      })),
    [ngachList],
  );

  const bacCuOptions = useMemo(
    () =>
      bacCuList.map((b) => ({
        label: b.ma_bac,
        value: b.id,
        subLabel: String(b.he_so),
      })),
    [bacCuList],
  );

  const bacOptions = useMemo(
    () =>
      bacList.map((b) => ({
        label: b.ma_bac,
        value: b.id,
        subLabel: String(b.he_so),
      })),
    [bacList],
  );

  const loaiKyOptions = useMemo(
    () => MTTQ_TANG_LUONG_LOAI_KY_OPTIONS.map((o) => ({ label: o.label, value: o.value })),
    [],
  );

  const latestForCanBo = useMemo(() => {
    if (!canBoId?.trim()) return null;
    return getLatestRecordForCanBo(viewableHistory, canBoId.trim(), initialData?.id);
  }, [viewableHistory, canBoId, initialData?.id]);

  const ngayDenHanGoc = useMemo(
    () => computeNgayDenHanGoc(latestForCanBo?.ngay_nang_luong),
    [latestForCanBo],
  );

  const mlcsNum = Number(cauHinh?.muc_luong_co_so ?? 0);
  const luongFromBac = useMemo(() => {
    if (!bacMoiId?.trim()) return 0;
    const bac = bacList.find((b) => b.id === bacMoiId);
    const heSo = Number(bac?.he_so ?? 0);
    return computeLuongFromMlcsAndHeSo(mlcsNum, heSo);
  }, [bacList, bacMoiId, mlcsNum]);

  useEffect(() => {
    if (!bacMoiId?.trim() || luongFromBac <= 0) return;
    const cur = bacMoiId.trim();
    if (prevBacForLuongRef.current === cur) return;
    prevBacForLuongRef.current = cur;
    setValue('luong', luongFromBac, { shouldValidate: true });
  }, [bacMoiId, luongFromBac, setValue]);

  useEffect(() => {
    if (isEdit || !canBoId?.trim()) return;
    const latest = getLatestRecordForCanBo(viewableHistory, canBoId.trim());
    if (!latest) return;
    if (!defaultNgachMoiId) {
      setValue('ngach_luong_id_cu', latest.ngach_luong_id_moi ?? '');
      setValue('bac_luong_id_cu', latest.bac_luong_id_moi ?? '');
      if (!defaultNgachMoiId) setValue('ngach_luong_id_moi', latest.ngach_luong_id_moi);
      if (!defaultBacMoiId) setValue('bac_luong_id_moi', latest.bac_luong_id_moi);
    }
  }, [viewableHistory, canBoId, defaultBacMoiId, defaultNgachMoiId, isEdit, setValue]);

  useEffect(() => {
    if (!ngachMoiId) return;
    const stillValid = bacList.some((b) => b.id === watch('bac_luong_id_moi'));
    if (!stillValid) setValue('bac_luong_id_moi', '');
  }, [bacList, ngachMoiId, setValue, watch]);

  const submitCore = (data: MttqTangLuongFormValues) => {
    const dateErr = validateNgayTruocHan(data.ngay_nang_luong, ngayDenHanGoc, data.loai_ky);
    if (dateErr) {
      toast.error(dateErr);
      return;
    }
    const warn = checkConsecutiveEarlyAdvance(
      viewableHistory,
      data.can_bo_id,
      data.ngay_nang_luong,
      data.loai_ky,
      initialData?.id,
    );
    const doSave = () => {
      if (isEdit && initialData) {
        updateMutation.mutate({ id: initialData.id, data });
      } else {
        if (!idNguoiTao) {
          toast.error(txt('matTranTangLuong.service.noEmployeeProfile'));
          return;
        }
        createMutation.mutate({ data, idNguoiTao });
      }
    };
    if (warn.shouldWarn) {
      confirm({
        title: txt('common.confirm'),
        message: warn.message,
        variant: 'warning',
        confirmText: txt('common.save'),
        onConfirm: doSave,
      });
      return;
    }
    doSave();
  };

  const onSubmit: SubmitHandler<MttqTangLuongFormValues> = (data) => submitCore(data);

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<TrendingUp size={18} />}
      subtitle={
        isEdit
          ? txt('matTranTangLuong.form.editSubtitle')
          : txt('matTranTangLuong.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranTangLuong.form.sectionMain')} icon={<TrendingUp size={16} />}>
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="can_bo_id"
                control={control}
                render={({ field }) => (
                  <CanBoCombobox
                    label={txt('matTranTangLuong.form.canBo')}
                    icon={User}
                    options={canBoOptions}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.can_bo_id?.message}
                    disabled={isEdit}
                    required
                    createFormStackLevel={1}
                  />
                )}
              />
            </div>
            <Controller
              name="ngay_nang_luong"
              control={control}
              render={({ field }) => (
                <Input
                  type="date"
                  label={txt('matTranTangLuong.form.ngayNang')}
                  icon={Calendar}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.ngay_nang_luong?.message}
                  required
                />
              )}
            />
            <Controller
              name="loai_ky"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTangLuong.form.loaiKy')}
                  icon={TrendingUp}
                  options={loaiKyOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.loai_ky?.message}
                  required
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranTangLuong.form.ngayDenHanGoc')}
                icon={Calendar}
                value={ngayDenHanGoc ? formatDateShort(ngayDenHanGoc) : '—'}
                disabled
              />
              <p className="mt-1 text-xs text-muted-foreground">{txt('matTranTangLuong.form.ngayDenHanGocHint')}</p>
            </div>
            <Controller
              name="ngach_luong_id_cu"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTangLuong.form.ngachCu')}
                  icon={Layers}
                  options={ngachOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled
                />
              )}
            />
            <Controller
              name="bac_luong_id_cu"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTangLuong.form.bacCu')}
                  icon={Layers}
                  options={bacCuOptions}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  disabled
                />
              )}
            />
            <Controller
              name="ngach_luong_id_moi"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTangLuong.form.ngachMoi')}
                  icon={Layers}
                  options={ngachOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.ngach_luong_id_moi?.message}
                  required
                />
              )}
            />
            <Controller
              name="bac_luong_id_moi"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranTangLuong.form.bacMoi')}
                  icon={Layers}
                  options={bacOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.bac_luong_id_moi?.message}
                  disabled={!ngachMoiId}
                  required
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="luong"
                control={control}
                render={({ field }) => (
                  <NumericFormatInput
                    label={txt('matTranTangLuong.form.luong')}
                    icon={<Banknote className="h-4 w-4" />}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.luong?.message}
                    decimalScale={0}
                    min={1}
                    required
                  />
                )}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {Number(luongValue) > 0
                  ? txt('matTranTangLuong.form.luongHint')
                  : txt('matTranTangLuong.form.luongPreviewEmpty')}
              </p>
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="ghi_chu"
                control={control}
                render={({ field }) => (
                  <Textarea
                    label={txt('matTranTangLuong.form.ghiChu')}
                    icon={StickyNote}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    rows={3}
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="file_quyet_dinh"
                control={control}
                render={({ field }) => (
                  <>
                    <Input
                      label={txt('matTranTangLuong.form.fileQuyetDinh')}
                      icon={FileText}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">{txt('matTranTangLuong.form.fileQuyetDinhHint')}</p>
                  </>
                )}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqTangLuongForm;
