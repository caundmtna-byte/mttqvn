import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  Flag,
  GraduationCap,
  Landmark,
  Layers,
  MapPin,
  Phone,
  User,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import type { MttqThietLapLoai } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/core/types';
import { useMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/hooks/use-mttq-thiet-lap';
import { usePositions } from '@/features/he-thong/chuc-vu/hooks/use-chuc-vu';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import { useTinhThanhList } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { queryKeys } from '@/lib/query-keys';
import { geoDataQueryOptions } from '@/lib/supabase/query-config';
import { buildMttqCanBoSchema, type MttqCanBoFormValues } from '../core/schema';
import { MTTQ_CAN_BO_GIOI_TINH } from '../core/constants';
import type { MttqCanBo } from '../core/types';
import { useCreateMttqCanBo, useUpdateMttqCanBo } from '../hooks/use-mttq-can-bo';
import { rootPhongBanIdForForm } from '../utils/phong-ban-form';

const DEFAULT_VALUES: MttqCanBoFormValues = {
  id_phong_ban: '',
  to_chuc_id: '',
  ho_ten: '',
  ngay_sinh: '',
  gioi_tinh: 'Nam',
  dan_toc_id: '',
  ton_giao: '',
  dia_chi: '',
  dang_vien: false,
  trinh_do_id: '',
  ly_luan_chinh_tri_id: '',
  dien_thoai: '',
  chuc_vu_id: '',
  don_vi_id: '',
  ngay_tham_gia_to_chuc: '',
  trang_thai_id: '',
  ngay_nhap_trang_thai: '',
  van_hoa: '',
  ngay_vao_dang: '',
  que_quan: '',
  noi_o_hien_nay: '',
};

function optionsByLoai(
  all: { id: string; loai: MttqThietLapLoai; ten: string }[],
  loai: MttqThietLapLoai,
): { label: string; value: string }[] {
  return all
    .filter((x) => x.loai === loai)
    .map((x) => ({ label: x.ten, value: String(x.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

function toFormFk(v: string | null | undefined): string {
  return v != null && String(v).trim() !== '' ? String(v) : '';
}

function toFormDate(v: string | null | undefined): string {
  if (v == null || v === '') return '';
  return String(v).slice(0, 10);
}

interface Props {
  initialData?: MttqCanBo | null;
  onClose: () => void;
}

const MttqCanBoForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateMttqCanBo(onClose);
  const updateMutation = useUpdateMttqCanBo(onClose);

  const { data: thietLapAll = [] } = useMttqThietLapAll();
  const canViewPositions = useCan('view', 'positions');
  const canCreateCanBo = useCan('create', 'matTranOfficerList');
  const canEditCanBo = useCan('edit', 'matTranOfficerList');
  const { data: positions = [] } = usePositions({
    enabled: canViewPositions || canCreateCanBo || canEditCanBo,
  });
  const { data: departments = [] } = useDepartments();
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaPhuongList = [] } = useQuery({
    queryKey: queryKeys.xaPhuong.listAll,
    queryFn: getXaPhuongAll,
    ...geoDataQueryOptions,
  });

  const optToChuc = useMemo(() => optionsByLoai(thietLapAll, 'to_chuc'), [thietLapAll]);
  const optDanToc = useMemo(() => optionsByLoai(thietLapAll, 'dan_toc'), [thietLapAll]);
  const optTrinhDo = useMemo(() => optionsByLoai(thietLapAll, 'trinh_do'), [thietLapAll]);
  const optLyLuan = useMemo(() => optionsByLoai(thietLapAll, 'ly_luan_chinh_tri'), [thietLapAll]);
  const optTrangThai = useMemo(() => optionsByLoai(thietLapAll, 'trang_thai'), [thietLapAll]);

  const departmentOptions = useMemo(
    () =>
      departments
        .filter((d) => d.trang_thai === 'Đang hoạt động' && !d.cha_id)
        .map((d) => ({ label: d.ten_phong_ban, value: d.id }))
        .sort((a, b) => a.label.localeCompare(b.label, 'vi')),
    [departments],
  );

  const canBoResolver = useMemo(
    () => zodResolver(buildMttqCanBoSchema(positions, initialData, departments)) as Resolver<MttqCanBoFormValues>,
    [positions, initialData, departments],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<MttqCanBoFormValues>({
    resolver: canBoResolver,
    defaultValues: DEFAULT_VALUES,
  });

  const selectedPhongBan = watch('id_phong_ban');
  const chucVuIdWatch = watch('chuc_vu_id');

  const optChucVu = useMemo(() => {
    const active = positions.filter((p) => p.trang_thai === 'Đang hoạt động');
    const root = selectedPhongBan ? String(selectedPhongBan) : '';
    if (!root) return [];
    const allowedDeptIds = new Set<string>([root]);
    for (const d of departments) {
      if (d.trang_thai === 'Đang hoạt động' && d.cha_id != null && String(d.cha_id) === root) {
        allowedDeptIds.add(String(d.id));
      }
    }
    return active
      .filter((p) => {
        const pb = p.phong_ban_id == null || p.phong_ban_id === '' ? '' : String(p.phong_ban_id);
        if (!pb) return false;
        return allowedDeptIds.has(pb);
      })
      .map((p) => ({ label: p.ten_chuc_vu, value: String(p.id) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [positions, selectedPhongBan, departments]);

  const needsDonViXaPhuong = useMemo(() => {
    const id = chucVuIdWatch ? String(chucVuIdWatch) : '';
    if (!id) return false;
    const p = positions.find((x) => String(x.id) === id);
    return p?.cap_quan_ly === 'Xã phường';
  }, [positions, chucVuIdWatch]);

  const tinhById = useMemo(() => new Map(tinhList.map((t) => [t.id, t.ten])), [tinhList]);

  const xaPhuongOptions = useMemo(() => {
    const rows = [...xaPhuongList].sort((a, b) => {
      const ta = (tinhById.get(a.id_tinh_thanh) ?? '').localeCompare(tinhById.get(b.id_tinh_thanh) ?? '', 'vi');
      if (ta !== 0) return ta;
      return a.ten.localeCompare(b.ten, 'vi');
    });
    return rows.map((x) => {
      const tinhTen = tinhById.get(x.id_tinh_thanh) ?? '';
      return {
        label: tinhTen ? `${x.ten} (${tinhTen})` : x.ten,
        value: String(x.id),
      };
    });
  }, [xaPhuongList, tinhById]);

  useEffect(() => {
    if (!needsDonViXaPhuong) {
      setValue('don_vi_id', '');
    }
  }, [needsDonViXaPhuong, setValue]);

  const gioiTinhOptions = useMemo(
    () => MTTQ_CAN_BO_GIOI_TINH.map((g) => ({ label: g, value: g })),
    [],
  );

  useEffect(() => {
    const idPb = rootPhongBanIdForForm(initialData?.phong_ban_id, departments);
    if (initialData) {
      reset({
        id_phong_ban: idPb,
        to_chuc_id: toFormFk(initialData.to_chuc_id),
        ho_ten: initialData.ho_ten,
        ngay_sinh: toFormDate(initialData.ngay_sinh),
        gioi_tinh: initialData.gioi_tinh as MttqCanBoFormValues['gioi_tinh'],
        dan_toc_id: toFormFk(initialData.dan_toc_id),
        ton_giao: initialData.ton_giao ?? '',
        dia_chi: initialData.dia_chi ?? '',
        dang_vien: initialData.dang_vien,
        trinh_do_id: toFormFk(initialData.trinh_do_id),
        ly_luan_chinh_tri_id: toFormFk(initialData.ly_luan_chinh_tri_id),
        dien_thoai: initialData.dien_thoai ?? '',
        chuc_vu_id: toFormFk(initialData.chuc_vu_id),
        don_vi_id: toFormFk(initialData.don_vi_id),
        ngay_tham_gia_to_chuc: toFormDate(initialData.ngay_tham_gia_to_chuc),
        trang_thai_id: toFormFk(initialData.trang_thai_id),
        ngay_nhap_trang_thai: toFormDate(initialData.ngay_nhap_trang_thai),
        van_hoa: initialData.van_hoa ?? '',
        ngay_vao_dang: toFormDate(initialData.ngay_vao_dang),
        que_quan: initialData.que_quan ?? '',
        noi_o_hien_nay: initialData.noi_o_hien_nay ?? '',
      });
    } else {
      reset({ ...DEFAULT_VALUES });
    }
  }, [initialData, reset, departments]);

  const onSubmit: SubmitHandler<MttqCanBoFormValues> = (data) => {
    if (!isEdit && !idNguoiTao) {
      toast.error(txt('matTranCanBo.service.noEmployeeProfile'));
      return;
    }
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate({ data, idNguoiTao });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Users size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranCanBo.form.editSubtitle')} · ${initialData.ho_ten}`
          : txt('matTranCanBo.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId="mttq-can-bo-form"
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
        />
      }
    >
      <form id="mttq-can-bo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranCanBo.form.sectionNhanThan')} icon={<User size={14} />} variant="primary">
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranCanBo.form.hoTen')}
                icon={<User size={12} />}
                {...register('ho_ten')}
                error={errors.ho_ten?.message}
                required
              />
            </div>
            <Input
              label={txt('matTranCanBo.form.ngaySinh')}
              type="date"
              icon={<Calendar size={12} />}
              {...register('ngay_sinh')}
              error={errors.ngay_sinh?.message}
              required
            />
            <Controller
              name="gioi_tinh"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.gioiTinh')}
                  icon={<User size={12} />}
                  options={gioiTinhOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.gioi_tinh?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="dan_toc_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.danToc')}
                  icon={<Flag size={12} />}
                  options={optDanToc}
                  value={field.value}
                  onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                  placeholder={txt('common.select')}
                  error={errors.dan_toc_id?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Input
              label={txt('matTranCanBo.form.tonGiao')}
              icon={<Landmark size={12} />}
              {...register('ton_giao')}
              error={errors.ton_giao?.message}
              required
            />
            <div className="flex items-center gap-2 pt-6">
              <Controller
                name="dang_vien"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary accent-primary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    {txt('matTranCanBo.form.dangVien')}
                  </label>
                )}
              />
            </div>
            <Input
              label={txt('matTranCanBo.form.ngayVaoDang')}
              type="date"
              icon={<Calendar size={12} />}
              {...register('ngay_vao_dang')}
              error={errors.ngay_vao_dang?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionToChuc')} icon={<Building2 size={14} />} variant="primary">
          <FormGrid>
            <Controller
              name="to_chuc_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.toChuc')}
                  icon={<Building2 size={12} />}
                  options={optToChuc}
                  value={field.value}
                  onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                  placeholder={txt('common.select')}
                  error={errors.to_chuc_id?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="id_phong_ban"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.phongBan')}
                  icon={<Layers size={12} />}
                  options={departmentOptions}
                  value={field.value}
                  onChange={(v) => {
                    const next = v === '' ? '' : String(v);
                    if (next !== field.value) {
                      setValue('chuc_vu_id', '');
                      setValue('don_vi_id', '');
                    }
                    field.onChange(next);
                  }}
                  placeholder={txt('employee.form.departmentPlaceholder')}
                  error={errors.id_phong_ban?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="chuc_vu_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.chucVu')}
                  icon={<Briefcase size={12} />}
                  options={optChucVu}
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v === '' ? '' : String(v));
                    setValue('don_vi_id', '');
                  }}
                  placeholder={txt('common.select')}
                  error={errors.chuc_vu_id?.message}
                  required
                  disabled={!selectedPhongBan}
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            {needsDonViXaPhuong && (
              <Controller
                name="don_vi_id"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('matTranCanBo.form.donVi')}
                    icon={<MapPin size={12} />}
                    options={xaPhuongOptions}
                    value={field.value}
                    onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                    placeholder={txt('common.select')}
                    hint={txt('matTranCanBo.form.donViHint')}
                    error={errors.don_vi_id?.message}
                    required
                    searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                    dropdownInPortal
                  />
                )}
              />
            )}
            <Input
              label={txt('matTranCanBo.form.ngayThamGiaToChuc')}
              type="date"
              icon={<CalendarClock size={12} />}
              {...register('ngay_tham_gia_to_chuc')}
              error={errors.ngay_tham_gia_to_chuc?.message}
              required
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionHocVan')} icon={<GraduationCap size={14} />} variant="primary">
          <FormGrid>
            <Controller
              name="trinh_do_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.trinhDo')}
                  icon={<GraduationCap size={12} />}
                  options={optTrinhDo}
                  value={field.value}
                  onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                  placeholder={txt('common.select')}
                  error={errors.trinh_do_id?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="ly_luan_chinh_tri_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.lyLuanChinhTri')}
                  icon={<BookOpen size={12} />}
                  options={optLyLuan}
                  value={field.value}
                  onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                  placeholder={txt('common.select')}
                  error={errors.ly_luan_chinh_tri_id?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Input
              label={txt('matTranCanBo.form.vanHoa')}
              icon={<BookOpen size={12} />}
              {...register('van_hoa')}
              error={errors.van_hoa?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionLienHe')} icon={<MapPin size={14} />} variant="primary">
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranCanBo.form.diaChi')}
                icon={<MapPin size={12} />}
                {...register('dia_chi')}
                rows={2}
                error={errors.dia_chi?.message}
                required
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranCanBo.form.queQuan')}
                icon={<MapPin size={12} />}
                {...register('que_quan')}
                rows={2}
                error={errors.que_quan?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('matTranCanBo.form.noiOHienNay')}
                icon={<MapPin size={12} />}
                {...register('noi_o_hien_nay')}
                rows={2}
                error={errors.noi_o_hien_nay?.message}
              />
            </div>
            <Input
              label={txt('matTranCanBo.form.dienThoai')}
              icon={<Phone size={12} />}
              {...register('dien_thoai')}
              error={errors.dien_thoai?.message}
              required
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionTrangThai')} icon={<Activity size={14} />} variant="primary">
          <FormGrid>
            <Controller
              name="trang_thai_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.trangThai')}
                  icon={<Activity size={12} />}
                  options={optTrangThai}
                  value={field.value}
                  onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                  placeholder={txt('common.select')}
                  error={errors.trang_thai_id?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Input
              label={txt('matTranCanBo.form.ngayNhapTrangThai')}
              type="date"
              icon={<Calendar size={12} />}
              {...register('ngay_nhap_trang_thai')}
              error={errors.ngay_nhap_trang_thai?.message}
              required
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqCanBoForm;
