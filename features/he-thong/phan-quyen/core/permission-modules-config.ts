/**
 * Cấu hình module phân quyền — chỉ các trang Hệ thống còn trong app.
 */

export interface PermissionModuleItem {
  id: string;
  nameKey: string;
}

export interface PermissionModuleGroup {
  groupTitleKey: string;
  modules: PermissionModuleItem[];
}

export interface PermissionFunction {
  id: string;
  nameKey: string;
  color: string;
  groups: PermissionModuleGroup[];
}

export const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete', 'admin', 'all'] as const;
export type PermissionActionType = (typeof PERMISSION_ACTIONS)[number];

/** Nhóm chức năng + module route — khớp dashboard / ma trận phân quyền */
export const PERMISSION_FUNCTIONS: PermissionFunction[] = [
  {
    id: 'he-thong',
    nameKey: 'nav.system',
    color: 'slate',
    groups: [
      {
        groupTitleKey: 'permission.matrix.systemGroup',
        modules: [
          { id: 'he-thong/nhan-vien', nameKey: 'permission.module.employeeList' },
          { id: 'he-thong/phong-ban', nameKey: 'permission.module.departmentChart' },
          { id: 'he-thong/chuc-vu', nameKey: 'permission.module.positionRole' },
          { id: 'he-thong/thong-tin-to-chuc', nameKey: 'permission.module.companyInfo' },
          { id: 'he-thong/phan-quyen', nameKey: 'permission.module.permission' },
        ],
      },
    ],
  },
  {
    id: 'quan-ly-viet-bai',
    nameKey: 'nav.quanLyVietBai',
    color: 'violet',
    groups: [
      {
        groupTitleKey: 'permission.matrix.articleMgmtGroup',
        modules: [
          { id: 'quan-ly-viet-bai/bai-viet', nameKey: 'permission.module.articleList' },
          { id: 'quan-ly-viet-bai/thiet-lap-bai-viet', nameKey: 'permission.module.articleSettings' },
        ],
      },
    ],
  },
];

export function getAllPermissionModules(): { id: string; nameKey: string }[] {
  const list: { id: string; nameKey: string }[] = [];
  PERMISSION_FUNCTIONS.forEach((fn) => {
    fn.groups.forEach((gr) => {
      gr.modules.forEach((m) => list.push({ id: m.id, nameKey: m.nameKey }));
    });
  });
  return list;
}
