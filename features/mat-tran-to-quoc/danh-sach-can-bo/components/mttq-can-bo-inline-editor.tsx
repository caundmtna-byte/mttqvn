import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
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
import { MTTQ_CAN_BO_FORM_DEFAULT_VALUES } from '../core/default-form-values';
import type { MttqCanBo } from '../core/types';
import { mttqCanBoRowToFormValues } from '../utils/can-bo-row-to-form-values';
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

export interface MttqCanBoInlineEditorHandle {
  /** `trigger` + lấy giá trị; `null` khi không hợp lệ. */
  validateAndGet: () => Promise<MttqCanBoFormValues | null>;
}

interface Props {
  /** Bản ghi cán bộ đầy đủ (list hoặc chi tiết). */
  row: MttqCanBo;
}

const MttqCanBoInlineEditor = forwardRef<MttqCanBoInlineEditorHandle, Props>(function MttqCanBoInlineEditor(
  { row },
  ref,
) {
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
    () => zodResolver(buildMttqCanBoSchema(positions, row, departments)) as Resolver<MttqCanBoFormValues>,
    [positions, row, departments],
  );

  const {
    register,
    control,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger,
    getValues,
  } = useForm<MttqCanBoFormValues>({
    resolver: canBoResolver,
    defaultValues: MTTQ_CAN_BO_FORM_DEFAULT_VALUES,
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

  const positionsForCap = useMemo(
    () => positions.map((p) => ({ id: String(p.id), cap_quan_ly: p.cap_quan_ly ?? null })),
    [positions],
  );

  useEffect(() => {
    if (!needsDonViXaPhuong) {
      setValue('don_vi_id', '');
    }
  }, [needsDonViXaPhuong, setValue]);

  useEffect(() => {
    reset(mttqCanBoRowToFormValues(row, departments));
  }, [row, departments, reset]);

  useImperativeHandle(ref, () => ({
    validateAndGet: async () => {
      const ok = await trigger();
      if (!ok) return null;
      return getValues();
    },
  }));

  return (
    <div className="space-y-6">
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
        positionsForCap={positionsForCap}
        needsDonViXaPhuong={needsDonViXaPhuong}
      />
    </div>
  );
});

export default MttqCanBoInlineEditor;
