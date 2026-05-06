import { z } from 'zod';
import { txt } from '@/lib/text';

export const baiVietDanhSachSchema = z.object({
  ten_bai: z.string().trim().min(1, txt('articleList.validation.tenBaiRequired')),
  id_the_loai: z.string().trim().min(1, txt('articleList.validation.theLoaiRequired')),
  don_gia: z.preprocess(
    (v) => {
      if (v === '' || v === undefined || v === null) return 0;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    },
    z.number().min(0, txt('articleList.validation.donGiaMin')),
  ),
  ngay_dang: z.string().trim().min(1, txt('articleList.validation.ngayDangRequired')),
  id_nguon_dang: z.string().trim().min(1, txt('articleList.validation.nguonDangRequired')),
  id_trang_dang: z.string().trim().min(1, txt('articleList.validation.trangDangRequired')),
  link: z
    .string()
    .trim()
    .min(1, txt('articleList.validation.linkRequired'))
    .url(txt('articleList.validation.linkUrl')),
});

export type BaiVietDanhSachFormValues = z.infer<typeof baiVietDanhSachSchema>;
