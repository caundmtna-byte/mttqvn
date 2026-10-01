import {
  AN_SINH_PLACEHOLDER_GROUPS,
  flattenPlaceholderModules,
} from './an-sinh-module-config';

/** Đường dẫn module placeholder An sinh xã hội — map thành `<Route>` trong App.tsx. */
export const PLACEHOLDER_MODULE_PATHS = flattenPlaceholderModules(AN_SINH_PLACEHOLDER_GROUPS).map((m) => m.path);
