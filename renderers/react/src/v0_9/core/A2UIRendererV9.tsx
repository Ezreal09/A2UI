/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Suspense, memo, useMemo, useSyncExternalStore, useCallback} from 'react';
import {useA2UIActionsV9} from './A2UIProviderV9';
import {ComponentNodeV9} from './ComponentNodeV9';
import {ThemeContextV9} from './ThemeContextV9';
import type {ThemeV9} from './ThemeContextV9';
import type {SurfaceModel} from '../types';
import type {ReactComponentApi} from '../registry/ReactCatalog';

/** Default loading fallback */
const DefaultLoadingFallback = memo(function DefaultLoadingFallback() {
  return (
    <div className="a2ui-loading" style={{padding: '16px', opacity: 0.5}}>
      Loading...
    </div>
  );
});

export interface A2UIRendererV9Props {
  /** The surface ID to render */
  surfaceId: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * A2UIRendererV9 - renders an A2UI v0.9 surface.
 *
 * Key differences from v0.8 A2UIRenderer:
 * - Uses useSyncExternalStore to subscribe to surface creation/deletion events.
 *   Only re-renders when the surface itself is created or deleted.
 * - Individual component data changes are handled by Preact Signals inside
 *   each component, so this component does NOT re-render on data changes.
 *
 * @example
 * ```tsx
 * <A2UIProviderV9 catalogs={[catalog]} onAction={handleAction}>
 *   <A2UIRendererV9 surfaceId="main" />
 * </A2UIProviderV9>
 * ```
 */
export const A2UIRendererV9 = memo(function A2UIRendererV9({
  surfaceId,
  className,
}: A2UIRendererV9Props) {
  const actions = useA2UIActionsV9();

  // Subscribe to surface creation/deletion events via useSyncExternalStore.
  // This only re-renders when a surface is added or removed, NOT on data changes.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return actions.onSurfaceChange(onStoreChange);
    },
    [actions]
  );

  const getSnapshot = useCallback(() => actions.getSurface(surfaceId), [actions, surfaceId]);

  const surface = useSyncExternalStore(subscribe, getSnapshot) as
    | SurfaceModel<ReactComponentApi>
    | undefined;

  // Build inline CSS variables from theme.primaryColor so child components
  // can consume --a2ui-primary-color without importing theme directly.
  // Must be called unconditionally before any early returns (Rules of Hooks).
  const theme: ThemeV9 = (surface?.theme ?? {}) as ThemeV9;
  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {};
    if (theme.primaryColor) {
      vars['--a2ui-primary-color'] = theme.primaryColor;
    }
    return vars;
  }, [theme.primaryColor]);

  if (!surface) {
    return null;
  }

  // Per v0.9 spec: there must be exactly one component with id="root" acting
  // as the root of the component tree.
  const rootComponentId = surface.componentsModel.get('root') ? 'root' : undefined;

  if (!rootComponentId) {
    return null;
  }

  return (
    <ThemeContextV9.Provider value={theme}>
      <div
        className={className ? `a2ui-surface ${className}` : 'a2ui-surface'}
        data-surface-id={surfaceId}
        style={cssVars as React.CSSProperties}
      >
        <Suspense fallback={<DefaultLoadingFallback />}>
          <ComponentNodeV9 componentId={rootComponentId} surface={surface} />
        </Suspense>
      </div>
    </ThemeContextV9.Provider>
  );
});

export default A2UIRendererV9;
