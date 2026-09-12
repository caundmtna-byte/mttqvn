import React, { useEffect, useMemo } from 'react';
import { useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
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
import type { MttqCanBo } from '../core/types';
import { useCreateMttqCanBo, useUpdateMttqCanBo } from '../hooks/use-mttq-can-bo';
import { mttqCanBoRowToFormValues } from '../utils/can-bo-row-to-form-values';
import { buildMttqCanBoChucVuOptions } from '../utils/chuc-vu-options-for-phong-ban';
import { buildCanBoDefaultsForViewer } from '../utils/can-bo-defaults-for-viewer';
import { useMttqCanBoViewer } from '../hooks/use-mttq-can-bo-viewer';
import MttqCanBoFormBody from './mttq-can-bo-form-body';

function optionsByLoai(
  all: { id: string; loai: MttqThietLapLoai; ten: string }[],
  loai: MttqThietLapLoai,
): { label: string; value: string }[] {
  return all
    .filter((x) => x.loai === loai)
    .map((x) => ({ label: x.ten, value: String(x.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

interface Props {
  initialData?: MttqCanBo | null;
  onClose: () => void;
  /** Drawer xếp chồng (mặc định 0). */
  stackLevel?: number;
  /** Gọi sau khi tạo mới thành công, trước `onClose`. */
  onCreateSuccess?: (created: MttqCanBo) => void;
}

const MttqCanBoForm: React.FC<Props> = ({ initialData, onClose, stackLevel = 0, onCreateSuccess }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateMttqCanBo((created) => {
    onCreateSuccess?.(created);
    onClose();
  });
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

  const viewer = useMttqCanBoViewer();
  const viewerDonViId = viewer.viewerDonViId;
  /** Operator cấp Xã phường — điền sẵn phòng ban / cấp quản lý / đơn vị khi tạo mới (không khóa). */
  const isXaPhuongViewer = viewer.chucVuCapQuanLy === 'Xã phường';
  const defaultDonViFromViewer = isXaPhuongViewer && Boolean(viewerDonViId);

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

  const viewerDefaultValues = useMemo(
    () =>
      buildCanBoDefaultsForViewer({
        isXaPhuongViewer,
        viewerDonViId,
        viewerPhongBanId: user?.id_phong_ban ?? null,
        departments,
        selectablePhongBanIds: departmentOptions.map((o) => o.value),
      }),
    [isXaPhuongViewer, viewerDonViId, user?.id_phong_ban, departments, departmentOptions],
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
    defaultValues: viewerDefaultValues,
  });

  const selectedPhongBan = watch('id_phong_ban');
  const chucVuIdWatch = watch('chuc_vu_id');

  const optChucVu = useMemo(
    () =>
      buildMttqCanBoChucVuOptions({
        positions,
        departments,
        rootPhongBanId: selectedPhongBan ? String(selectedPhongBan) : '',
        ensureChucVuId: chucVuIdWatch,
      }),
    [positions, selectedPhongBan, departments, chucVuIdWatch],
  );

  useEffect(() => {
    const id = chucVuIdWatch ? String(chucVuIdWatch) : '';
    if (!id) return;
    if (!optChucVu.some((o) => o.value === id)) {
      setValue('chuc_vu_id', '');
      setValue('don_vi_id', '');
    }
  }, [optChucVu, chucVuIdWatch, setValue]);

  const watchedCapQuanLy = watch('cap_quan_ly') as string[];
  const needsDonViXaPhuong = Array.isArray(watchedCapQuanLy) && watchedCapQuanLy.includes('Xã phường');

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

  const donViIdWatch = watch('don_vi_id');
  useEffect(() => {
    if (isEdit) return;
    if (needsDonViXaPhuong && defaultDonViFromViewer && viewerDonViId && !donViIdWatch) {
      setValue('don_vi_id', viewerDonViId);
    }
  }, [isEdit, needsDonViXaPhuong, defaultDonViFromViewer, viewerDonViId, donViIdWatch, setValue]);

  useEffect(() => {
    if (initialData) {
      reset(mttqCanBoRowToFormValues(initialData, departments));
    } else {
      reset(viewerDefaultValues);
    }
  }, [initialData, reset, departments, viewerDefaultValues]);

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
      stackLevel={stackLevel}
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
        <MttqCanBoFormBody
          register={register}
          control={control}
          errors={errors}
          setValue={setValue}
          watch={watch}
          optToChuc={optToChuc}
          optDanToc={optDanToc}
          optTrinhDo={optTrinhDo}
          optLyLuan={optLyLuan}
          optTrangThai={optTrangThai}
          departmentOptions={departmentOptions}
          optChucVu={optChucVu}
          xaPhuongOptions={xaPhuongOptions}
          needsDonViXaPhuong={needsDonViXaPhuong}
        />
      </form>
    </GenericDrawer>
  );
};

export default MttqCanBoForm;
