import {
  AN_SINH_PLACEHOLDER_GROUPS,
  HANH_CHINH_PLACEHOLDER_GROUPS,
  flattenPlaceholderModules,
} from './an-sinh-hanh-chinh-module-config';

/** Đường dẫn module placeholder An sinh xã hội / Hành chính — map thành `<Route>` trong App.tsx. */
export const PLACEHOLDER_MODULE_PATHS = [
  ...flattenPlaceholderModules(AN_SINH_PLACEHOLDER_GROUPS),
  ...flattenPlaceholderModules(HANH_CHINH_PLACEHOLDER_GROUPS),
].map((m) => m.path);
