import type { z } from 'zod';
import type { companySchema } from './schema';

/** Giá trị form Thông tin công ty (không bao gồm logo – logo xử lý riêng trong UI) */
export type CompanyFormValues = z.infer<typeof companySchema>;
