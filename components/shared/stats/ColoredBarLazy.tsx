import React, { Suspense, lazy } from 'react';
import type { ColoredBarProps } from './ColoredBar';

const ColoredBarImpl = lazy(() => import('./ColoredBar'));

/** Lazy wrapper — tránh kéo `recharts` vào entry chunk khi chỉ import barrel stats. */
const ColoredBarLazy: React.FC<ColoredBarProps> = (props) => (
  <Suspense fallback={null}>
    <ColoredBarImpl {...props} />
  </Suspense>
);

export default ColoredBarLazy;
