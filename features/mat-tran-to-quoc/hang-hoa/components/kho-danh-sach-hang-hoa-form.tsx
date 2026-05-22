import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, FileText, ListOrdered, FolderTree } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox, { type Option } from '@/components/ui/Combobox';
import StatusToggle from '@/components/ui/StatusToggle';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import { khoDanhSachHangHoaSchema, type KhoDanhSachHangHoaFormValues } from '../core/schema';
import type { KhoDanhMucHangHoaListRow, KhoDanhSachHangHoaListRow } from '../core/types';
import { useCreateKhoDanhSachHangHoa, useUpdateKhoDanhSachHangHoa } from '../hooks/use-kho-danh-sach-hang-hoa';
import { buildDonViTinhSuggestions } from '../utils/don-vi-tinh';
import { nextThuTuHangHoaTrongDanhMuc } from '../utils/next-thu-tu';

const FORM_ID = 'kho-danh-sach-hang-hoa-form';

const DEFAULT_VALUES: KhoDanhSachHangHoaFormValues = {
  id_danh_muc: '',
  ten_hang_hoa: '',
  don_vi_tinh: '',
  mo_ta: '',
  quy_cach: '',
  thu_tu: 0,
  trang_thai: 'Đang hoạt động',
};

interface Props {
  initialData?: KhoDanhSachHangHoaListRow | null;
  danhMucList: KhoDanhMucHangHoaListRow[];
  /** Danh sách hàng (toàn hệ thống) — gợi ý ĐVT + tính `thu_tu` theo anh em trong danh mục */
  hangHoaListForSuggestions?: readonly KhoDanhSachHangHoaListRow[];
  /** Khi thêm từ chi tiết danh mục — gán danh mục mặc định */
  presetDanhMucId?: string | null;
  onClose: () => void;
}

const KhoDanhSachHangHoaForm: React.FC<Props> = ({
  initialData,
  danhMucList,
  hangHoaListForSuggestions = [],
  presetDanhMucId,
  onClose,
}) => {
  const isEdit = Boolean(initialData);
  const createMutation = useCreateKhoDanhSachHangHoa(onClose);
  const updateMutation = useUpdateKhoDanhSachHangHoa(onClose);

  const danhMucOptions = useMemo(
    () =>
      [...danhMucList]
        .sort((a, b) => a.thu_tu - b.thu_tu || a.ten_danh_muc.localeCompare(b.ten_danh_muc, 'vi'))
        .map((d) => ({
          label: d.ten_danh_muc,
          value: d.id,
        })),
    [danhMucList],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<KhoDanhSachHangHoaFormValues>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(khoDanhSachHangHoaSchema) as Resolver<KhoDanhSachHangHoaFormValues>,
  });

  const idDanhMucW = useWatch({ control, name: 'id_danh_muc' });
  const donViTinhW = useWatch({ control, name: 'don_vi_tinh' });

  const donViOptions = useMemo((): Option[] => {
    const seen = new Map<string, Option>();
    for (const u of buildDonViTinhSuggestions(hangHoaListForSuggestions)) {
      seen.set(u.toLowerCase(), { label: u, value: u });
    }
    for (const raw of [donViTinhW, initialData?.don_vi_tinh]) {
      const t = String(raw ?? '').trim();
      if (!t) continue;
      const k = t.toLowerCase();
      if (!seen.has(k)) seen.set(k, { label: t, value: t });
    }
    return [...seen.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }),
    );
  }, [hangHoaListForSuggestions, donViTinhW, initialData?.don_vi_tinh]);

  useEffect(() => {
    if (initialData) {
      reset({
        id_danh_muc: String(initialData.id_danh_muc ?? '').trim(),
        ten_hang_hoa: initialData.ten_hang_hoa,
        don_vi_tinh: initialData.don_vi_tinh,
        mo_ta: initialData.mo_ta ?? '',
        quy_cach: initialData.quy_cach ?? '',
        thu_tu: initialData.thu_tu,
        trang_thai: initialData.trang_thai === 'Ngừng hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động',
      });
    } else {
      reset(DEFAULT_VALUES);
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (initialData || danhMucOptions.length === 0) return;
    if (presetDanhMucId && danhMucOptions.some((o) => o.value === presetDanhMucId)) {
      setValue('id_danh_muc', presetDanhMucId);
      return;
    }
    const cur = getValues('id_danh_muc');
    if (!cur) setValue('id_danh_muc', danhMucOptions[0].value);
  }, [initialData, danhMucOptions, getValues, setValue, presetDanhMucId]);

  useEffect(() => {
    if (initialData) return;
    const id = String(idDanhMucW ?? '').trim();
    if (!id) return;
    setValue('thu_tu', nextThuTuHangHoaTrongDanhMuc(hangHoaListForSuggestions, id));
  }, [initialData, idDanhMucW, hangHoaListForSuggestions, setValue]);

  const onSubmit: SubmitHandler<KhoDanhSachHangHoaFormValues> = (data) => {
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Package size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranHangHoa.formHang.editSubtitle')} · ${initialData.ten_hang_hoa}`
          : txt('matTranHangHoa.formHang.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Package className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranHangHoa.formHang.section')} icon={<Package size={14} />}>
          <FormGrid cols={2}>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="id_danh_muc"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranHangHoa.formHang.danhMuc')}
                    options={danhMucOptions}
                    value={field.value}
                    onChange={field.onChange}
                    required
                    clearable={false}
                    error={errors.id_danh_muc?.message}
                    icon={<FolderTree size={12} />}
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranHangHoa.store.tenHangHoa')}
                required
                {...register('ten_hang_hoa')}
                error={errors.ten_hang_hoa?.message}
                icon={<Package size={12} />}
              />
            </div>
            <Controller
              name="don_vi_tinh"
              control={control}
              render={({ field }) => (
                <Combobox
                  creatable
                  creatableActionLabel={(s) => txt('matTranHangHoa.formHang.donViCreatableAction', { unit: s })}
                  dropdownInPortal
                  label={txt('matTranHangHoa.store.donViTinh')}
                  hint={txt('matTranHangHoa.formHang.donViHint')}
                  searchPlaceholder={txt('matTranHangHoa.formHang.donViSearchPlaceholder')}
                  options={donViOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(typeof v === 'string' ? v : String(v))}
                  required
                  error={errors.don_vi_tinh?.message}
                  icon={<ListOrdered size={12} />}
                  clearable
                />
              )}
            />
            <Input
              label={txt('matTranHangHoa.store.quyCach')}
              {...register('quy_cach')}
              error={errors.quy_cach?.message}
              icon={<FileText size={12} />}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranHangHoa.store.moTa')}
                rows={2}
                className="resize-y min-h-[72px]"
                {...register('mo_ta')}
                error={errors.mo_ta?.message}
                icon={<FileText size={12} />}
              />
            </div>
            <div className="space-y-1">
              <Input
                label={txt('matTranHangHoa.store.thuTu')}
                type="number"
                min={0}
                {...register('thu_tu', { valueAsNumber: true })}
                error={errors.thu_tu?.message}
                icon={<ListOrdered size={12} />}
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground leading-snug">{txt('matTranHangHoa.formHang.thuTuAutoHint')}</p>
              )}
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="trang_thai"
                control={control}
                render={({ field }) => (
                  <StatusToggle
                    label={txt('matTranHangHoa.store.trangThai')}
                    value={field.value}
                    onChange={field.onChange}
                    icon={<ListOrdered size={12} />}
                    activeLabel={TRANG_THAI_HOAT_DONG[1]}
                    inactiveLabel={TRANG_THAI_HOAT_DONG[0]}
                    required
                  />
                )}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default KhoDanhSachHangHoaForm;
