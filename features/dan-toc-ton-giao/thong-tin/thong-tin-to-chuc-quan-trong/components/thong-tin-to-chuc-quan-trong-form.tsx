import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  MapPin,
  Phone,
  Power,
  Star,
  Tag,
  Type,
  User,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import StatusToggle from '@/components/ui/StatusToggle';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useTinhThanhList, useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import {
  thongTinToChucQuanTrongSchema,
  thongTinToChucQuanTrongToFormInput,
  type ThongTinToChucQuanTrongFormInput,
  type ThongTinToChucQuanTrongFormValues,
} from '../core/schema';
import { LOAI_HINH_VALUES } from '../core/constants';
import type { ThongTinToChucQuanTrong } from '../core/types';
import {
  useCreateThongTinToChucQuanTrong,
  useUpdateThongTinToChucQuanTrong,
} from '../hooks/use-thong-tin-to-chuc-quan-trong';

const FORM_ID = 'dttg-thong-tin-to-chuc-quan-trong-form';

interface Props {
  initialData?: ThongTinToChucQuanTrong | null;
  onClose: () => void;
}

const ThongTinToChucQuanTrongForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');

  const createMutation = useCreateThongTinToChucQuanTrong(onClose);
  const updateMutation = useUpdateThongTinToChucQuanTrong(onClose);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const xaOptions = useMemo(
    () =>
      [...xaList]
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
        })),
    [xaList, tinhMap],
  );

  const loaiHinhOptions = useMemo(
    () => LOAI_HINH_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ThongTinToChucQuanTrongFormInput>({
    defaultValues: thongTinToChucQuanTrongToFormInput(null),
    resolver: zodResolver(thongTinToChucQuanTrongSchema) as Resolver<ThongTinToChucQuanTrongFormInput>,
  });

  useEffect(() => {
    reset(thongTinToChucQuanTrongToFormInput(initialData ?? null));
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<ThongTinToChucQuanTrongFormInput> = (data) => {
    const parsed = thongTinToChucQuanTrongSchema.parse(data) as ThongTinToChucQuanTrongFormValues;
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
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Star size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('danTocToChucQuanTrong.form.editSubtitle')} · ${initialData.ten_co_so}`
          : txt('danTocToChucQuanTrong.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<Star className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('danTocToChucQuanTrong.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="loai_hinh"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={loaiHinhOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v ?? '')}
                  label={txt('danTocToChucQuanTrong.form.loaiHinh')}
                  required
                  icon={<Tag size={14} />}
                  error={errors.loai_hinh?.message}
                  dropdownInPortal
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('danTocToChucQuanTrong.form.tenCoSo')}
                required
                icon={Star}
                {...register('ten_co_so')}
                error={errors.ten_co_so?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('danTocToChucQuanTrong.form.chuTri')}
                icon={User}
                {...register('chu_tri')}
                error={errors.chu_tri?.message}
              />
            </div>
            <Controller
              name="trang_thai"
              control={control}
              render={({ field }) => (
                <StatusToggle
                  label={txt('danTocToChucQuanTrong.form.trangThai')}
                  value={field.value}
                  onChange={field.onChange}
                  icon={<Power size={12} />}
                  activeLabel="Đang hoạt động"
                  inactiveLabel="Ngừng hoạt động"
                  error={errors.trang_thai?.message}
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocToChucQuanTrong.form.sectionContact')} icon={<MapPin size={14} />}>
          <FormGrid cols={2}>
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-1.5 sm:col-span-2">
                  <Combobox
                    options={xaOptions}
                    value={field.value === '' ? null : field.value}
                    onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                    label={txt('danTocToChucQuanTrong.form.donVi')}
                    placeholder={txt('danTocToChucQuanTrong.form.donVi')}
                    error={errors.don_vi_id?.message}
                    icon={<MapPin size={14} />}
                    clearable
                    dropdownInPortal
                    searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                  />
                  <p className="text-xs text-muted-foreground m-0">{txt('danTocToChucQuanTrong.form.donViHint')}</p>
                </div>
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('danTocToChucQuanTrong.form.diaChi')}
                icon={MapPin}
                {...register('dia_chi')}
                error={errors.dia_chi?.message}
              />
            </div>
            <Input
              label={txt('danTocToChucQuanTrong.form.soDienThoai')}
              icon={Phone}
              {...register('so_dien_thoai')}
              error={errors.so_dien_thoai?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('danTocToChucQuanTrong.form.sectionHistory')} icon={<FileText size={14} />}>
          <FormGrid cols={1}>
            <Textarea
              label={txt('danTocToChucQuanTrong.form.lichSuHinhThanh')}
              rows={4}
              icon={FileText}
              {...register('lich_su_hinh_thanh')}
              error={errors.lich_su_hinh_thanh?.message}
            />
            <Textarea
              label={txt('danTocToChucQuanTrong.form.congTacAnSinh')}
              rows={4}
              icon={FileText}
              {...register('cong_tac_an_sinh')}
              error={errors.cong_tac_an_sinh?.message}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default ThongTinToChucQuanTrongForm;
