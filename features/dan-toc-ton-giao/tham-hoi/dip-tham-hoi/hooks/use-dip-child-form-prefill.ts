import { useEffect, useMemo } from 'react';
import { useWatch, type Control, type FieldValues, type Path, type UseFormGetValues, type UseFormSetValue } from 'react-hook-form';
import type { DipThamHoiOption } from '../core/types';

type PrefillFormFields = {
  dip_tham_hoi_id: string;
  phong_ban_tham_muu_id?: string;
  thoi_gian_du_kien?: string;
  thoi_gian_thuc_te?: string;
};

interface Options<T extends FieldValues & PrefillFormFields> {
  isEdit: boolean;
  dipOptions: DipThamHoiOption[];
  control: Control<T>;
  setValue: UseFormSetValue<T>;
  getValues: UseFormGetValues<T>;
  /** Thăm hỏi tổ chức dùng text; cá nhân dùng MonthYearPicker — mặc định false cho cá nhân */
  prefillThoiGianDuKien?: boolean;
}

export function useDipChildFormPrefill<T extends FieldValues & PrefillFormFields>({
  isEdit,
  dipOptions,
  control,
  setValue,
  getValues,
  prefillThoiGianDuKien = true,
}: Options<T>): void {
  const dipMap = useMemo(() => new Map(dipOptions.map((d) => [d.id, d])), [dipOptions]);
  const watchedDipId = useWatch({ control, name: 'dip_tham_hoi_id' as Path<T> });

  useEffect(() => {
    if (isEdit) return;
    const dipId = String(watchedDipId ?? '').trim();
    if (!dipId) return;
    const dip = dipMap.get(dipId);
    if (!dip) return;

    const values = getValues();
    const currentPb = String(values.phong_ban_tham_muu_id ?? '').trim();
    if (!currentPb && dip.phong_ban_tham_muu_id) {
      setValue('phong_ban_tham_muu_id' as Path<T>, dip.phong_ban_tham_muu_id as T[Path<T>]);
    }

    if (prefillThoiGianDuKien) {
      const currentTg = String(values.thoi_gian_du_kien ?? '').trim();
      if (!currentTg && dip.thoi_gian_du_kien) {
        setValue('thoi_gian_du_kien' as Path<T>, dip.thoi_gian_du_kien as T[Path<T>]);
      }
    }

    const currentTt = String(values.thoi_gian_thuc_te ?? '').trim();
    if (!currentTt && dip.thoi_gian_thuc_te) {
      setValue('thoi_gian_thuc_te' as Path<T>, dip.thoi_gian_thuc_te as T[Path<T>]);
    }
  }, [watchedDipId, dipMap, isEdit, setValue, getValues, prefillThoiGianDuKien]);
}
