import { Position } from '../core/types';
import { PositionFormValues, positionSchema } from '../core/schema';
import { parseTrangThaiHoatDongImport, type TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { getJobLevels } from '../../cap-bac/services/cap-bac-service';
import { getDepartments } from '../../phong-ban/services/phong-ban-service';
import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import {
  POSITION_RETURNING_FULL,
  POSITION_RETURNING_STATUS_ONLY,
  POSITION_SELECT_FULL,
} from '../core/supabase-select';
import { txt } from '../../../../lib/text';

const ts = () => new Date().toISOString();

// --- Mock Data: Chức vụ liên kết Phòng ban + Cấp bậc ---
const MOCK_POSITIONS: Position[] = [
  // Phòng Ban Giám đốc (dep-0)
  { id: "pos-1", ma_chuc_vu: "CEO", ten_chuc_vu: "Tổng Giám Đốc", cap_bac_id: "lvl-1", ten_cap_bac: "Giám đốc", phong_ban_id: "dep-0", ten_phong_ban: "Phòng Ban Giám đốc", mo_ta: "Điều hành toàn bộ hoạt động công ty", thu_tu: 1, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-2", ma_chuc_vu: "PCEO", ten_chuc_vu: "Phó Tổng Giám Đốc", cap_bac_id: "lvl-2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-0", ten_phong_ban: "Phòng Ban Giám đốc", mo_ta: "Hỗ trợ Tổng Giám đốc điều hành", thu_tu: 2, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-3", ma_chuc_vu: "GD-DH", ten_chuc_vu: "Trưởng Nhóm Điều hành", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-0-1", ten_phong_ban: "Nhóm điều hành", mo_ta: "Điều phối công việc điều hành", thu_tu: 3, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-4", ma_chuc_vu: "GD-TL", ten_chuc_vu: "Trưởng Nhóm Trợ lý", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-0-2", ten_phong_ban: "Nhóm trợ lý", mo_ta: "Quản lý đội trợ lý Giám đốc", thu_tu: 4, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-5", ma_chuc_vu: "TL-GD", ten_chuc_vu: "Trợ lý Giám đốc", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-0-2", ten_phong_ban: "Nhóm trợ lý", mo_ta: "Hỗ trợ hành chính, lịch làm việc", thu_tu: 5, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-6", ma_chuc_vu: "NV-DH", ten_chuc_vu: "Chuyên viên Điều hành", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-0-1", ten_phong_ban: "Nhóm điều hành", mo_ta: "Theo dõi tiến độ, báo cáo", thu_tu: 6, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Kỹ thuật (dep-1)
  { id: "pos-10", ma_chuc_vu: "TP-KT", ten_chuc_vu: "Trưởng Phòng Kỹ thuật", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-1", ten_phong_ban: "Phòng Kỹ thuật", mo_ta: "Quản lý toàn bộ mảng kỹ thuật", thu_tu: 10, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-11", ma_chuc_vu: "PP-KT", ten_chuc_vu: "Phó Phòng Kỹ thuật", cap_bac_id: "lvl-2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-1", ten_phong_ban: "Phòng Kỹ thuật", mo_ta: "Hỗ trợ trưởng phòng kỹ thuật", thu_tu: 11, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-12", ma_chuc_vu: "TN-DEV", ten_chuc_vu: "Trưởng Nhóm Phát triển", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Lead team dev, review code", thu_tu: 12, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-13", ma_chuc_vu: "TN-INFRA", ten_chuc_vu: "Trưởng Nhóm Hạ tầng", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-1-2", ten_phong_ban: "Nhóm Hạ tầng IT", mo_ta: "Quản lý hệ thống, DevOps", thu_tu: 13, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-14", ma_chuc_vu: "DEV-SR", ten_chuc_vu: "Lập trình viên Senior", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Phát triển phần mềm cốt lõi", thu_tu: 14, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-15", ma_chuc_vu: "DEV-JR", ten_chuc_vu: "Lập trình viên Junior", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: null, thu_tu: 15, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-16", ma_chuc_vu: "SYS-ADMIN", ten_chuc_vu: "Quản trị hệ thống", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-2", ten_phong_ban: "Nhóm Hạ tầng IT", mo_ta: "Vận hành server, mạng", thu_tu: 16, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Nhân sự (dep-2)
  { id: "pos-20", ma_chuc_vu: "TP-NS", ten_chuc_vu: "Trưởng Phòng Nhân sự", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: "Quản lý tuyển dụng, đào tạo, chính sách", thu_tu: 20, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-21", ma_chuc_vu: "PP-NS", ten_chuc_vu: "Phó Phòng Nhân sự", cap_bac_id: "lvl-2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: null, thu_tu: 21, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-22", ma_chuc_vu: "CV-TD", ten_chuc_vu: "Chuyên viên Tuyển dụng", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2-1", ten_phong_ban: "Nhóm Tuyển dụng", mo_ta: "Tuyển dụng, phỏng vấn", thu_tu: 22, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-23", ma_chuc_vu: "CV-DT", ten_chuc_vu: "Chuyên viên Đào tạo", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2-2", ten_phong_ban: "Nhóm Đào tạo", mo_ta: "Xây dựng và triển khai đào tạo", thu_tu: 23, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Tài chính - Kế toán (dep-3)
  { id: "pos-30", ma_chuc_vu: "TP-TC", ten_chuc_vu: "Trưởng Phòng Tài chính", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-3", ten_phong_ban: "Phòng Tài chính - Kế toán", mo_ta: "Quản lý tài chính, kế toán", thu_tu: 30, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-31", ma_chuc_vu: "KT-TR", ten_chuc_vu: "Kế toán trưởng", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-3-1", ten_phong_ban: "Nhóm Kế toán", mo_ta: "Điều hành công tác kế toán", thu_tu: 31, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-32", ma_chuc_vu: "CV-KT", ten_chuc_vu: "Kế toán viên", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3-1", ten_phong_ban: "Nhóm Kế toán", mo_ta: null, thu_tu: 32, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-33", ma_chuc_vu: "CV-TCDN", ten_chuc_vu: "Chuyên viên Tài chính", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3-2", ten_phong_ban: "Nhóm Tài chính", mo_ta: "Phân tích, dự báo tài chính", thu_tu: 33, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Kinh doanh (dep-4)
  { id: "pos-40", ma_chuc_vu: "TP-KD", ten_chuc_vu: "Trưởng Phòng Kinh doanh", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-4", ten_phong_ban: "Phòng Kinh doanh", mo_ta: "Chỉ đạo hoạt động kinh doanh", thu_tu: 40, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-41", ma_chuc_vu: "TN-B2B", ten_chuc_vu: "Trưởng Nhóm Kinh doanh B2B", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-4-1", ten_phong_ban: "Nhóm Kinh doanh B2B", mo_ta: null, thu_tu: 41, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-42", ma_chuc_vu: "TN-B2C", ten_chuc_vu: "Trưởng Nhóm Kinh doanh B2C", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-4-2", ten_phong_ban: "Nhóm Kinh doanh B2C", mo_ta: null, thu_tu: 42, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-43", ma_chuc_vu: "NV-KD", ten_chuc_vu: "Nhân viên Kinh doanh", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-4-1", ten_phong_ban: "Nhóm Kinh doanh B2B", mo_ta: "Chăm sóc khách hàng doanh nghiệp", thu_tu: 43, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-44", ma_chuc_vu: "NV-B2C", ten_chuc_vu: "Nhân viên B2C", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-4-2", ten_phong_ban: "Nhóm Kinh doanh B2C", mo_ta: null, thu_tu: 44, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Kho vận (dep-5)
  { id: "pos-50", ma_chuc_vu: "TP-KHO", ten_chuc_vu: "Trưởng Phòng Kho vận", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-5", ten_phong_ban: "Phòng Kho vận", mo_ta: "Quản lý kho, xuất nhập", thu_tu: 50, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-51", ma_chuc_vu: "TN-NHAP", ten_chuc_vu: "Trưởng Nhóm Nhập kho", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-5-1", ten_phong_ban: "Nhóm Nhập kho", mo_ta: null, thu_tu: 51, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-52", ma_chuc_vu: "TN-XUAT", ten_chuc_vu: "Trưởng Nhóm Xuất kho", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-5-2", ten_phong_ban: "Nhóm Xuất kho", mo_ta: null, thu_tu: 52, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-53", ma_chuc_vu: "NV-KHO", ten_chuc_vu: "Nhân viên Kho", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5-1", ten_phong_ban: "Nhóm Nhập kho", mo_ta: "Kiểm nhận, sắp xếp hàng", thu_tu: 53, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Marketing (dep-6)
  { id: "pos-60", ma_chuc_vu: "TP-MKT", ten_chuc_vu: "Trưởng Phòng Marketing", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-6", ten_phong_ban: "Phòng Marketing", mo_ta: "Chiến lược marketing, thương hiệu", thu_tu: 60, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-61", ma_chuc_vu: "TN-DIGITAL", ten_chuc_vu: "Trưởng Nhóm Digital Marketing", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-6-1", ten_phong_ban: "Nhóm Digital Marketing", mo_ta: null, thu_tu: 61, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-62", ma_chuc_vu: "TN-BRAND", ten_chuc_vu: "Trưởng Nhóm Thương hiệu", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-6-2", ten_phong_ban: "Nhóm Thương hiệu", mo_ta: null, thu_tu: 62, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-63", ma_chuc_vu: "CV-MKT", ten_chuc_vu: "Chuyên viên Marketing", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6-1", ten_phong_ban: "Nhóm Digital Marketing", mo_ta: "Content, quảng cáo online", thu_tu: 63, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Hành chính (dep-7)
  { id: "pos-70", ma_chuc_vu: "TP-HC", ten_chuc_vu: "Trưởng Phòng Hành chính", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-7", ten_phong_ban: "Phòng Hành chính", mo_ta: "Quản lý hành chính, văn phòng", thu_tu: 70, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-71", ma_chuc_vu: "PP-HC", ten_chuc_vu: "Phó Phòng Hành chính", cap_bac_id: "lvl-2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-7", ten_phong_ban: "Phòng Hành chính", mo_ta: null, thu_tu: 71, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-72", ma_chuc_vu: "TN-VP", ten_chuc_vu: "Trưởng Nhóm Văn phòng", cap_bac_id: "lvl-3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: "Văn thư, tài sản, hậu cần", thu_tu: 72, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-73", ma_chuc_vu: "NV-HC", ten_chuc_vu: "Nhân viên Hành chính", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: null, thu_tu: 73, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-74", ma_chuc_vu: "NV-SK", ten_chuc_vu: "Nhân viên Tổ chức sự kiện", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-2", ten_phong_ban: "Nhóm Tổ chức sự kiện", mo_ta: null, thu_tu: 74, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // --- Thêm ~20 chức vụ mẫu ---
  { id: "pos-80", ma_chuc_vu: "DEV-FE", ten_chuc_vu: "Lập trình viên Frontend", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Phát triển giao diện người dùng", thu_tu: 80, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-81", ma_chuc_vu: "DEV-BE", ten_chuc_vu: "Lập trình viên Backend", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Phát triển API, xử lý nghiệp vụ", thu_tu: 81, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-82", ma_chuc_vu: "QA", ten_chuc_vu: "Chuyên viên Kiểm thử", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Kiểm thử chất lượng phần mềm", thu_tu: 82, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-83", ma_chuc_vu: "BA", ten_chuc_vu: "Chuyên viên Phân tích nghiệp vụ", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1", ten_phong_ban: "Phòng Kỹ thuật", mo_ta: "Phân tích yêu cầu, tài liệu", thu_tu: 83, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-84", ma_chuc_vu: "CV-CB", ten_chuc_vu: "Chuyên viên Chính sách & Đãi ngộ", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: "Xây dựng chính sách lương, phúc lợi", thu_tu: 84, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-85", ma_chuc_vu: "CV-NS", ten_chuc_vu: "Chuyên viên Nhân sự tổng hợp", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: "Hành chính nhân sự, hồ sơ", thu_tu: 85, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-86", ma_chuc_vu: "TQ", ten_chuc_vu: "Thủ quỹ", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3-2", ten_phong_ban: "Nhóm Tài chính", mo_ta: "Quản lý quỹ tiền mặt, đối chiếu", thu_tu: 86, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-87", ma_chuc_vu: "CV-KS", ten_chuc_vu: "Chuyên viên Kiểm soát nội bộ", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3", ten_phong_ban: "Phòng Tài chính - Kế toán", mo_ta: "Kiểm soát rủi ro, tuân thủ", thu_tu: 87, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-88", ma_chuc_vu: "NV-SALE-SP", ten_chuc_vu: "Nhân viên Hỗ trợ Kinh doanh", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-4", ten_phong_ban: "Phòng Kinh doanh", mo_ta: "Chuẩn bị báo giá, hồ sơ thầu", thu_tu: 88, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-89", ma_chuc_vu: "NV-XUAT", ten_chuc_vu: "Nhân viên Xuất kho", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5-2", ten_phong_ban: "Nhóm Xuất kho", mo_ta: "Đóng gói, xuất hàng, đối soát", thu_tu: 89, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-90", ma_chuc_vu: "THU-KHO", ten_chuc_vu: "Thủ kho", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5", ten_phong_ban: "Phòng Kho vận", mo_ta: "Quản lý tồn kho, sổ kho", thu_tu: 90, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-91", ma_chuc_vu: "CV-DESIGN", ten_chuc_vu: "Chuyên viên Thiết kế", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6-2", ten_phong_ban: "Nhóm Thương hiệu", mo_ta: "Thiết kế đồ họa, nhận diện thương hiệu", thu_tu: 91, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-92", ma_chuc_vu: "CV-COPY", ten_chuc_vu: "Copywriter", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6-1", ten_phong_ban: "Nhóm Digital Marketing", mo_ta: "Viết nội dung quảng cáo, SEO", thu_tu: 92, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-93", ma_chuc_vu: "NV-PR", ten_chuc_vu: "Nhân viên Truyền thông", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6", ten_phong_ban: "Phòng Marketing", mo_ta: "Quan hệ báo chí, truyền thông nội bộ", thu_tu: 93, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-94", ma_chuc_vu: "LE-TAN", ten_chuc_vu: "Lễ tân", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: "Đón tiếp khách, tổng đài", thu_tu: 94, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-95", ma_chuc_vu: "CV-VT", ten_chuc_vu: "Chuyên viên Văn thư", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: "Soạn thảo, lưu trữ văn bản", thu_tu: 95, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-96", ma_chuc_vu: "TT-DRIVER", ten_chuc_vu: "Tài xế", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5", ten_phong_ban: "Phòng Kho vận", mo_ta: "Vận chuyển hàng hóa", thu_tu: 96, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-97", ma_chuc_vu: "THU-KY", ten_chuc_vu: "Thư ký văn phòng", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-0-2", ten_phong_ban: "Nhóm trợ lý", mo_ta: "Sắp xếp lịch, soạn thảo văn bản", thu_tu: 97, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-98", ma_chuc_vu: "DEV-OPS", ten_chuc_vu: "Chuyên viên DevOps", cap_bac_id: "lvl-4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-2", ten_phong_ban: "Nhóm Hạ tầng IT", mo_ta: "CI/CD, triển khai, giám sát", thu_tu: 98, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-99", ma_chuc_vu: "PP-TC", ten_chuc_vu: "Phó Phòng Tài chính", cap_bac_id: "lvl-2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-3", ten_phong_ban: "Phòng Tài chính - Kế toán", mo_ta: "Hỗ trợ trưởng phòng tài chính", thu_tu: 99, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
];

const repo = createRepository<Position>({
  tableName: 'he_thong_chuc_vu',
  mockData: MOCK_POSITIONS,
  select: POSITION_SELECT_FULL,
  delay: 600,
});

function flattenSupabaseRow(row: Record<string, unknown>): Position {
  const capBac = row.he_thong_cap_bac as { ten_cap_bac?: string } | null | undefined;
  const phongBan = row.he_thong_phong_ban as { ten_phong_ban?: string } | null | undefined;
  const rest = { ...row };
  delete rest.he_thong_cap_bac;
  delete rest.he_thong_phong_ban;
  return {
    ...rest,
    ten_cap_bac: capBac?.ten_cap_bac,
    ten_phong_ban: phongBan?.ten_phong_ban,
  } as Position;
}

async function enrichPosition(raw: Position): Promise<Position> {
  if (isSupabase()) return raw;
  const [levels, depts] = await Promise.all([getJobLevels(), getDepartments()]);
  return {
    ...raw,
    ten_cap_bac: levels.find((l) => l.id === raw.cap_bac_id)?.ten_cap_bac,
    ten_phong_ban: depts.find((d) => d.id === raw.phong_ban_id)?.ten_phong_ban,
  };
}

export const getPositions = async (): Promise<Position[]> => {
  const list = await repo.getAll({ orderBy: 'thu_tu', ascending: true });
  const flattened = isSupabase() ? (list as unknown as Record<string, unknown>[]).map(flattenSupabaseRow) : list;
  return Promise.all(flattened.map(enrichPosition));
};

export const createPosition = async (data: PositionFormValues): Promise<Position> => {
  const now = new Date().toISOString();
  const id = `pos-${Date.now()}`;
  const inserted = await repo.insert(
    {
    id,
    ma_chuc_vu: data.ma_chuc_vu,
    ten_chuc_vu: data.ten_chuc_vu,
    cap_bac_id: data.cap_bac_id ?? null,
    phong_ban_id: data.phong_ban_id ?? null,
    mo_ta: data.mo_ta ?? null,
    thu_tu: data.thu_tu ?? 0,
    trang_thai: data.trang_thai,
    tg_tao: now,
    tg_cap_nhat: now,
  } as Omit<Position, 'id'> & { id: string },
    { returningSelect: POSITION_RETURNING_FULL },
  );
  const flat = isSupabase() ? flattenSupabaseRow(inserted as unknown as Record<string, unknown>) : inserted;
  return enrichPosition(flat);
};

export const updatePosition = async (id: string, data: PositionFormValues): Promise<Position> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('position.service.notFound'));
  const updated = await repo.update(
    id,
    {
    ...data,
    mo_ta: data.mo_ta ?? null,
    thu_tu: data.thu_tu ?? existing.thu_tu,
    trang_thai: data.trang_thai,
    tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: POSITION_RETURNING_FULL },
  );
  const flat = isSupabase() ? flattenSupabaseRow(updated as unknown as Record<string, unknown>) : updated;
  return enrichPosition(flat);
};

export const updatePositionStatus = async (ids: string[], status: TrangThaiHoatDong): Promise<Position | undefined> => {
  let result: Position | undefined;
  const now = new Date().toISOString();
  for (const id of ids) {
    const u = await repo.update(
      id,
      { trang_thai: status, tg_cap_nhat: now },
      { returningSelect: POSITION_RETURNING_STATUS_ONLY },
    );
    if (ids.length === 1) result = u;
  }
  if (result && isSupabase()) result = flattenSupabaseRow(result as unknown as Record<string, unknown>);
  return result ? enrichPosition(result) : undefined;
};

export const deletePositions = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};

/** Import nhiều chức vụ (chỉ thêm mới). Cột gợi ý: ma_chuc_vu, ten_chuc_vu, ma_cap_bac|cap_bac_id, ma_phong_ban|phong_ban_id, mo_ta, thu_tu, trang_thai */
export const importPositions = async (
  rows: Record<string, unknown>[]
): Promise<{ created: number; errors: string[] }> => {
  const levels = await getJobLevels();
  const depts = await getDepartments();
  const errors: string[] = [];
  let created = 0;

  const resolveCapId = (raw: unknown): string | null => {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim();
    const byId = levels.find((l) => l.id === s);
    if (byId) return byId.id;
    const up = s.toUpperCase();
    const byMa = levels.find((l) => l.ma_cap_bac?.toUpperCase() === up);
    return byMa?.id ?? null;
  };

  const resolveDeptId = (raw: unknown): string | null => {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim();
    const byId = depts.find((d) => d.id === s);
    if (byId) return byId.id;
    const up = s.toUpperCase();
    const byMa = depts.find((d) => d.ma_phong_ban?.toUpperCase() === up);
    return byMa?.id ?? null;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ma_chuc_vu = String(row.ma_chuc_vu ?? '').trim().toUpperCase();
    const ten_chuc_vu = String(row.ten_chuc_vu ?? '').trim();
    if (!ma_chuc_vu || !ten_chuc_vu) {
      errors.push(`Dòng ${i + 2}: Thiếu mã hoặc tên chức vụ`);
      continue;
    }

    const capRaw = row.cap_bac_id ?? row.ma_cap_bac;
    const pbRaw = row.phong_ban_id ?? row.ma_phong_ban;
    const cap_bac_id = resolveCapId(capRaw);
    const phong_ban_id = resolveDeptId(pbRaw);
    if (capRaw != null && String(capRaw).trim() !== '' && !cap_bac_id) {
      errors.push(`Dòng ${i + 2}: Không tìm thấy cấp bậc (mã hoặc id)`);
      continue;
    }
    if (pbRaw != null && String(pbRaw).trim() !== '' && !phong_ban_id) {
      errors.push(`Dòng ${i + 2}: Không tìm thấy phòng ban (mã hoặc id)`);
      continue;
    }

    const parsed = positionSchema.safeParse({
      ma_chuc_vu,
      ten_chuc_vu,
      cap_bac_id: cap_bac_id ?? '',
      phong_ban_id: phong_ban_id ?? '',
      mo_ta: row.mo_ta != null ? String(row.mo_ta) : '',
      thu_tu: row.thu_tu != null && String(row.thu_tu).trim() !== '' ? Number(row.thu_tu) : 0,
      trang_thai: parseTrangThaiHoatDongImport(row.trang_thai),
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      errors.push(`Dòng ${i + 2}: ${msg}`);
      continue;
    }

    try {
      await createPosition({
        ...parsed.data,
        cap_bac_id: cap_bac_id ?? null,
        phong_ban_id: phong_ban_id ?? null,
        mo_ta: parsed.data.mo_ta?.trim() || null,
      });
      created++;
    } catch (e: unknown) {
      errors.push(`Dòng ${i + 2}: ${e instanceof Error ? e.message : 'Lỗi'}`);
    }
  }

  return { created, errors };
};