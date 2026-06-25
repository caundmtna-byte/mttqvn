import React from 'react';
import { Route } from 'react-router-dom';
import {
  AN_SINH_PLACEHOLDER_GROUPS,
  HANH_CHINH_PLACEHOLDER_GROUPS,
  flattenPlaceholderModules,
} from './an-sinh-hanh-chinh-module-config';

const PLACEHOLDER_PATHS = [
  ...flattenPlaceholderModules(AN_SINH_PLACEHOLDER_GROUPS),
  ...flattenPlaceholderModules(HANH_CHINH_PLACEHOLDER_GROUPS),
].map((m) => m.path);

interface PlaceholderModuleRoutesProps {
  element: React.ReactElement;
}

/** Route placeholder cho các module An sinh xã hội / Hành chính chưa xây. */
export function PlaceholderModuleRoutes({ element }: PlaceholderModuleRoutesProps) {
  return (
    <>
      {PLACEHOLDER_PATHS.map((path) => (
        <Route key={path} path={path} element={element} />
      ))}
    </>
  );
}

export { PLACEHOLDER_PATHS };
